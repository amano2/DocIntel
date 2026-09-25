"""
Configuration module for the DocIntel pipeline.
Centralizes all tunables: model IDs, confidence thresholds, document types,
anomaly rules, and pipeline settings so nothing is hardcoded elsewhere.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Environment Variables ────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# ── Confidence Thresholds ────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD_HIGH = 0.90
CONFIDENCE_THRESHOLD_MEDIUM = 0.70
CONFIDENCE_THRESHOLD_LOW = 0.50   # Below this, field is quarantined for manual review

# ── Document Types ───────────────────────────────────────────────────────────
DOC_TYPE_INVOICE = "invoice"
DOC_TYPE_CONTRACT = "contract"
DOC_TYPE_COMPLIANCE = "compliance_doc"
DOC_TYPE_PO = "purchase_order"
DOC_TYPE_TAX_FORM = "tax_form"
DOC_TYPE_OTHER = "other"

SUPPORTED_DOC_TYPES = [
    DOC_TYPE_INVOICE,
    DOC_TYPE_CONTRACT,
    DOC_TYPE_COMPLIANCE,
    DOC_TYPE_PO,
    DOC_TYPE_TAX_FORM,
    DOC_TYPE_OTHER
]

# ── Pipeline Settings ────────────────────────────────────────────────────────
MIN_CHAR_COUNT_FOR_TEXT_LAYER = 50  # If pypdf extracts fewer chars, fallback to vision
MAX_VISION_PAGES = 5               # Max pages to send to vision model (token budget)
CHUNK_SIZE = 400                   # Words per chunk for FAISS indexing
CHUNK_OVERLAP = 80                 # Overlap words between adjacent chunks

# ── LLM Models (OpenRouter) ─────────────────────────────────────────────────
VISION_MODEL = "google/gemini-2.5-flash"        # Vision-capable, handles scanned docs
TEXT_MODEL = "inclusionai/ling-3.0-flash-fin:free"   # Financial/text model for extraction/classification

# ── Anomaly Detection Settings ───────────────────────────────────────────────
ANOMALY_MATH_TOLERANCE = 0.05           # $ tolerance for math mismatch checks
HIGH_VALUE_PO_THRESHOLD = 50_000        # PO amounts above this are flagged
DUPLICATE_INVOICE_LOOKBACK_DAYS = 365   # How far back to search for duplicate invoice numbers

# ── Logging ──────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "json"  # "json" for structured logging, "text" for human-readable
