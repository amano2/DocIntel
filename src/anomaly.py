"""
Anomaly Detection and Flagging Engine.

Combines deterministic rule-based checks with an LLM-assisted catch-all inspector:
1. Rule 1 - Math Calculation Discrepancy: Line-item sum != subtotal OR subtotal + tax != total.
2. Rule 2 - Duplicate Document: Duplicate invoice number from same vendor.
3. Rule 3 - Missing Execution: Contract marked unsigned, blank signature line, or missing signature date.
4. Rule 4 - Date Chronology Inconsistency: Due date before invoice date, or contract expiry before effective date.
5. Rule 5 - Wire Fraud / Bank Account Discrepancy: Flag unexpected banking detail changes for existing vendors.
6. Rule 6 - Contract Renewal Notice Calculator: Flags upcoming cancellation deadlines for auto-renewing agreements.
7. LLM Catch-All Agent: Flags non-standard indemnities, contradictory payment terms, or suspicious clauses.

Every anomaly returns:
{
    "field": string,
    "severity": "high" | "medium" | "low",
    "message": string (plain English explanation),
    "type": "rule" | "llm",
    "suggested_action": string
}
"""

from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import re

from src.openrouter_service import OpenRouterService, default_openrouter_service


@dataclass
class AnomalyFlag:
    """Represents a flagged anomaly for human review."""
    field: str
    severity: str  # 'high', 'medium', 'low'
    message: str
    type: str      # 'rule' or 'llm'
    suggested_action: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def detect_anomalies(
    doc_id: str,
    doc_type: str,
    extracted_fields: Dict[str, Dict[str, Any]],
    raw_text: str = "",
    existing_invoices: Optional[List[Dict[str, Any]]] = None,
    llm_service: Optional[OpenRouterService] = None
) -> List[AnomalyFlag]:
    """
    Runs all rule checks and LLM checks on extracted fields.
    
    Args:
        doc_id: Document ID.
        doc_type: Document classification ('invoice', 'contract', 'compliance_doc', etc.).
        extracted_fields: Dictionary of field objects { "field_name": { "value": ..., "confidence": ... } }.
        raw_text: Full document text (for LLM context).
        existing_invoices: List of previously indexed invoices (for duplicate detection).
        llm_service: Optional OpenRouterService.
        
    Returns:
        List of AnomalyFlag objects.
    """
    flags: List[AnomalyFlag] = []

    # 1. Execute deterministic rule checks
    if doc_type == "invoice":
        flags.extend(_check_invoice_math(extracted_fields))
        flags.extend(_check_invoice_dates(extracted_fields))
        flags.extend(_check_invoice_duplicates(extracted_fields, existing_invoices, current_doc_id=doc_id))
        flags.extend(_check_vendor_bank_account(extracted_fields, raw_text, existing_invoices, current_doc_id=doc_id))
    elif doc_type == "contract":
        flags.extend(_check_contract_signatures(extracted_fields, raw_text))
        flags.extend(_check_contract_dates(extracted_fields))
        flags.extend(_check_contract_renewal_deadlines(extracted_fields, raw_text))
    elif doc_type == "compliance_doc":
        flags.extend(_check_compliance_deadlines(extracted_fields))
    elif doc_type == "purchase_order":
        flags.extend(_check_purchase_order_rules(extracted_fields, raw_text, existing_invoices, current_doc_id=doc_id))
    elif doc_type == "tax_form":
        flags.extend(_check_tax_form_rules(extracted_fields, raw_text))

    # 2. Run LLM catch-all inspector (if OpenRouter is configured)
    service = llm_service or default_openrouter_service
    if service.is_configured and raw_text:
        llm_flags = _run_llm_anomaly_check(doc_type, extracted_fields, raw_text, service)
        flags.extend(llm_flags)

    return flags


