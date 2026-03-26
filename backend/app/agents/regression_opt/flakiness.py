import statistics
from typing import List


def compute_flakiness(test_runs: List[dict]) -> dict:
    """
    test_runs: [{"test_id": ..., "results": ["PASS", "FAIL", ...]}]
    Returns {test_id: {"pass_rate": float, "flakiness_score": float, "is_flaky": bool}}
    """
    scores = {}
    for test in test_runs:
        test_id = test["test_id"]
        results = test.get("results", [])
        if not results:
            continue
        total = len(results)
        passes = results.count("PASS")
        pass_rate = passes / total

        # Group by day and compute daily pass rates
        daily = test.get("daily_results", {})
        if daily:
            daily_rates = [v.count("PASS") / len(v) for v in daily.values() if v]
            std = statistics.stdev(daily_rates) if len(daily_rates) > 1 else 0
        else:
            std = 0

        flakiness_score = (1 - pass_rate) * 0.6 + std * 0.4
        scores[test_id] = {
            "pass_rate": pass_rate,
            "flakiness_score": flakiness_score,
            "is_flaky": flakiness_score > 0.35,
        }
    return scores
