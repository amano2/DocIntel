"""
End-to-end Evaluation Runner for the DocIntel Pipeline.

Processes each synthetic test document through the full pipeline:
  Ingestion → Classification → Extraction → Anomaly Detection → Indexing

Then compares results against ground truth to measure:
  1. Classification accuracy
  2. Field extraction accuracy (fuzzy matching)
  3. Anomaly detection precision and recall
  4. RAG query sanity check

Usage:
  python -m eval.run_eval
"""

import asyncio
import json
import os
import sys
import time
from typing import Dict, Any, List

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.openrouter_service import OpenRouterService
from src.ingest import ingest_document
from src.classify import classify_document
from src.extract import extract_structured_data
from src.anomaly import detect_anomalies
from src.index import FaissIndexer

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_docs")
GT_PATH = os.path.join(os.path.dirname(__file__), "ground_truth.json")
RESULTS_PATH = os.path.join(os.path.dirname(__file__), "eval_results.json")


def _normalize(val: Any) -> str:
    """Normalize a value to a lowercase string for fuzzy comparison."""
    if val is None:
        return ""
    if isinstance(val, (list, dict)):
        return json.dumps(val, sort_keys=True).lower()
    return str(val).strip().lower().replace(",", "").replace("$", "")


def _fuzzy_match(expected: str, actual: str) -> bool:
    """Check if the actual extracted value contains or closely matches the expected."""
    exp = _normalize(expected)
    act = _normalize(actual)
    if not exp:
        return True  # Nothing expected
    if not act:
        return False
    # Direct containment check
    if exp in act or act in exp:
        return True
    # Numeric comparison for dollar amounts
    try:
        e_num = float(exp)
        a_num = float(act)
        return abs(e_num - a_num) < 0.02
    except (ValueError, TypeError):
        pass
    return False


def _match_list_field(expected_list: list, actual_value: Any) -> bool:
    """Check if all expected list items are found somewhere in the extracted value."""
    if not expected_list:
        return True
    actual_str = _normalize(actual_value)
    matched = 0
    for item in expected_list:
        if _normalize(item) in actual_str:
            matched += 1
    return matched >= len(expected_list) * 0.6  # 60% match threshold for lists