# --- Rule 1: Invoice Math Verification ---
def _check_invoice_math(fields: Dict[str, Dict[str, Any]]) -> List[AnomalyFlag]:
    flags = []
    
    subtotal = _get_float_val(fields, "subtotal")
    tax = _get_float_val(fields, "tax_amount")
    total = _get_float_val(fields, "total_amount")
    line_items = fields.get("line_items", {}).get("value")

    # Check line items sum vs subtotal
    if isinstance(line_items, list) and len(line_items) > 0 and subtotal is not None:
        calc_line_sum = 0.0
        for item in line_items:
            if isinstance(item, dict):
                amt = item.get("amount")
                if amt is not None:
                    try:
                        calc_line_sum += float(amt)
                    except (ValueError, TypeError):
                        pass
                elif "quantity" in item and "unit_price" in item:
                    try:
                        calc_line_sum += float(item["quantity"]) * float(item["unit_price"])
                    except (ValueError, TypeError):
                        pass

        # If mismatch exceeds $0.05 tolerance
        if abs(calc_line_sum - subtotal) > 0.05:
            diff = abs(calc_line_sum - subtotal)
            flags.append(AnomalyFlag(
                field="subtotal",
                severity="high",
                message=(
                    f"Line items sum to ${calc_line_sum:,.2f}, which does not match "
                    f"the stated subtotal of ${subtotal:,.2f} (Discrepancy: ${diff:,.2f})."
                ),
                type="rule",
                suggested_action="Verify line item pricing with the vendor before approving payment."
            ))

    # Check subtotal + tax vs total
    if subtotal is not None and tax is not None and total is not None:
        expected_total = subtotal + tax
        if abs(expected_total - total) > 0.05:
            diff = abs(expected_total - total)
            flags.append(AnomalyFlag(
                field="total_amount",
                severity="high",
                message=(
                    f"Subtotal (${subtotal:,.2f}) + Tax (${tax:,.2f}) = ${expected_total:,.2f}, "
                    f"which differs from stated Total (${total:,.2f}) by ${diff:,.2f}."
                ),
                type="rule",
                suggested_action="Recalculate invoice tax and total before posting to ERP/accounting system."
            ))

    return flags


# --- Rule 2: Duplicate Invoices ---
def _check_invoice_duplicates(
    fields: Dict[str, Dict[str, Any]],
    existing_invoices: Optional[List[Dict[str, Any]]],
    current_doc_id: str
) -> List[AnomalyFlag]:
    flags = []
    if not existing_invoices:
        return flags

    inv_num = _get_str_val(fields, "invoice_number")
    vendor = _get_str_val(fields, "vendor_name")
    
    if not inv_num:
        return flags

    for existing in existing_invoices:
        if existing.get("doc_id") == current_doc_id:
            continue
        
        ex_inv_num = existing.get("invoice_number", "")
        ex_vendor = existing.get("vendor_name", "")
        
        # Check matching invoice numbers
        if ex_inv_num and inv_num.lower() == ex_inv_num.lower():
            vendor_match = bool(vendor and ex_vendor and (vendor.lower() in ex_vendor.lower() or ex_vendor.lower() in vendor.lower()))
            sev = "high" if vendor_match else "medium"
            flags.append(AnomalyFlag(
                field="invoice_number",
                severity=sev,
                message=(
                    f"Duplicate invoice number '{inv_num}' detected. Matches previous document "
                    f"(ID: {existing.get('doc_id')}, Vendor: '{ex_vendor}'). Potential double-billing risk."
                ),
                type="rule",
                suggested_action="Check accounts payable records to confirm this invoice has not already been settled."
            ))
            break

    return flags


# --- Rule 3: Wire Fraud / Bank Account Discrepancy Check ---
def _check_vendor_bank_account(
    fields: Dict[str, Dict[str, Any]],
    raw_text: str,
    existing_invoices: Optional[List[Dict[str, Any]]],
    current_doc_id: str
) -> List[AnomalyFlag]:
    """Detects wire transfer account changes against historical invoices for the same vendor."""
    flags = []
    vendor = _get_str_val(fields, "vendor_name")
    if not vendor or not raw_text or not existing_invoices:
        return flags

    # Extract account number patterns (e.g. Account #4921, IBAN, ending in 4921)
    acc_match = re.search(r"(?:account|acct|iban|wire).*?(?:#|no\.?|ending in)\s*([A-Za-z0-9\-]+)", raw_text, re.IGNORECASE)
    if not acc_match:
        return flags
    
    current_account = acc_match.group(1).strip()
    
    for ex in existing_invoices:
        if ex.get("doc_id") == current_doc_id:
            continue
        ex_vendor = ex.get("vendor_name", "")
        ex_text = ex.get("raw_text", "")
        
        if vendor.lower() in ex_vendor.lower() or ex_vendor.lower() in vendor.lower():
            ex_acc_match = re.search(r"(?:account|acct|iban|wire).*?(?:#|no\.?|ending in)\s*([A-Za-z0-9\-]+)", ex_text, re.IGNORECASE)
            if ex_acc_match:
                prior_account = ex_acc_match.group(1).strip()
                if prior_account and current_account.lower() != prior_account.lower():
                    flags.append(AnomalyFlag(
                        field="payment_instructions",
                        severity="high",
                        message=(
                            f"Wire fraud alert: Bank wire account '{current_account}' differs from previously verified "
                            f"account '{prior_account}' for vendor '{vendor}'."
                        ),
                        type="rule",
                        suggested_action="Call vendor via verified offline phone number to confirm banking detail change before wiring funds."
                    ))
                    break

    return flags


