import hashlib
import re


def normalize_stack_trace(raw: str) -> str:
    """Strip package paths, keep class.method format."""
    lines = raw.splitlines()
    normalized = []
    for line in lines:
        # Remove leading 'at ' and package path prefix
        line = re.sub(r"^\s*at\s+", "", line)
        # Strip file locations like (file.js:123:45)
        line = re.sub(r"\(.*?\)", "", line)
        # Reduce com.example.pkg.ClassName to ClassName
        line = re.sub(r"([a-z][a-z0-9]*\.)+([A-Z])", r"\2", line)
        normalized.append(line.strip())
    return "\n".join(normalized)


def extract_top_frame(stack_trace: str) -> str:
    for line in stack_trace.splitlines():
        if line.strip():
            return line.strip()
    return stack_trace[:200]


def extract_exception_class(log_text: str) -> str:
    match = re.search(r"([A-Z][a-zA-Z]+Exception|[A-Z][a-zA-Z]+Error)", log_text)
    return match.group(1) if match else "UnknownException"


def compute_fingerprint(stack_trace: str, exception_class: str, service_tag: str) -> str:
    normalized = normalize_stack_trace(stack_trace)
    top_frame = extract_top_frame(normalized)
    raw = f"{top_frame}|{exception_class}|{service_tag}"
    return hashlib.sha256(raw.encode()).hexdigest()
