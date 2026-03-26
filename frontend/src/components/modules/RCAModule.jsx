import { useState, useEffect } from 'react'
import { useJobStore, useChatStore, useAppStore } from '@/store'
import { useJobSimulator } from '@/hooks/useJobs'
import StepProgress from '@/components/shared/StepProgress'
import FeedbackWidget from '@/components/shared/FeedbackWidget'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DEMO_RCA_RESULT } from '@/lib/demo-data'
import * as Tabs from '@radix-ui/react-tabs'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Loader2, Bug, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useLocation } from 'react-router-dom'

const STEPS = ['Receiving', 'Fetching Logs (Datadog)', 'Fetching Logs (Splunk)', 'Fetching JTMF', 'Fingerprinting', 'RAG Lookup', 'Analysing', 'Ready']

const CLASSIFICATION_COLORS = {
  CODE_DEFECT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  INFRA_FAILURE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  DATA_ISSUE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  ENV_CONFIG: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  FLAKY_TEST: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
}

const LEVEL_COLORS = {
  ERROR: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const PRIORITY_COLORS = {
  P1: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  P2: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  P3: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function RCAModule() {
  const [runId, setRunId] = useState('')
  const [service, setService] = useState('')
  const [timeWindow, setTimeWindow] = useState('')
  const [currentJobId, setCurrentJobId] = useState(null)
  const location = useLocation()
  const [jobDone, setJobDone] = useState(!!location.state?.autoShow)
  const [expandedLog, setExpandedLog] = useState(null)

  const { isDark } = useAppStore()
  const { jobs } = useJobStore()
  const { simulate } = useJobSimulator()
  const { setLastJobType } = useChatStore()
  const jobData = currentJobId ? jobs[currentJobId] : null
  const isRunning = jobData && !jobData.complete && !jobData.failed

  const handleAnalyse = () => {
    if (!runId) { toast.error('Please enter a Pipeline Run ID'); return }
    setJobDone(false)
    const jobId = simulate(STEPS, {
      type: 'rca',
      delay: 700,
      onComplete: () => { setJobDone(true); setLastJobType('rca'); toast.success('RCA analysis complete!') },
    })
    setCurrentJobId(jobId)
  }

  const handleRerun = () => {
    setJobDone(false)
    setCurrentJobId(null)
    const jobId = simulate(STEPS, {
      type: 'rca',
      delay: 700,
      onComplete: () => { setJobDone(true); setLastJobType('rca'); toast.success('Re-run complete!') },
    })
    setCurrentJobId(jobId)
  }

  useEffect(() => {
    if (location.state?.rerun && demoMode) {
      window.history.replaceState({}, document.title)
      toast.info('Re-running job with demo parameters...')
      setTimeout(() => handleRerun(), 400)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const r = DEMO_RCA_RESULT
  const confidenceColor = r.confidence >= 80 ? 'bg-td-green' : r.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="space-y-4 animate-fade-in" data-testid="rca-module">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Failure RCA</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Automated root cause analysis for CI/CD pipeline failures</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full font-medium">
          Auto-triggered by CI/CD
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl px-4 py-2 overflow-x-auto">
        <StepProgress steps={STEPS} jobData={jobData} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* INPUT */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Manual Trigger</h2>
          <div className="p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">This module also runs automatically when CI/CD failures are detected. Manual trigger is available for ad-hoc analysis.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Pipeline Run ID *</label>
            <input
              data-testid="rca-run-id"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="PRN-2025-01-28-14392"
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Service Tag</label>
            <select
              data-testid="rca-service-select"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              <option value="">Select service...</option>
              {['payment-processor-service', 'account-service', 'transfer-service', 'notification-service', 'auth-service'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Time Window (optional)</label>
            <input
              data-testid="rca-time-window"
              type="datetime-local"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
            />
          </div>

          <button
            data-testid="rca-analyse-btn"
            onClick={handleAnalyse}
            disabled={isRunning || !runId}
            className="w-full py-2.5 bg-td-green text-white text-sm font-semibold rounded-lg hover:bg-td-dark-green transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing...</> : 'Analyse Failure'}
          </button>
        </div>

        {/* OUTPUT */}
        <div className="space-y-4">
          {!jobDone ? (
            <div className="bg-card border border-border rounded-xl p-5 min-h-[300px] flex flex-col items-center justify-center text-center">
              {isRunning ? (
                <div className="space-y-2"><Loader2 className="w-8 h-8 text-td-green animate-spin mx-auto" /><p className="text-sm text-muted-foreground">Analysing failure...</p></div>
              ) : (
                <><Bug className="w-10 h-10 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">Enter a Pipeline Run ID to analyse</p></>
              )}
            </div>
          ) : (
            <>
              {/* Classification + Confidence */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold px-4 py-2 rounded-lg border ${CLASSIFICATION_COLORS[r.classification]}`}>
                      {r.classification.replace('_', ' ')}
                    </span>
                    {r.jira_created && (
                    <a
                      href="#"
                      data-testid="rca-jira-link"
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-td-green/10 text-td-green border border-td-green/30 rounded-lg hover:bg-td-green/20 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Defect created: {r.jira_created}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  </div>
                  <button
                    data-testid="rca-rerun-btn"
                    onClick={handleRerun}
                    className="text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-td-green hover:border-td-green/50 hover:bg-td-green/5 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Re-run
                  </button>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Confidence</span>
                    <span className={`text-sm font-bold ${r.confidence >= 80 ? 'text-td-green' : r.confidence >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {r.confidence}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-500 ${confidenceColor}`} style={{ width: `${r.confidence}%` }} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Root Cause</p>
                  <p className="text-sm text-foreground leading-relaxed">{r.root_cause}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fix Actions</p>
                  <ol className="space-y-2">
                    {r.fix_actions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${PRIORITY_COLORS[a.priority]}`}>{a.priority}</span>
                        <p className="text-xs text-foreground">{a.action}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Evidence Tabs */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Tabs.Root defaultValue="logs">
                  <Tabs.List className="flex border-b border-border bg-muted/30">
                    {[{ value: 'logs', label: 'Logs' }, { value: 'metrics', label: 'Metrics' }, { value: 'jtmf', label: 'JTMF' }].map((t) => (
                      <Tabs.Trigger
                        key={t.value}
                        value={t.value}
                        data-testid={`rca-evidence-tab-${t.value}`}
                        className="px-4 py-2.5 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-td-green data-[state=active]:text-td-green text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {t.label}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>

                  <Tabs.Content value="logs" className="p-3 space-y-2 max-h-48 overflow-y-auto">
                    {r.log_events.map((log, i) => (
                      <div key={i} className="border border-border rounded-lg overflow-hidden">
                        <button
                          data-testid={`rca-log-event-${i}`}
                          onClick={() => setExpandedLog(expandedLog === i ? null : i)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                        >
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${LEVEL_COLORS[log.level]}`}>{log.level}</span>
                          <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{log.timestamp.split('T')[1].slice(0, 8)}</span>
                          <span className="text-xs text-foreground truncate">{log.message}</span>
                          {log.trace && (expandedLog === i ? <ChevronUp className="w-3 h-3 ml-auto flex-shrink-0" /> : <ChevronDown className="w-3 h-3 ml-auto flex-shrink-0" />)}
                        </button>
                        {expandedLog === i && log.trace && (
                          <pre className="px-3 py-2 text-[10px] bg-muted/50 text-muted-foreground font-mono border-t border-border overflow-x-auto">{log.trace}</pre>
                        )}
                      </div>
                    ))}
                  </Tabs.Content>

                  <Tabs.Content value="metrics" className="p-3">
                    <p className="text-xs text-muted-foreground mb-2">Error rate over time window</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={r.metrics_data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }} />
                        <Line type="monotone" dataKey="error_rate" stroke="#007A33" strokeWidth={2} dot={{ fill: '#007A33', r: 3 }} name="Error Rate %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Tabs.Content>

                  <Tabs.Content value="jtmf" className="p-3">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border"><th className="text-left py-1.5 text-muted-foreground font-semibold">Test Name</th><th className="text-left py-1.5 text-muted-foreground font-semibold">Failure</th><th className="text-left py-1.5 text-muted-foreground font-semibold">Suite</th></tr></thead>
                      <tbody>
                        {r.failed_tests.map((t, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="py-1.5 text-foreground font-mono text-[10px]">{t.name}</td>
                            <td className="py-1.5 text-red-600 dark:text-red-400">{t.failure}</td>
                            <td className="py-1.5 text-muted-foreground">{t.suite}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Tabs.Content>
                </Tabs.Root>
              </div>

              <FeedbackWidget jobId={currentJobId} moduleType="rca" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
