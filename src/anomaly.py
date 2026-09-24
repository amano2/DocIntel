from typing import Dict, Any, List
import re
from src.openrouter_service import OpenRouterService
from src.config import DOC_TYPE_INVOICE, DOC_TYPE_CONTRACT, DOC_TYPE_PO, CONFIDENCE_THRESHOLD_MEDIUM
from src.logger import get_logger

log = get_logger("anomaly")

class AnomalyDetectionError(Exception):
    pass

def _parse_float(val: Any) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        # Strip currency symbols and commas
        clean = re.sub(r'[^\d.]', '', val)
        try:
            return float(clean)
        except ValueError:
            return 0.0
    return 0.0

def run_deterministic_rules(doc_type: str, extracted_data: Dict[str, Any]) -> List[Dict[str, str]]:
    anomalies = []
    
    # 1. Low Confidence check (applies to all)
    for k, v in extracted_data.items():
        if isinstance(v, dict) and "confidence" in v:
            if v["confidence"] < CONFIDENCE_THRESHOLD_MEDIUM:
                anomalies.append({
                    "rule_name": "Low Confidence Extraction",
                    "description": f"Field '{k}' was extracted with low confidence.",
                    "severity": "medium"
                })

    if doc_type == DOC_TYPE_INVOICE:
        # 2. Math mismatch
        subtotal = _parse_float(extracted_data.get("subtotal", {}).get("value"))
        tax = _parse_float(extracted_data.get("tax", {}).get("value"))
        total = _parse_float(extracted_data.get("total", {}).get("value"))
        
        if total > 0 and abs((subtotal + tax) - total) > 0.05:
            anomalies.append({
                "rule_name": "Math Mismatch",
                "description": f"Subtotal + Tax ({subtotal} + {tax}) does not equal Total ({total}).",
                "severity": "high"
            })
            
        # 3. Empty line items
        line_items = extracted_data.get("line_items", {}).get("value")
        if not line_items or len(line_items) == 0:
            anomalies.append({
                "rule_name": "Missing Line Items",
                "description": "No line items were found on this invoice.",
                "severity": "medium"
            })
            
    elif doc_type == DOC_TYPE_CONTRACT:
        # 4. Missing signature
        sig_status = extracted_data.get("signature_status", {}).get("value", "").lower()
        if "unsigned" in sig_status or not sig_status:
            anomalies.append({
                "rule_name": "Unsigned Contract",
                "description": "The contract appears to be missing a signature.",
                "severity": "high"
            })
            
    elif doc_type == DOC_TYPE_PO:
        # 5. Missing PO Number
        po_num = extracted_data.get("po_number", {}).get("value")
        if not po_num:
            anomalies.append({
                "rule_name": "Missing PO Number",
                "description": "Purchase Order is missing a PO number.",
                "severity": "high"
            })
            
        # 6. Unusually high amount
        total = _parse_float(extracted_data.get("total_amount", {}).get("value"))
        if total > 50000:
            anomalies.append({
                "rule_name": "High Value PO",
                "description": f"PO amount is unusually high: {total}.",
                "severity": "low"
            })

    return anomalies

async def run_llm_catchall(llm_service: OpenRouterService, doc_type: str, extracted_data: Dict[str, Any]) -> List[Dict[str, str]]:
    prompt = f"""
    You are an expert auditor reviewing an extracted {doc_type}.
    Review the following extracted data and flag ANY logical inconsistencies, suspicious terms, or unusual patterns that a deterministic rule might miss.
    
    Data:
    {extracted_data}
    
    Return a JSON array of anomalies. If none, return an empty array.
    Format:
    {{
      "anomalies": [
        {{
          "rule_name": "Short Name",
          "description": "Explanation of the issue",
          "severity": "low|medium|high"
        }}
      ]
    }}
    """
    try:
        result = await llm_service.generate_json(prompt=prompt)
        return result.get("anomalies", [])
    except Exception as e:
        log.warning(f"LLM anomaly catchall failed (non-fatal): {e}")
        return []

async def detect_anomalies(llm_service: OpenRouterService, doc_type: str, extracted_data: Dict[str, Any]) -> List[Dict[str, str]]:
    rules_anomalies = run_deterministic_rules(doc_type, extracted_data)
    llm_anomalies = await run_llm_catchall(llm_service, doc_type, extracted_data)
    
    return rules_anomalies + llm_anomalies
