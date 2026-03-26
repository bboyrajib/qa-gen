import asyncio
import re
import statistics
from datetime import datetime, timedelta
from typing import AsyncGenerator
from app.agents.base import BaseAgent
from app.agents.failure_rca.fingerprint import compute_fingerprint, extract_exception_class, normalize_stack_trace
from app.agents.failure_rca.llm import analyse_failure
from app.connectors.datadog import DatadogConnector
from app.connectors.splunk import SplunkConnector
from app.connectors.jtmf import JTMFConnector
from app.connectors.jira import JiraConnector
from app.rag.pipeline import search
from app.services.job_runner import save_job_result, update_job_status
from app.core.db import SessionLocal
from app.models.rca import QgRcaFingerprint
import uuid


class FailureRCAAgent(BaseAgent):
    async def run(self, input_data: dict) -> AsyncGenerator[dict, None]:
        job_id = self.job_id
        try:
            pipeline_run_id = input_data["pipeline_run_id"]
            failed_test_ids = input_data.get("failed_test_ids", [])
            service_tag = input_data["service_tag"]
            failure_ts = input_data["failure_timestamp"]
            project_id = input_data.get("project_id")

            ts = datetime.fromisoformat(failure_ts.replace("Z", "+00:00"))
            start_ts = (ts - timedelta(minutes=5)).isoformat()
            end_ts = (ts + timedelta(minutes=5)).isoformat()

            await self.emit("FETCHING_LOGS", "running", "Fetching logs from Datadog, Splunk, JTMF in parallel...")
            dd = DatadogConnector()
            splunk = SplunkConnector()
            jtmf = JTMFConnector()

            results = await asyncio.gather(
                dd.get_logs(service_tag, start_ts, end_ts),
                dd.get_metrics("error_rate", service_tag, start_ts, end_ts),
                splunk.search_events(service_tag, start_ts, end_ts),
                jtmf.get_test_run_results(pipeline_run_id),
                return_exceptions=True,
            )
            dd_logs = results[0] if not isinstance(results[0], Exception) else {}
            dd_metrics = results[1] if not isinstance(results[1], Exception) else {}
            splunk_events = results[2] if not isinstance(results[2], Exception) else {}
            jtmf_record = results[3] if not isinstance(results[3], Exception) else {}
            await self.emit("FETCHING_LOGS", "complete", "Log fetch complete")

            await self.emit("PRE_PROCESSING", "running", "Extracting and normalising stack traces...")
            log_events = _extract_log_events(dd_logs, splunk_events)
            stack_traces = _extract_stack_traces(log_events)
            exception_class = extract_exception_class(" ".join(log_events[:5]))
            anomaly_summary = _detect_anomalies(dd_metrics)
            await self.emit("PRE_PROCESSING", "complete", f"Extracted {len(stack_traces)} stack traces, exception: {exception_class}")

            await self.emit("FINGERPRINTING", "running", "Computing failure fingerprint...")
            combined_stack = "\n".join(stack_traces[:3])
            fingerprint_hash = compute_fingerprint(combined_stack, exception_class, service_tag)
            prior_fingerprints = _query_prior_fingerprints(fingerprint_hash)
            await self.emit("FINGERPRINTING", "complete", f"Fingerprint: {fingerprint_hash[:16]}...")

            await self.emit("RAG_ENRICHMENT", "running", "Searching knowledge base for runbooks...")
            rag_chunks = await search(f"{exception_class} {service_tag} root cause", top=3)
            rag_context = "\n\n".join(c["content"] for c in rag_chunks)
            await self.emit("RAG_ENRICHMENT", "complete", f"Found {len(rag_chunks)} runbook entries")

            await self.emit("ANALYSING", "running", "Analysing with GPT-4o...")
            analysis = await analyse_failure(log_events, anomaly_summary, jtmf_record, rag_context, prior_fingerprints)
            await self.emit("ANALYSING", "complete", f"Classification: {analysis.get('classification')} ({analysis.get('confidence')}% confidence)")

            await self.emit("POST_PROCESSING", "running", "Upserting fingerprint and auto-creating Jira ticket if needed...")
            _upsert_fingerprint(fingerprint_hash, exception_class, service_tag, analysis, project_id)

            jira_ticket = None
            if analysis.get("confidence", 0) >= 80:
                try:
                    jira = JiraConnector()
                    jql = f'summary~"{exception_class}" AND status!=Done'
                    existing = await jira.search_issues(jql)
                    if not existing.get("issues"):
                        project_key = _get_project_jira_key(project_id)
                        if project_key:
                            ticket = await jira.create_defect(
                                project_key,
                                f"Auto-RCA: {exception_class} in {service_tag}",
                                analysis.get("jira_description", ""),
                            )
                            jira_ticket = ticket.get("key")
                except Exception:
                    pass
            await self.emit("POST_PROCESSING", "complete", f"Jira ticket: {jira_ticket or 'not created'}")

            result = {**analysis, "fingerprint": fingerprint_hash, "jira_ticket": jira_ticket}
            save_job_result(job_id, result)
            await self.emit_done()

        except Exception as e:
            update_job_status(job_id, "FAILED", error=str(e))
            await self.emit("ERROR", "error", str(e))
            await self.emit_done()


