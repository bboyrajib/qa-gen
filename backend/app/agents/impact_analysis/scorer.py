from typing import List


def score_tests(coverage_map: dict, changed_file_paths: List[str]) -> List[dict]:
    """
    coverage_map: {file_path: [test_id, ...]}
    Returns scored tests sorted by score descending.
    """
    scores = {}
    for file_path in changed_file_paths:
        direct_tests = coverage_map.get(file_path, [])
        for test_id in direct_tests:
            scores[test_id] = scores.get(test_id, 0) + 100

    # indirect: same module
    for file_path in changed_file_paths:
        module = file_path.rsplit("/", 1)[0] if "/" in file_path else file_path.rsplit("\\", 1)[0]
        for cov_path, test_ids in coverage_map.items():
            if cov_path.startswith(module) and cov_path not in changed_file_paths:
                for test_id in test_ids:
                    if test_id not in scores:
                        scores[test_id] = 25

    result = [
        {"test_id": tid, "score": score, "reason": "direct" if score >= 100 else "indirect"}
        for tid, score in scores.items()
        if score >= 20
    ]
    return sorted(result, key=lambda x: x["score"], reverse=True)
