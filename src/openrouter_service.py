import json
import re
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
from src.config import OPENROUTER_API_KEY, VISION_MODEL, TEXT_MODEL

class LLMServiceError(Exception):
    pass

class OpenRouterService:
    def __init__(self):
        if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your_openrouter_api_key_here":
            # For testing without real keys, we can just log or use a dummy
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

    async def generate_json(self, prompt: str, image_base64: Optional[str] = None, is_vision: bool = False) -> Dict[str, Any]:
        """
        Sends a prompt to OpenRouter and returns structured JSON.
        If image_base64 is provided (as a base64 string of a jpeg/png), it uses the vision model.
        """
        if not self.client:
            # Fallback for dev without keys
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
                        }
                    }
                ]
            })
        else:
            messages.append({
                "role": "user",
                "content": prompt
            })

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            cleaned_content = self._clean_json(content)
            
            return json.loads(cleaned_content)
            
        except Exception as e:
            raise LLMServiceError(f"OpenRouter call failed: {str(e)}")
            
    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Standard text completion for RAG Q&A or plain-text tasks."""
        if not self.client:
            return "No OpenRouter key configured. Cannot answer."
            
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        try:
            response = await self.client.chat.completions.create(
                model=TEXT_MODEL,
                messages=messages
            )
            return response.choices[0].message.content
        except Exception as e:
            raise LLMServiceError(f"OpenRouter text generation failed: {str(e)}")