# --- Rule 4: Contract Signatures & Execution ---
def _check_contract_signatures(fields: Dict[str, Dict[str, Any]], raw_text: str) -> List[AnomalyFlag]:
    flags = []
    is_signed = fields.get("is_signed", {}).get("value")
    
    # Check boolean is_signed or presence of blank underscores
    if is_signed is False or "______" in raw_text or "unsigned" in raw_text.lower():
        flags.append(AnomalyFlag(
            field="is_signed",
            severity="high",
            message="Contract appears unexecuted. Signature lines or signature date blocks are blank.",
            type="rule",
            suggested_action="Route contract to legal/commercial operations for full party execution before archiving."
        ))
    return flags


# --- Rule 5: Date Chronology Inconsistencies ---
def _check_invoice_dates(fields: Dict[str, Dict[str, Any]]) -> List[AnomalyFlag]:
    flags = []
    inv_date_str = _get_str_val(fields, "invoice_date")
    due_date_str = _get_str_val(fields, "due_date")

    inv_dt = _parse_date(inv_date_str)
    due_dt = _parse_date(due_date_str)

    if inv_dt and due_dt and due_dt < inv_dt:
        flags.append(AnomalyFlag(
            field="due_date",
            severity="high",
            message=f"Due date ({due_date_str}) is earlier than the Invoice date ({inv_date_str}). Chronology is invalid.",
            type="rule",
            suggested_action="Contact vendor to reissue invoice with corrected payment due date."
        ))
    return flags


def _check_contract_dates(fields: Dict[str, Dict[str, Any]]) -> List[AnomalyFlag]:
    flags = []
    eff_date_str = _get_str_val(fields, "effective_date")
    exp_date_str = _get_str_val(fields, "expiration_date")

    eff_dt = _parse_date(eff_date_str)
    exp_dt = _parse_date(exp_date_str)

    if eff_dt and exp_dt and exp_dt < eff_dt:
        flags.append(AnomalyFlag(
            field="expiration_date",
            severity="high",
            message=f"Contract expiration date ({exp_date_str}) occurs prior to the effective date ({eff_date_str}).",
            type="rule",
            suggested_action="Amend contract term dates with counterparties before signing."
        ))
    return flags


# --- Rule 6: Contract Auto-Renewal Notice Calculator ---
def _check_contract_renewal_deadlines(fields: Dict[str, Dict[str, Any]], raw_text: str) -> List[AnomalyFlag]:
    """Calculates notice cutoffs for contracts with automatic renewal provisions."""
    flags = []
    exp_date_str = _get_str_val(fields, "expiration_date")
    renewal_terms = _get_str_val(fields, "renewal_terms") or raw_text
    
    if not exp_date_str:
        return flags
        
    exp_dt = _parse_date(exp_date_str)
    if not exp_dt:
        return flags

    # Check for 30/60/90 days notice
    notice_days = 30
    if "60 days" in renewal_terms.lower() or "60-day" in renewal_terms.lower():
        notice_days = 60
    elif "90 days" in renewal_terms.lower() or "90-day" in renewal_terms.lower():
        notice_days = 90

    if any(k in renewal_terms.lower() for k in ["automatic renewal", "auto-renewal", "automatically renew", "auto renewal"]):
        cutoff_date = exp_dt - timedelta(days=notice_days)
        cutoff_str = cutoff_date.strftime("%B %d, %Y")
        
        flags.append(AnomalyFlag(
            field="renewal_terms",
            severity="low",
            message=(
                f"Auto-Renewal Notice Alert: Requires written termination notice at least {notice_days} days prior "
                f"to expiration (Notice Cutoff Date: {cutoff_str})."
            ),
            type="rule",
            suggested_action=f"Calendar renewal opt-out notice for {cutoff_str} to prevent involuntary rollover."
        ))

    return flags


