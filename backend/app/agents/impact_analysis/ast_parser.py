import ast
import re
from typing import List


def extract_functions_python(source: str) -> List[dict]:
    """Extract function/method names and their line ranges from Python source."""
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []
    functions = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            functions.append({
                "name": node.name,
                "start_line": node.lineno,
                "end_line": getattr(node, "end_lineno", node.lineno),
            })
    return functions


def extract_functions_generic(source: str, extension: str) -> List[dict]:
    """Regex-based function boundary extractor for Java/TypeScript."""
    patterns = {
        ".java": r"(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+)?\s*\{",
        ".ts": r"(?:async\s+)?(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:async\s+)?\([^)]*\)\s*=>|\b(\w+)\s*\([^)]*\)\s*\{)",
        ".js": r"(?:async\s+)?(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:async\s+)?\([^)]*\)\s*=>|\b(\w+)\s*\([^)]*\)\s*\{)",
    }
    pattern = patterns.get(extension, r"(?:function\s+(\w+))")
    functions = []
    lines = source.splitlines()
    for i, line in enumerate(lines, 1):
        match = re.search(pattern, line)
        if match:
            name = next((g for g in match.groups() if g), "unknown")
            functions.append({"name": name, "start_line": i, "end_line": i + 20})
    return functions


def get_changed_functions(file_path: str, source: str, changed_lines: List[int]) -> List[str]:
    if file_path.endswith(".py"):
        functions = extract_functions_python(source)
    else:
        ext = "." + file_path.rsplit(".", 1)[-1] if "." in file_path else ""
        functions = extract_functions_generic(source, ext)

    changed_funcs = []
    for fn in functions:
        if any(fn["start_line"] <= line <= fn["end_line"] for line in changed_lines):
            changed_funcs.append(fn["name"])
    return changed_funcs
