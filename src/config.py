"""
Configuration module for Multimodal Document Intelligence Agent.
Centralizes paths, OpenRouter model definitions, confidence thresholds, and anomaly parameters.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if available
load_dotenv()

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SAMPLE_DOCS_DIR = DATA_DIR / "sample_docs"
DB_DIR = BASE_DIR / "db"
DB_PATH = DB_DIR / "documents.db"
EVAL_DIR = BASE_DIR / "eval"
EVAL_DOCS_DIR = EVAL_DIR / "test_documents"
VECTOR_STORE_DIR = BASE_DIR / "vector_store"

# Ensure essential runtime directories exist
for directory in [DATA_DIR, SAMPLE_DOCS_DIR, DB_DIR, EVAL_DIR, EVAL_DOCS_DIR, VECTOR_STORE_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# OpenRouter API Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")

# Embedding Model (SentenceTransformers, runs 100% locally at zero cost)
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# Confidence thresholds
CONFIDENCE_THRESHOLD_HIGH = 0.85
CONFIDENCE_THRESHOLD_MEDIUM = 0.70

# Multimodal Ingestion Settings
MIN_CHAR_COUNT_FOR_TEXT_LAYER = 50

# Supported Document Types
SUPPORTED_DOC_TYPES = [
    "invoice",
    "contract",
    "compliance_doc",
    "other"
]

# Business estimation defaults (for ROI/dashboard metrics)
ESTIMATED_MANUAL_REVIEW_MINUTES_PER_DOC = 15.0  # Average minutes a human reviewer takes
ESTIMATED_HOURLY_REVIEWER_RATE_USD = 45.0       # Average hourly rate for accounting/legal ops analyst