def _check_compliance_deadlines(fields: Dict[str, Dict[str, Any]]) -> List[AnomalyFlag]:
    flags = []
    non_comp = fields.get("non_compliant_count", {}).get("value")
    if non_comp and int(non_comp) > 0:
        flags.append(AnomalyFlag(
            field="non_compliant_count",
            severity="medium",
            message=f"Audit report identifies {non_comp} non-compliant security/privacy control(s) requiring remediation.",
            type="rule",
            suggested_action="Assign remediation owner and track milestone completion prior to audit deadline."
        ))
    return flags


# --- Rule 7: Purchase Order Verification Rules ---
def _check_purchase_order_rules(
    fields: Dict[str, Dict[str, Any]],
    raw_text: str = "",
    existing_docs: Optional[List[Dict[str, Any]]] = None,
    current_doc_id: str = ""
) -> List[AnomalyFlag]:
    flags = []

    subtotal = _get_float_val(fields, "subtotal")
    tax = _get_float_val(fields, "tax_amount")
    total = _get_float_val(fields, "total_amount")
    line_items = fields.get("line_items", {}).get("value")

    # Math: line items vs subtotal
    if isinstance(line_items, list) and len(line_items) > 0 and subtotal is not None:
        calc_sub = sum(
            (float(it.get("amount", it.get("total", 0.0)))
             for it in line_items
             if isinstance(it, dict) and ("amount" in it or "total" in it))
        )
        if calc_sub > 0 and abs(calc_sub - subtotal) > 0.05:
            flags.append(AnomalyFlag(
                field="subtotal",
                severity="high",
                message=f"PO line items sum (${calc_sub:,.2f}) does not match reported subtotal (${subtotal:,.2f}).",
                type="rule",
                suggested_action="Reconcile item quantities and rates before dispatching purchase order."
            ))

    # Math: subtotal + tax vs total
    if subtotal is not None and tax is not None and total is not None:
        expected_total = subtotal + tax
        if abs(expected_total - total) > 0.05:
            flags.append(AnomalyFlag(
                field="total_amount",
                severity="high",
                message=f"PO subtotal (${subtotal:,.2f}) + tax (${tax:,.2f}) = ${expected_total:,.2f}, which does not match total amount (${total:,.2f}).",
                type="rule",
                suggested_action="Recalculate purchase order financial totals and adjust order ledger."
            ))

    # Chronology: delivery_date vs order_date
    order_date_str = _get_str_val(fields, "order_date")
    delivery_date_str = _get_str_val(fields, "delivery_date")
    order_dt = _parse_date(order_date_str)
    delivery_dt = _parse_date(delivery_date_str)

    if order_dt and delivery_dt and delivery_dt < order_dt:
        flags.append(AnomalyFlag(
            field="delivery_date",
            severity="high",
            message=f"PO requested delivery date ({delivery_date_str}) occurs before the order creation date ({order_date_str}).",
            type="rule",
            suggested_action="Update purchase order delivery schedule with realistic logistics turnaround."
        ))

    # Approval Status
    approval_status = _get_str_val(fields, "approval_status").lower()
    approver = _get_str_val(fields, "approver_name")
    if approval_status in ["pending", "unapproved", "draft"] or not approver or "pending" in approver.lower():
        flags.append(AnomalyFlag(
            field="approval_status",
            severity="medium",
            message="Purchase order requisition has not been authorized or approval is pending executive sign-off.",
            type="rule",
            suggested_action="Route requisition to designated departmental procurement authority for budget approval."
        ))

    # Duplicate PO Check
    po_num = _get_str_val(fields, "po_number")
    vendor = _get_str_val(fields, "vendor_name")
    if po_num and existing_docs:
        for ex in existing_docs:
            if ex.get("doc_id") == current_doc_id:
                continue
            ex_fields = ex.get("fields", {})
            ex_po = _get_str_val(ex_fields, "po_number") or _get_str_val(ex_fields, "invoice_number")
            ex_vendor = _get_str_val(ex_fields, "vendor_name")
            if ex_po and ex_po.lower() == po_num.lower():
                flags.append(AnomalyFlag(
                    field="po_number",
                    severity="high",
                    message=f"Duplicate Purchase Order number '{po_num}' previously registered for vendor '{ex_vendor or vendor}'.",
                    type="rule",
                    suggested_action="Verify procurement ledger to prevent dual order fulfillment or duplicate payment obligation."
                ))
                break

    return flags


