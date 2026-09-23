import os
from dotenv import load_dotenv

load_dotenv()

# Environment Variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Confidence Thresholds
CONFIDENCE_THRESHOLD_HIGH = 0.90
CONFIDENCE_THRESHOLD_MEDIUM = 0.70

# Document Types
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

# Pipeline settings
MIN_CHAR_COUNT_FOR_TEXT_LAYER = 50  # If pypdf extracts fewer chars than this, fallback to vision

# LLM Models
VISION_MODEL = "google/gemini-2.5-flash" # or "google/gemma-*" depending on what openrouter has available for free vision
TEXT_MODEL = "google/gemma-2-9b-it:free" # Use openrouter free models
