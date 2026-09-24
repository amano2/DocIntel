"""
OpenRouter LLM service client.
Wraps the OpenAI-compatible API for text generation, JSON extraction,
and multi-page vision calls. Includes structured logging for every LLM call.
"""

import json
import time
from typing import Optional, Dict, Any, List
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
        """Removes markdown code fences from LLM output to parse JSON."""
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

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
            response = await self.client.chat.completions.create(
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

            return json.loads(cleaned_content)

        except json.JSONDecodeError as e:
            log.error(f"LLM returned invalid JSON: {e}", extra={"data": {"model": model}})
            raise LLMServiceError(f"LLM returned invalid JSON: {str(e)}")
        except Exception as e:
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
            response = await self.client.chat.completions.create(
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

            return json.loads(cleaned_content)

        except json.JSONDecodeError as e:
            log.error(f"Multipage vision returned invalid JSON: {e}")
            raise LLMServiceError(f"LLM returned invalid JSON: {str(e)}")
        except Exception as e:
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
            response = await self.client.chat.completions.create(
                model=TEXT_MODEL,
                messages=messages,
            )

            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            log.info(f"LLM text call completed ({duration_ms}ms)", extra={"data": {"model": TEXT_MODEL}})

            return response.choices[0].message.content

        except Exception as e:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            log.error(f"Text generation failed ({duration_ms}ms): {e}")
            raise LLMServiceError(f"OpenRouter text generation failed: {str(e)}")
