"""
OpenRouter Multimodal API Service.

Provides a unified interface to free vision & text models via OpenRouter (OpenAI-compatible REST API):
- Handles text prompts and multimodal image inputs (Base64 JPEG encoded)
- Automatically routes image inputs to free vision models if the primary model is text-only
- Structured JSON output parsing with markdown fence stripping
- Comprehensive error handling and fallbacks
"""

import base64
import io
import json
import os
import re
from typing import Any, Dict, List, Optional, Union
from PIL import Image
import requests

from src.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    OPENROUTER_MODEL
)

# Free vision models currently active on OpenRouter for image-based/scanned documents
FREE_VISION_MODELS = [
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "google/gemma-4-31b-it:free",
    "openrouter/free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
]


class OpenRouterService:
    """Service wrapper for OpenRouter API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None
    ):
        self.api_key = api_key or OPENROUTER_API_KEY or os.getenv("OPENROUTER_API_KEY", "")
        self.model_name = model_name or OPENROUTER_MODEL or os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-super-120b-a12b:free")
        self.base_url = (base_url or OPENROUTER_BASE_URL or "https://openrouter.ai/api/v1").rstrip("/")

    @property
    def is_configured(self) -> bool:
        """Returns True if a valid OpenRouter API key is configured."""
        return bool(self.api_key and self.api_key.strip())

    def _encode_image_to_base64(self, image: Image.Image) -> str:
        """Converts a PIL Image to a Base64 data URL string."""
        buffered = io.BytesIO()
        image.convert("RGB").save(buffered, format="JPEG", quality=85)
        img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/jpeg;base64,{img_b64}"

    def generate_text(
        self,
        prompt: str,
        images: Optional[List[Image.Image]] = None,
        temperature: float = 0.1
    ) -> str:
        """
        Sends a request to OpenRouter and returns the text response.
        If images are provided and the primary model does not support images,
        gracefully falls back to a free vision model on OpenRouter.
        """
        if not self.is_configured:
            raise RuntimeError("OPENROUTER_API_KEY is not set. Please provide your OpenRouter API key.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8501",
            "X-Title": "DocIntellect Multimodal Agent"
        }

        # Build message content (text + optional base64 images)
        content: List[Dict[str, Any]] = [{"type": "text", "text": prompt}]

        if images:
            for img in images:
                b64_url = self._encode_image_to_base64(img)
                content.append({
                    "type": "image_url",
                    "image_url": {"url": b64_url}
                })

        candidate_models = [self.model_name]
        if images:
            # Add free vision fallback models if images are attached
            for vm in FREE_VISION_MODELS:
                if vm not in candidate_models:
                    candidate_models.append(vm)

        last_error = None
        for model in candidate_models:
            payload = {
                "model": model,
                "messages": [
                    {"role": "user", "content": content}
                ],
                "temperature": temperature
            }

            url = f"{self.base_url}/chat/completions"
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=60)
                
                if response.status_code == 200:
                    res_json = response.json()
                    choices = res_json.get("choices", [])
                    if choices:
                        return choices[0].get("message", {}).get("content", "").strip()
                
                # Check for image input unsupported error
                err_text = response.text
                if "image input" in err_text.lower() or response.status_code == 404:
                    last_error = f"Model {model} does not support vision: {err_text}"
                    continue
                else:
                    last_error = f"OpenRouter API returned status {response.status_code}: {err_text}"
            except Exception as e:
                last_error = str(e)
                continue

        raise RuntimeError(f"All OpenRouter candidate models failed. Last error: {last_error}")

    def generate_structured(
        self,
        prompt: str,
        images: Optional[List[Image.Image]] = None,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        """
        Sends prompt (and optional images) to OpenRouter and parses the response as JSON.
        """
        raw_text = self.generate_text(prompt=prompt, images=images, temperature=temperature)
        return self._clean_and_parse_json(raw_text)

    def _clean_and_parse_json(self, raw_text: str) -> Dict[str, Any]:
        """Strips markdown code fences and parses JSON safely."""
        cleaned = raw_text.strip()
        if "```" in cleaned:
            cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\n?```$", "", cleaned)
            cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except Exception:
                    pass
            raise ValueError(f"Failed to parse OpenRouter response as JSON: {raw_text}")


# Default singleton
default_openrouter_service = OpenRouterService()