# --- Rule 8: Tax Form (W-9 / 1099) Verification Rules ---
def _check_tax_form_rules(fields: Dict[str, Dict[str, Any]], raw_text: str = "") -> List[AnomalyFlag]:
    flags = []

    # Check TIN / EIN format
    tin_val = _get_str_val(fields, "tin_ein")
    clean_digits = re.sub(r"\D", "", tin_val)
    
    if not tin_val or len(clean_digits) != 9 or clean_digits == "000000000":
        flags.append(AnomalyFlag(
            field="tin_ein",
            severity="high",
            message=f"Taxpayer Identification Number (TIN/EIN) '{tin_val or 'MISSING'}' is invalid. Federal forms require exactly 9 digits.",
            type="rule",
            suggested_action="Issue formal IRS Form W-9 request to vendor to provide validated TIN/EIN before remittance."
        ))

    # Check Signature & Certification
    is_signed = fields.get("is_signed", {}).get("value")
    sig_date = _get_str_val(fields, "signature_date")
    
    if is_signed is False or "______" in raw_text or "unsigned" in raw_text.lower():
        flags.append(AnomalyFlag(
            field="is_signed",
            severity="high",
            message="Tax certification document is unexecuted. Certification under penalties of perjury is missing signature.",
            type="rule",
            suggested_action="Do not disburse payments until signed tax certification is on file for IRS 1099 reporting."
        ))
    elif not sig_date:
        flags.append(AnomalyFlag(
            field="signature_date",
            severity="medium",
            message="Tax certification signature date is missing or indeterminate.",
            type="rule",
            suggested_action="Request counterparty complete attestation date block."
        ))

    # Entity classification
    classification = _get_str_val(fields, "tax_classification")
    if not classification:
        flags.append(AnomalyFlag(
            field="tax_classification",
            severity="medium",
            message="Federal tax classification checkbox (e.g. C-Corp, LLC, Sole Proprietor) is unselected.",
            type="rule",
            suggested_action="Confirm entity tax status for appropriate 1099 backup withholding determination."
        ))

    return flags


# --- LLM Catch-All Anomaly Check ---
LLM_ANOMALY_PROMPT = """
You are a senior enterprise audit risk reviewer.
Inspect the following document text for any SEVERE anomalies, genuine fraud risks, or severe contradictions that deterministic rules might miss.

IMPORTANT GUIDELINES:
- Do NOT flag standard, normal business terms (e.g. standard Net 30 terms, standard confidentiality obligations, ordinary termination notice, standard governing law).
- Only flag genuine red flags, contradictory clauses, suspicious unapproved vendor terms, or obvious errors.
- If the document contains normal business and legal terms, return an empty array: []

Document Type: {doc_type}
Document Text:
{text_snippet}

Return a JSON array of genuine critical anomalies only:
[
  {{
    "field": "affected field name",
    "severity": "high" | "medium",
    "message": "Clear explanation of the severe risk",
    "suggested_action": "Actionable recommendation"
  }}
]
If no severe anomalies exist, return: []
"""


def _run_llm_anomaly_check(
    doc_type: str,
    fields: Dict[str, Dict[str, Any]],
    raw_text: str,
    service: OpenRouterService
) -> List[AnomalyFlag]:
    prompt = LLM_ANOMALY_PROMPT.format(
        doc_type=doc_type,
        text_snippet=raw_text[:2500]
    )
    try:
        data = service.generate_structured(prompt=prompt)
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict) and "flags" in data:
            items = data["flags"]
        else:
            items = []

        llm_flags = []
        for item in items:
            if isinstance(item, dict) and "message" in item:
                llm_flags.append(AnomalyFlag(
                    field=str(item.get("field", "general")),
                    severity=str(item.get("severity", "medium")).lower(),
                    message=str(item.get("message", "")),
                    type="llm",
                    suggested_action=str(item.get("suggested_action", "Review document manually."))
                ))
        return llm_flags
    except Exception:
        # LLM check is supplementary — failures here do not block pipeline
        return []


# --- Utility Helpers ---
def _get_float_val(fields: Dict[str, Dict[str, Any]], key: str) -> Optional[float]:
    obj = fields.get(key, {})
    val = obj.get("value") if isinstance(obj, dict) else obj
    if val is None:
        return None
    try:
        cleaned = str(val).replace("$", "").replace(",", "").strip()
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _get_str_val(fields: Dict[str, Dict[str, Any]], key: str) -> str:
    obj = fields.get(key, {})
    val = obj.get("value") if isinstance(obj, dict) else obj
    return str(val).strip() if val is not None else ""


def _parse_date(date_str: str) -> Optional[datetime]:
    if not date_str:
        return None
    date_str = date_str.strip()
    formats = [
        "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y",
        "%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%d %b %Y"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass
    return None
