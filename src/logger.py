"""
Structured logging module for the DocIntel pipeline.
Every log entry is a JSON object with a trace_id for request-level correlation.
Replaces all print() calls across the codebase.
"""

import logging
import json
import uuid
import time
from typing import Optional, Dict, Any
from contextvars import ContextVar
from src.config import LOG_LEVEL

# ── Context variable for per-request trace ID ────────────────────────────────
_trace_id: ContextVar[str] = ContextVar("trace_id", default="no-trace")


def set_trace_id(trace_id: Optional[str] = None) -> str:
    """Set a trace ID for the current async context. Returns the ID."""
    tid = trace_id or str(uuid.uuid4())[:12]
    _trace_id.set(tid)
    return tid


def get_trace_id() -> str:
    return _trace_id.get()


class JsonFormatter(logging.Formatter):
    """Emits each log record as a single-line JSON object."""

    def format(self, record: logging.LogRecord) -> str:
        entry: Dict[str, Any] = {
            "ts": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "trace_id": get_trace_id(),
            "msg": record.getMessage(),
        }
        # Merge any extra structured fields
        if hasattr(record, "data") and isinstance(record.data, dict):
            entry["data"] = record.data
        if record.exc_info and record.exc_info[0]:
            entry["error"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


def get_logger(name: str) -> logging.Logger:
    """Returns a module-level logger with JSON formatting."""
    logger = logging.getLogger(f"docintel.{name}")
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(getattr(logging, LOG_LEVEL.upper(), logging.INFO))
        logger.propagate = False
    return logger


class PipelineTimer:
    """Context manager to time pipeline stages and log them."""

    def __init__(self, logger: logging.Logger, stage: str, doc_id: str):
        self.logger = logger
        self.stage = stage
        self.doc_id = doc_id
        self.start: float = 0

    def __enter__(self):
        self.start = time.perf_counter()
        self.logger.info(
            f"Stage started: {self.stage}",
            extra={"data": {"doc_id": self.doc_id, "stage": self.stage}},
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = round((time.perf_counter() - self.start) * 1000, 1)
        if exc_type:
            self.logger.error(
                f"Stage FAILED: {self.stage} ({duration_ms}ms)",
                extra={
                    "data": {
                        "doc_id": self.doc_id,
                        "stage": self.stage,
                        "duration_ms": duration_ms,
                        "error": str(exc_val),
                    }
                },
            )
        else:
            self.logger.info(
                f"Stage completed: {self.stage} ({duration_ms}ms)",
                extra={
                    "data": {
                        "doc_id": self.doc_id,
                        "stage": self.stage,
                        "duration_ms": duration_ms,
                    }
                },
            )
        return False  # Don't suppress exceptions
