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
MODELS_DIR = BASE_DIR / "models"
FINE_TUNED_MODEL_DIR = MODELS_DIR / "fine_tuned_embeddings"
CLASSIFIER_PATH = MODELS_DIR / "document_classifier.joblib"

# Ensure essential runtime directories exist
for directory in [DATA_DIR, SAMPLE_DOCS_DIR, DB_DIR, EVAL_DIR, EVAL_DOCS_DIR, VECTOR_STORE_DIR, MODELS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# OpenRouter API Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")

# Embedding Model (SentenceTransformers, runs 100% locally at zero cost)
if FINE_TUNED_MODEL_DIR.exists() and (FINE_TUNED_MODEL_DIR / "config.json").exists():
    EMBEDDING_MODEL_NAME = str(FINE_TUNED_MODEL_DIR)
else:
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
    "purchase_order",
    "tax_form",
    "other"
]

# Business estimation defaults (for ROI/dashboard metrics)
ESTIMATED_MANUAL_REVIEW_MINUTES_PER_DOC = 15.0  # Average minutes a human reviewer takes
ESTIMATED_HOURLY_REVIEWER_RATE_USD = 45.0       # Average hourly rate for accounting/legal ops analyst
