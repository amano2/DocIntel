import sys
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

print("Importing health_check from api.main...", flush=True)
from api.main import health_check

print("Executing health_check()...", flush=True)
result = health_check()
print("Health Check Result:")
print(json.dumps(result, indent=2), flush=True)
assert result["status"] in ["healthy", "degraded"], "Invalid status"
print("ALL HEALTH CHECKS PASSED SUCCESSFULLY!", flush=True)