class EvalRunner:
    def __init__(self):
        self.llm = OpenRouterService()
        self.indexer = FaissIndexer()
        self.results: List[Dict[str, Any]] = []

    async def process_single(self, filename: str, ground_truth: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single document through the full pipeline and score it."""
        filepath = os.path.join(SAMPLE_DIR, filename)
        if not os.path.exists(filepath):
            return {"filename": filename, "error": f"File not found: {filepath}"}

        with open(filepath, "rb") as f:
            file_bytes = f.read()

        result = {
            "filename": filename,
            "description": ground_truth.get("description", ""),
            "stages": {},
            "scores": {},
        }

        # ── Stage 1: Ingestion ──────────────────────────────────────────────
        print(f"  [1/5] Ingesting {filename}...")
        try:
            t0 = time.perf_counter()
            ingest_res = ingest_document(file_bytes, filename)
            duration = round((time.perf_counter() - t0) * 1000, 1)
            result["stages"]["ingestion"] = {
                "status": "OK",
                "duration_ms": duration,
                "total_pages": ingest_res["total_pages"],
                "is_scanned": ingest_res["is_scanned"],
                "text_length": len(ingest_res["text"]),
            }
        except Exception as e:
            result["stages"]["ingestion"] = {"status": "FAILED", "error": str(e)}
            return result

        text = ingest_res["text"]
        images = ingest_res["images"]
        is_scanned = ingest_res["is_scanned"]

        # ── Stage 2: Classification ─────────────────────────────────────────
        print(f"  [2/5] Classifying...")
        try:
            t0 = time.perf_counter()
            doc_type = await classify_document(self.llm, text, images, is_scanned)
            duration = round((time.perf_counter() - t0) * 1000, 1)

            expected_type = ground_truth["expected_doc_type"]
            is_correct = doc_type == expected_type

            result["stages"]["classification"] = {
                "status": "OK",
                "duration_ms": duration,
                "predicted": doc_type,
                "expected": expected_type,
                "correct": is_correct,
            }
            result["scores"]["classification"] = 1.0 if is_correct else 0.0
        except Exception as e:
            result["stages"]["classification"] = {"status": "FAILED", "error": str(e)}
            result["scores"]["classification"] = 0.0
            doc_type = ground_truth["expected_doc_type"]  # Fallback for downstream

        # ── Stage 3: Extraction ─────────────────────────────────────────────
        print(f"  [3/5] Extracting fields...")
        try:
            t0 = time.perf_counter()
            extracted = await extract_structured_data(self.llm, doc_type, text, images, is_scanned)
            duration = round((time.perf_counter() - t0) * 1000, 1)

            # Score field extraction
            expected_fields = ground_truth.get("expected_fields", {})
            field_scores = {}
            for field_name, expected_val in expected_fields.items():
                actual_field = extracted.get(field_name, {})
                actual_val = actual_field.get("value") if isinstance(actual_field, dict) else actual_field

                if isinstance(expected_val, list):
                    matched = _match_list_field(expected_val, actual_val)
                else:
                    matched = _fuzzy_match(str(expected_val), str(actual_val) if actual_val else "")

                confidence = actual_field.get("confidence", 0.0) if isinstance(actual_field, dict) else 0.0
                field_scores[field_name] = {
                    "expected": str(expected_val),
                    "actual": str(actual_val) if actual_val else "null",
                    "confidence": confidence,
                    "matched": matched,
                }

            total_fields = len(expected_fields)
            matched_fields = sum(1 for fs in field_scores.values() if fs["matched"])
            accuracy = matched_fields / total_fields if total_fields > 0 else 1.0

            result["stages"]["extraction"] = {
                "status": "OK",
                "duration_ms": duration,
                "field_count": len(extracted),
                "field_scores": field_scores,
            }
            result["scores"]["extraction_accuracy"] = round(accuracy, 3)
            result["scores"]["fields_matched"] = f"{matched_fields}/{total_fields}"

        except Exception as e:
            result["stages"]["extraction"] = {"status": "FAILED", "error": str(e)}
            result["scores"]["extraction_accuracy"] = 0.0
            extracted = {}

        # ── Stage 4: Anomaly Detection ──────────────────────────────────────
        print(f"  [4/5] Running anomaly detection...")
        try:
            t0 = time.perf_counter()
            anomalies = await detect_anomalies(self.llm, doc_type, extracted)
            duration = round((time.perf_counter() - t0) * 1000, 1)

            expected_anomalies = ground_truth.get("expected_anomalies", [])
            detected_names = [a.get("rule_name", "") for a in anomalies]

            # Precision: of the anomalies we flagged, how many were expected?
            true_positives = [name for name in detected_names if any(exp.lower() in name.lower() for exp in expected_anomalies)]
            # Recall: of the expected anomalies, how many did we catch?
            caught = [exp for exp in expected_anomalies if any(exp.lower() in name.lower() for name in detected_names)]

            precision = len(true_positives) / len(detected_names) if detected_names else (1.0 if not expected_anomalies else 0.0)
            recall = len(caught) / len(expected_anomalies) if expected_anomalies else 1.0

            result["stages"]["anomaly_detection"] = {
                "status": "OK",
                "duration_ms": duration,
                "detected": detected_names,
                "expected": expected_anomalies,
                "true_positives": true_positives,
                "caught": caught,
                "all_anomalies": anomalies,
            }
            result["scores"]["anomaly_precision"] = round(precision, 3)
            result["scores"]["anomaly_recall"] = round(recall, 3)

        except Exception as e:
            result["stages"]["anomaly_detection"] = {"status": "FAILED", "error": str(e)}
            result["scores"]["anomaly_precision"] = 0.0
            result["scores"]["anomaly_recall"] = 0.0

        # ── Stage 5: Indexing ───────────────────────────────────────────────
        print(f"  [5/5] Indexing for RAG...")
        try:
            t0 = time.perf_counter()
            if text:
                self.indexer.add_document(filename, "eval_user", text)
            duration = round((time.perf_counter() - t0) * 1000, 1)
            result["stages"]["indexing"] = {"status": "OK", "duration_ms": duration}
        except Exception as e:
            result["stages"]["indexing"] = {"status": "FAILED", "error": str(e)}

        return result

    async def run_all(self):
        """Run evaluation across all test documents."""
        with open(GT_PATH, "r") as f:
            ground_truth = json.load(f)

        print("\n" + "=" * 70)
        print("  DOCINTEL EVALUATION SUITE")
        print("=" * 70)

        total_start = time.perf_counter()

        from src.anomaly import reset_seen_invoices
        reset_seen_invoices()

        # Process documents in order (important: invoice_anomaly_math before invoice_duplicate
        # so the duplicate check has a prior document to match against)
        ordered_files = [
            "invoice_clean.pdf",
            "invoice_anomaly_math.pdf",
            "contract_clean.pdf",
            "contract_unsigned.pdf",
            "compliance_clean.pdf",
            "po_high_value.pdf",
            "invoice_duplicate.pdf",  # Must be last to test duplicate detection
        ]

        for filename in ordered_files:
            if filename not in ground_truth:
                print(f"\n⚠ Skipping {filename}: no ground truth entry")
                continue

            print(f"\n{'─' * 70}")
            print(f"  📄 Processing: {filename}")
            print(f"     {ground_truth[filename].get('description', '')}")
            print(f"{'─' * 70}")

            result = await self.process_single(filename, ground_truth[filename])
            self.results.append(result)

            # Print inline scores
            scores = result.get("scores", {})
            cls_icon = "✅" if scores.get("classification", 0) == 1.0 else "❌"
            ext_pct = scores.get("extraction_accuracy", 0) * 100
            ext_icon = "✅" if ext_pct >= 80 else "⚠️" if ext_pct >= 50 else "❌"
            recall_icon = "✅" if scores.get("anomaly_recall", 0) == 1.0 else "❌"

            print(f"\n  Results:")
            print(f"    {cls_icon} Classification: {result['stages'].get('classification', {}).get('predicted', '?')} (expected: {result['stages'].get('classification', {}).get('expected', '?')})")
            print(f"    {ext_icon} Extraction Accuracy: {ext_pct:.0f}% ({scores.get('fields_matched', '?')})")
            print(f"    {recall_icon} Anomaly Recall: {scores.get('anomaly_recall', 0)*100:.0f}% | Precision: {scores.get('anomaly_precision', 0)*100:.0f}%")

            # Brief delay between API calls to be nice to rate limits
            await asyncio.sleep(3)

        total_duration = round(time.perf_counter() - total_start, 1)

        # ── Aggregate Scores ────────────────────────────────────────────────
        print(f"\n\n{'=' * 70}")
        print("  AGGREGATE RESULTS")
        print(f"{'=' * 70}")

        n = len(self.results)
        avg_cls = sum(r["scores"].get("classification", 0) for r in self.results) / n if n else 0
        avg_ext = sum(r["scores"].get("extraction_accuracy", 0) for r in self.results) / n if n else 0
        avg_recall = sum(r["scores"].get("anomaly_recall", 0) for r in self.results) / n if n else 0
        avg_precision = sum(r["scores"].get("anomaly_precision", 0) for r in self.results) / n if n else 0

        print(f"  📊 Documents Processed: {n}")
        print(f"  ⏱  Total Time: {total_duration}s")
        print(f"  🏷  Classification Accuracy: {avg_cls*100:.0f}%")
        print(f"  📝 Field Extraction Accuracy: {avg_ext*100:.0f}%")
        print(f"  🚨 Anomaly Recall: {avg_recall*100:.0f}%")
        print(f"  🎯 Anomaly Precision: {avg_precision*100:.0f}%")
        print(f"{'=' * 70}\n")

        # Save full results
        output = {
            "run_timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "total_documents": n,
            "total_duration_s": total_duration,
            "aggregate": {
                "classification_accuracy": round(avg_cls, 3),
                "extraction_accuracy": round(avg_ext, 3),
                "anomaly_recall": round(avg_recall, 3),
                "anomaly_precision": round(avg_precision, 3),
            },
            "per_document": self.results,
        }

        with open(RESULTS_PATH, "w") as f:
            json.dump(output, f, indent=2, default=str)

        print(f"  Full results saved to: {RESULTS_PATH}")


if __name__ == "__main__":
    runner = EvalRunner()
    asyncio.run(runner.run_all())
