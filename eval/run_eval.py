"""
Evaluation Benchmark Runner.

Measures:
1. Field-Level Extraction Accuracy: Exact and fuzzy matching of extracted vs ground-truth values.
2. Confidence Calibration: Verification that confidence scores correlate meaningfully with correctness.
3. Anomaly Detection Performance: Precision, Recall, and F1-score on deliberately injected test anomalies.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Ensure project root in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Ensure stdout handles unicode on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from src.database import Database
from src.index import VectorIndex
from src.pipeline import process_document


def evaluate_benchmark(test_docs_dir: Path, eval_dir: Path):
    print("=" * 70)
    print("MULTIMODAL DOCUMENT INTELLIGENCE AGENT - EVALUATION BENCHMARK")
    print("=" * 70)

    # Load Ground Truth
    gt_extract_file = eval_dir / "test_extraction.json"
    gt_anomaly_file = eval_dir / "test_anomalies.json"

    with open(gt_extract_file, "r") as f:
        gt_extractions = json.load(f)

    with open(gt_anomaly_file, "r") as f:
        gt_anomalies = json.load(f)

    # Isolated test database and vector store
    test_db_path = eval_dir / "_eval_test.db"
    if test_db_path.exists():
        test_db_path.unlink()
    test_db = Database(db_path=test_db_path)
    
    test_vindex_dir = eval_dir / "_eval_vindex"
    test_vindex = VectorIndex(index_dir=test_vindex_dir)

    # Process all test documents
    pdf_files = sorted(list(test_docs_dir.glob("*.pdf")))
    print(f"\nEvaluating on {len(pdf_files)} test documents...")

    doc_results = {}
    for pdf in pdf_files:
        print(f"  --> Ingesting & Extracting: {pdf.name}")
        res = process_document(
            file_path=pdf,
            db=test_db,
            vector_index=test_vindex
        )
        doc_results[pdf.name] = res

    # 1. Evaluate Extraction Accuracy
    print("\n" + "-" * 70)
    print("1. FIELD-LEVEL EXTRACTION ACCURACY & CONFIDENCE")
    print("-" * 70)

    total_fields = 0
    correct_fields = 0
    high_conf_correct = 0
    high_conf_total = 0
    low_conf_incorrect = 0
    low_conf_total = 0

    for doc_name, gt_fields in gt_extractions.items():
        if doc_name not in doc_results:
            continue

        extracted_res = doc_results[doc_name]
        ext_fields = extracted_res.get("fields", {})
        doc_type_pred = extracted_res.get("doc_type")
        doc_type_gt = gt_fields.get("doc_type")

        # Check doc_type accuracy
        total_fields += 1
        if doc_type_pred == doc_type_gt:
            correct_fields += 1

        for f_name, f_gt in gt_fields.items():
            if f_name == "doc_type":
                continue

            total_fields += 1
            f_extracted = ext_fields.get(f_name, {})
            val_ext = f_extracted.get("value")
            conf = float(f_extracted.get("confidence", 0.8))

            is_match = _compare_values(val_ext, f_gt)
            if is_match:
                correct_fields += 1

            # Calibration check
            if conf >= 0.85:
                high_conf_total += 1
                if is_match:
                    high_conf_correct += 1
            else:
                low_conf_total += 1
                if not is_match:
                    low_conf_incorrect += 1

    accuracy = (correct_fields / total_fields) if total_fields else 0.0
    high_conf_precision = (high_conf_correct / high_conf_total) if high_conf_total else 1.0
    print(f"Total Fields Evaluated: {total_fields}")
    print(f"Correctly Extracted:    {correct_fields} / {total_fields}")
    print(f"Extraction Accuracy:    {accuracy:.1%}")
    print(f"High-Confidence Precision: {high_conf_precision:.1%} ({high_conf_correct}/{high_conf_total} high-confidence fields were accurate)")

    # 2. Evaluate Anomaly Detection Precision & Recall
    print("\n" + "-" * 70)
    print("2. ANOMALY DETECTION METRICS (PRECISION, RECALL, F1)")
    print("-" * 70)

    tp = 0  # True Positives: Injected anomaly correctly flagged
    fp = 0  # False Positives: Clean document falsely flagged
    fn = 0  # False Negatives: Injected anomaly missed

    for doc_name, anom_gt in gt_anomalies.items():
        if doc_name not in doc_results:
            continue

        pred_anomalies = doc_results[doc_name].get("anomalies", [])
        expected_anomalies = anom_gt.get("expected_anomalies", [])

        expected_fields = {a["field"] for a in expected_anomalies}
        pred_fields = {a["field"] for a in pred_anomalies}

        # Check overlap
        for ef in expected_fields:
            if ef in pred_fields:
                tp += 1
            else:
                fn += 1

        for pf in pred_fields:
            if pf not in expected_fields:
                fp += 1

    precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    print(f"True Positives (Anomalies caught):  {tp}")
    print(f"False Positives (Clean doc flags):  {fp}")
    print(f"False Negatives (Missed anomalies): {fn}")
    print(f"Anomaly Recall:    {recall:.1%}")
    print(f"Anomaly Precision: {precision:.1%}")
    print(f"Anomaly F1 Score:  {f1:.3f}")

    print("\n" + "=" * 70)
    print("BENCHMARK EVALUATION SUMMARY")
    print("=" * 70)
    print(f"Extraction Field Accuracy : {accuracy:.1%}")
    print(f"Anomaly Detection Recall  : {recall:.1%}")
    print(f"Anomaly Detection Prec.   : {precision:.1%}")
    print(f"Anomaly F1-Score          : {f1:.3f}")
    print("=" * 70)

    # Cleanup temp eval db
    if test_db_path.exists():
        try:
            test_db_path.unlink()
        except Exception:
            pass


def _compare_values(ext_val: Any, gt_val: Any) -> bool:
    """Compares extracted value with ground truth with flexible type coercion."""
    if ext_val is None and gt_val is None:
        return True
    if ext_val is None or gt_val is None:
        return False

    # Numeric comparison
    try:
        f_ext = float(str(ext_val).replace("$", "").replace(",", "").strip())
        f_gt = float(str(gt_val).replace("$", "").replace(",", "").strip())
        return abs(f_ext - f_gt) < 0.05
    except (ValueError, TypeError):
        pass

    # Boolean comparison
    if isinstance(gt_val, bool):
        return bool(ext_val) == gt_val

    # String substring / fuzzy comparison
    s_ext = str(ext_val).lower().strip()
    s_gt = str(gt_val).lower().strip()
    return (s_gt in s_ext) or (s_ext in s_gt)


if __name__ == "__main__":
    test_docs = BASE_DIR / "eval" / "test_documents"
    eval_folder = BASE_DIR / "eval"
    evaluate_benchmark(test_docs, eval_folder)
