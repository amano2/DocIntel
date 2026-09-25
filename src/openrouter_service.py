"""
OpenRouter LLM service client.
Wraps the OpenAI-compatible API for text generation, JSON extraction,
and multi-page vision calls. Includes structured logging and automatic
retry with exponential backoff on rate limits (HTTP 429).
"""

import asyncio
import json
import time
from typing import Optional, Dict, Any, List
import json_repair
from openai import AsyncOpenAI
from src.config import OPENROUTER_API_KEY, VISION_MODEL, TEXT_MODEL
from src.logger import get_logger

log = get_logger("llm")


class LLMServiceError(Exception):
    pass


class OpenRouterService:
    def __init__(self):
        if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your_openrouter_api_key_here":
            self.client = None
        else:
            self.client = AsyncOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=OPENROUTER_API_KEY,
            )

    def _clean_json(self, response_text: str) -> str:
        """Removes markdown code fences and extracts JSON substring from LLM output."""
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        # Find first '{' or '[' and last '}' or ']'
        start_idx = -1
        for idx, char in enumerate(text):
            if char in ('{', '['):
                start_idx = idx
                break
        if start_idx != -1:
            end_idx = -1
            for idx in range(len(text) - 1, -1, -1):
                if text[idx] in ('}', ']'):
                    end_idx = idx + 1
                    break
            if end_idx != -1 and end_idx > start_idx:
                text = text[start_idx:end_idx]

        return text.strip()

    async def _create_completion(self, **kwargs):
        """
        Executes a chat completion with:
        1. Automatic fallback if model rejects response_format={"type": "json_object"}.
        2. Automatic retry with exponential backoff if rate limited (429).
        """
        max_retries = 5
        base_delay = 3.0
        supports_rf = True

        for attempt in range(max_retries):
            call_kwargs = dict(kwargs)
            if not supports_rf and "response_format" in call_kwargs:
                del call_kwargs["response_format"]

            try:
                return await self.client.chat.completions.create(**call_kwargs)
            except Exception as e:
                err_str = str(e).lower()
                # Check for unsupported structured outputs
                if ("structured-outputs" in err_str or "response_format" in err_str or "invalid_request_body" in err_str) and supports_rf:
                    log.info(f"Model {kwargs.get('model')} does not support structured-outputs. Retrying without response_format.")
                    supports_rf = False
                    continue

                # Check for rate limits (429)
                if "429" in err_str or "rate limit" in err_str:
                    sleep_time = base_delay * (1.8 ** attempt)
                    log.warning(
                        f"Rate limited (429) on {kwargs.get('model')}. Retrying in {sleep_time:.1f}s (attempt {attempt + 1}/{max_retries})..."
                    )
                    await asyncio.sleep(sleep_time)
                    continue

                # Any other error
                raise e

        raise LLMServiceError(f"Exceeded max retries ({max_retries}) for model {kwargs.get('model')} due to rate limits.")

    async def generate_json(
        self,
        prompt: str,
        image_base64: Optional[str] = None,
        is_vision: bool = False,
    ) -> Dict[str, Any]:
        """
        Sends a prompt to OpenRouter and returns structured JSON.
        Uses vision model if image is provided.
        """
        if not self.client:
            return {"mock": "No OpenRouter key configured"}

        model = VISION_MODEL if is_vision or image_base64 else TEXT_MODEL

        messages = []
        if image_base64:
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        },
                    },
                ],
            })
        else:
            messages.append({"role": "user", "content": prompt})

        start = time.perf_counter()
        try:
            response = await self._create_completion(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
            )

            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            content = response.choices[0].message.content
            cleaned_content = self._clean_json(content)

            usage = getattr(response, "usage", None)
            log.info(
                f"LLM JSON call completed ({duration_ms}ms)",
                extra={"data": {
                    "model": model,
                    "duration_ms": duration_ms,
                    "prompt_tokens": getattr(usage, "prompt_tokens", None) if usage else None,
                    "completion_tokens": getattr(usage, "completion_tokens", None) if usage else None,
                }},
            )

            try:
                return json.loads(cleaned_content)
            except Exception as parse_err:
                try:
                    repaired = json_repair.loads(cleaned_content)
                    if isinstance(repaired, dict):
                        return repaired
                    log.warning(f"json_repair did not return dict: {type(repaired)}")
                except Exception as r_err:
                    pass
                log.error(f"LLM returned invalid JSON: {parse_err}", extra={"data": {"model": model}})
                raise LLMServiceError(f"LLM returned invalid JSON: {str(parse_err)}")
        except Exception as e:
            if isinstance(e, LLMServiceError):
                raise e
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            log.error(f"OpenRouter call failed ({duration_ms}ms): {e}", extra={"data": {"model": model}})
            raise LLMServiceError(f"OpenRouter call failed: {str(e)}")

    async def generate_json_multipage(
        self,
        prompt: str,
        images_base64: List[str],
    ) -> Dict[str, Any]:
        """
        Vision call with multiple page images.
        Each image is sent as a separate image_url block in the message content array.
        This is critical for scanned multi-page documents.
        """
        if not self.client:
            return {"mock": "No OpenRouter key configured"}

        content_blocks: List[Dict[str, Any]] = [{"type": "text", "text": prompt}]
        for i, img_b64 in enumerate(images_base64):
            content_blocks.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{img_b64}"
                },
            })

        messages = [{"role": "user", "content": content_blocks}]

        start = time.perf_counter()
        try:
            response = await self._create_completion(
                model=VISION_MODEL,
                messages=messages,
                response_format={"type": "json_object"},
            )

            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            content = response.choices[0].message.content
            cleaned_content = self._clean_json(content)

            usage = getattr(response, "usage", None)
            log.info(
                f"LLM multipage vision call completed ({duration_ms}ms, {len(images_base64)} pages)",
                extra={"data": {
                    "model": VISION_MODEL,
                    "pages": len(images_base64),
                    "duration_ms": duration_ms,
                    "prompt_tokens": getattr(usage, "prompt_tokens", None) if usage else None,
                    "completion_tokens": getattr(usage, "completion_tokens", None) if usage else None,
                }},
            )

            try:
                return json.loads(cleaned_content)
            except Exception as parse_err:
                try:
                    repaired = json_repair.loads(cleaned_content)
                    if isinstance(repaired, dict):
                        return repaired
                except Exception:
                    pass
                log.error(f"Multipage vision returned invalid JSON: {parse_err}")
                raise LLMServiceError(f"LLM returned invalid JSON: {str(parse_err)}")
        except Exception as e:
            if isinstance(e, LLMServiceError):
                raise e
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            log.error(f"Multipage vision call failed ({duration_ms}ms): {e}")
            raise LLMServiceError(f"OpenRouter multipage call failed: {str(e)}")

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Standard text completion for RAG Q&A or plain-text tasks."""
        if not self.client:
            return "No OpenRouter key configured. Cannot answer."

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        start = time.perf_counter()
        try:
            response = await self._create_completion(
                model=TEXT_MODEL,
                messages=messages,
            )

            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            log.info(f"LLM text call completed ({duration_ms}ms)", extra={"data": {"model": TEXT_MODEL}})

            return response.choices[0].message.content

        except Exception as e:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            log.error(f"LLM text completion failed ({duration_ms}ms): {e}")
            raise LLMServiceError(f"OpenRouter text call failed: {str(e)}")
