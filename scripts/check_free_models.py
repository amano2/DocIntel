"""Discover all active free models on OpenRouter."""
import requests
import json

res = requests.get("https://openrouter.ai/api/v1/models")
if res.status_code == 200:
    data = res.json()
    free_models = []
    free_vision_models = []
    
    for m in data.get("data", []):
        m_id = m.get("id", "")
        pricing = m.get("pricing", {})
        prompt_cost = float(pricing.get("prompt", 0))
        comp_cost = float(pricing.get("completion", 0))
        
        # Check if free
        if ":free" in m_id or (prompt_cost == 0 and comp_cost == 0):
            free_models.append(m_id)
            # Check architecture / modalities
            arch = m.get("architecture", {})
            modality = arch.get("modality", "")
            if "image" in modality or "multimodal" in modality or "vision" in m_id:
                free_vision_models.append((m_id, modality))

    print(f"Total Free Models on OpenRouter: {len(free_models)}")
    print("\n--- Top Free Multimodal / Vision Models ---")
    for vm, mod in free_vision_models:
        print(f"  * {vm} (modality: {mod})")

    print("\n--- All Free Models on OpenRouter ---")
    for fm in free_models:
        print(f"  - {fm}")
else:
    print(f"Error fetching models: {res.status_code} {res.text}")
