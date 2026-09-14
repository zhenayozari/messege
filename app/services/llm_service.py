"""Universal LLM Gateway for Phoenix CRM.

Supports OpenAI-compatible API interface:
1. "local_llama": Local llama-server.exe at http://localhost:8080/v1 with Ternary-Bonsai-27B (no API key required)
2. "openai": Cloud OpenAI API at https://api.openai.com/v1 with gpt-4o-mini (requires OPENAI_API_KEY)
"""

from __future__ import annotations

import logging
import os
from enum import Enum
from typing import Any

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger("phoenix.services.llm")


class LLMProvider(str, Enum):
    local_llama = "local_llama"
    openai = "openai"


class LLMConfig(BaseModel):
    """Configuration for LLM Providers and defaults."""
    default_provider: LLMProvider = Field(
        default=LLMProvider.local_llama,
        description="Default provider if not explicitly specified in the request"
    )
    # 1. Local llama-server.exe
    local_base_url: str = Field(
        default=os.getenv("LOCAL_LLAMA_URL", "http://localhost:8080/v1"),
        description="Local llama-server base URL"
    )
    local_model: str = Field(
        default=os.getenv("LOCAL_LLAMA_MODEL", "Ternary-Bonsai-27B"),
        description="Local model name loaded in llama-server.exe"
    )
    local_timeout_seconds: float = Field(
        default=60.0,
        description="Timeout for local inference"
    )

    # 2. Cloud OpenAI API
    openai_base_url: str = Field(
        default="https://api.openai.com/v1",
        description="Cloud OpenAI base URL"
    )
    openai_model: str = Field(
        default=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        description="Cloud model identifier"
    )
    openai_api_key: str | None = Field(
        default=os.getenv("OPENAI_API_KEY"),
        description="OpenAI API Key for cloud generation"
    )
    openai_timeout_seconds: float = Field(
        default=30.0,
        description="Timeout for OpenAI cloud requests"
    )


# Singleton configuration instance
_llm_config = LLMConfig()


def get_llm_config() -> LLMConfig:
    return _llm_config


def update_llm_config(new_config: dict[str, Any]) -> LLMConfig:
    global _llm_config
    _llm_config = _llm_config.model_copy(update=new_config)
    return _llm_config


class LLMResponse(BaseModel):
    provider: LLMProvider
    model: str
    reply_text: str
    tokens_used: int | None = None
    finish_reason: str | None = None
    raw_response: dict[str, Any] | None = None


async def call_chat_completion(
    messages: list[dict[str, str]],
    provider: LLMProvider | str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 650,
    stop: list[str] | None = None,
) -> LLMResponse:
    """
    Universal dispatcher calling /v1/chat/completions for local_llama or openai.
    
    :param messages: Structured list of messages:
                     [{"role": "system", "content": "..."},
                      {"role": "user", "content": "..."},
                      {"role": "assistant", "content": "..."}]
    :param provider: "local_llama" | "openai" (defaults to config.default_provider)
    :param temperature: Generation temperature (0.0 - 1.0)
    :param max_tokens: Maximum tokens in reply
    """
    config = get_llm_config()
    selected_provider = (
        LLMProvider(provider) if provider else config.default_provider
    )

    if selected_provider == LLMProvider.local_llama:
        url = f"{config.local_base_url.rstrip('/')}/chat/completions"
        model_name = config.local_model
        headers = {
            "Content-Type": "application/json",
        }
        timeout = config.local_timeout_seconds
        logger.info(f"[LLM] Sending request to local llama-server ({url}) model={model_name}")

    elif selected_provider == LLMProvider.openai:
        url = f"{config.openai_base_url.rstrip('/')}/chat/completions"
        model_name = config.openai_model
        api_key = config.openai_api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY is not set. Please set the environment variable or pass it in settings."
            )
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        timeout = config.openai_timeout_seconds
        logger.info(f"[LLM] Sending request to OpenAI API ({url}) model={model_name}")

    else:
        raise ValueError(f"Unsupported LLM provider: {selected_provider}")

    payload: dict[str, Any] = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if stop:
        payload["stop"] = stop

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

            choices = data.get("choices", [])
            if not choices:
                raise RuntimeError("LLM returned empty choices array")

            choice = choices[0]
            message_obj = choice.get("message", {})
            reply_text = message_obj.get("content", "").strip()
            finish_reason = choice.get("finish_reason")

            usage = data.get("usage", {})
            total_tokens = usage.get("total_tokens")

            return LLMResponse(
                provider=selected_provider,
                model=model_name,
                reply_text=reply_text,
                tokens_used=total_tokens,
                finish_reason=finish_reason,
                raw_response=data,
            )

        except httpx.ConnectError as exc:
            logger.error(f"[LLM Error] Connection failed to {url}: {exc}")
            if selected_provider == LLMProvider.local_llama:
                raise ConnectionError(
                    f"Не удалось подключиться к локальному llama-server.exe на {config.local_base_url}. "
                    f"Убедитесь, что llama-server запущен и порт 8080 доступен."
                ) from exc
            raise

        except httpx.HTTPStatusError as exc:
            logger.error(f"[LLM Error] HTTP error from {url}: {exc.response.status_code} - {exc.response.text}")
            raise RuntimeError(
                f"Ошибка ответа нейросети {selected_provider}: {exc.response.status_code} {exc.response.text}"
            ) from exc


def generate_reply_sync(
    messages: list[dict[str, str]],
    provider: LLMProvider | str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 650,
) -> LLMResponse:
    """Synchronous wrapper for call_chat_completion."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(
        call_chat_completion(
            messages=messages,
            provider=provider,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    )
