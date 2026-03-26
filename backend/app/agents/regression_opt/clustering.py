import math
from typing import List, Tuple


def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def build_coverage_vectors(tests: List[dict], all_files: List[str]) -> dict:
    """Build binary coverage vector per test."""
    vectors = {}
    for test in tests:
        covered = set(test.get("covered_files", []))
        vectors[test["test_id"]] = [1.0 if f in covered else 0.0 for f in all_files]
    return vectors


def find_redundancy_clusters(vectors: dict, threshold: float = 0.90) -> List[List[str]]:
    test_ids = list(vectors.keys())
    clusters = []
    visited = set()

    for i, tid_a in enumerate(test_ids):
        if tid_a in visited:
            continue
        cluster = [tid_a]
        visited.add(tid_a)
        for tid_b in test_ids[i + 1:]:
            if tid_b in visited:
                continue
            sim = cosine_similarity(vectors[tid_a], vectors[tid_b])
            if sim >= threshold:
                cluster.append(tid_b)
                visited.add(tid_b)
        if len(cluster) > 1:
            clusters.append(cluster)

    return clusters


def select_cluster_representative(cluster: List[str], tests_meta: dict) -> str:
    """Pick test with most defect links and lowest flakiness."""
    def score(tid):
        meta = tests_meta.get(tid, {})
        return meta.get("defect_links", 0) * 10 - meta.get("flakiness_score", 0) * 5
    return max(cluster, key=score)