def _extract_log_events(dd_logs: dict, splunk_events: dict) -> list:
    events = []
    for e in (dd_logs.get("data") or []):
        events.append(e.get("attributes", {}).get("message", str(e)))
    for e in (splunk_events.get("results") or []):
        events.append(e.get("_raw", str(e)))
    return events[:100]


def _extract_stack_traces(log_events: list) -> list:
    traces = []
    for event in log_events:
        if "Exception" in event or "Error" in event or "at " in event:
            traces.append(event)
    return traces


def _detect_anomalies(metrics: dict) -> str:
    try:
        series = metrics.get("series", [{}])[0]
        points = [p[1] for p in series.get("pointlist", []) if p[1] is not None]
        if not points:
            return "No metrics data"
        mean = sum(points) / len(points)
        std = statistics.stdev(points) if len(points) > 1 else 0
        anomalies = [p for p in points if p > mean + 2 * std]
        return f"Mean: {mean:.2f}, StdDev: {std:.2f}, Anomalies: {len(anomalies)} spikes"
    except Exception:
        return "Anomaly detection unavailable"


def _query_prior_fingerprints(fingerprint_hash: str) -> list:
    db = SessionLocal()
    try:
        fp = db.query(QgRcaFingerprint).filter(QgRcaFingerprint.fingerprint_hash == fingerprint_hash).first()
        if fp:
            return [{"classification": fp.classification, "confidence": fp.confidence, "occurrences": fp.occurrence_count}]
        return []
    finally:
        db.close()


def _upsert_fingerprint(fingerprint_hash: str, exception_class: str, service_tag: str, analysis: dict, project_id: str):
    db = SessionLocal()
    try:
        fp = db.query(QgRcaFingerprint).filter(QgRcaFingerprint.fingerprint_hash == fingerprint_hash).first()
        if fp:
            fp.occurrence_count += 1
            fp.classification = analysis.get("classification")
            fp.confidence = analysis.get("confidence", 0)
            fp.last_seen = datetime.utcnow()
        else:
            fp = QgRcaFingerprint(
                id=uuid.uuid4(),
                fingerprint_hash=fingerprint_hash,
                exception_class=exception_class,
                service_tag=service_tag,
                classification=analysis.get("classification"),
                confidence=analysis.get("confidence", 0),
                project_id=project_id,
            )
            db.add(fp)
        db.commit()
    finally:
        db.close()


def _get_project_jira_key(project_id: str) -> str:
    from app.models.project import QgProject
    db = SessionLocal()
    try:
        p = db.query(QgProject).filter(QgProject.id == project_id).first()
        return p.jira_project_key if p else None
    finally:
        db.close()
