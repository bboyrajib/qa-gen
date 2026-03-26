import pytest
from app.agents.failure_rca.fingerprint import (
    compute_fingerprint,
    normalize_stack_trace,
    extract_top_frame,
    extract_exception_class,
)


STACK_TRACE = """
java.lang.NullPointerException: Cannot invoke method
    at com.tdbank.payments.service.TransferService.validateAmount(TransferService.java:142)
    at com.tdbank.payments.controller.TransferController.processTransfer(TransferController.java:89)
    at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
"""


def test_normalize_stack_trace():
    normalized = normalize_stack_trace(STACK_TRACE)
    assert "com.tdbank" not in normalized
    assert "TransferService" in normalized or "validateAmount" in normalized


def test_extract_top_frame():
    normalized = normalize_stack_trace(STACK_TRACE)
    frame = extract_top_frame(normalized)
    assert frame != ""
    assert len(frame) < 300


def test_compute_fingerprint_deterministic():
    fp1 = compute_fingerprint(STACK_TRACE, "NullPointerException", "payments-service")
    fp2 = compute_fingerprint(STACK_TRACE, "NullPointerException", "payments-service")
    assert fp1 == fp2
    assert len(fp1) == 64  # SHA-256 hex


def test_compute_fingerprint_differs_by_service():
    fp1 = compute_fingerprint(STACK_TRACE, "NullPointerException", "payments-service")
    fp2 = compute_fingerprint(STACK_TRACE, "NullPointerException", "accounts-service")
    assert fp1 != fp2


def test_compute_fingerprint_differs_by_exception():
    fp1 = compute_fingerprint(STACK_TRACE, "NullPointerException", "payments-service")
    fp2 = compute_fingerprint(STACK_TRACE, "IllegalArgumentException", "payments-service")
    assert fp1 != fp2


def test_extract_exception_class():
    exc = extract_exception_class("ERROR NullPointerException: null value at line 42")
    assert exc == "NullPointerException"


def test_extract_exception_class_error_suffix():
    exc = extract_exception_class("Caused by: ConnectionError: timeout")
    assert exc == "ConnectionError"


def test_extract_exception_class_unknown():
    exc = extract_exception_class("generic log message with no exception")
    assert exc == "UnknownException"
