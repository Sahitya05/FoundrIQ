"""Shared utilities for all FoundrIQ Strands agents."""
from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any, Optional, Type, TypeVar

from pydantic import BaseModel

from ..config import settings

log = logging.getLogger("foundriq.agents._common")

M = TypeVar("M", bound=BaseModel)


def make_openai_model(max_tokens: int = 800, temperature: float = 0.25):
    """Build a Strands OpenAIModel from the current settings (kept for Strands fallback)."""
    from strands.models.openai import OpenAIModel

    client_args = settings.model_client_args()
    if not client_args.get("api_key"):
        raise RuntimeError("Model provider not configured: missing api_key")
    return OpenAIModel(
        client_args=client_args,
        model_id=settings.MODEL_NAME,
        params={
            "max_tokens": max_tokens,
            "temperature": temperature,
        },
    )


def _extract_json_from_text(text: str) -> Optional[dict]:
    """
    Best-effort extraction of a JSON object from model output that may include
    inline reasoning (thinking-model output) before the final JSON block.
    Tries the LAST complete { … } first, then the first one.
    """
    if not text:
        return None

    # 1. Direct parse
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # 2. Strip markdown code fences
    stripped = re.sub(r"```(?:json)?\s*|\s*```", "", text).strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    # 3. LAST complete { … } block (reasoning models put JSON at end)
    last_close = text.rfind("}")
    if last_close != -1:
        depth = 0
        start = -1
        for i in range(last_close, -1, -1):
            if text[i] == "}":
                depth += 1
            elif text[i] == "{":
                depth -= 1
                if depth == 0:
                    start = i
                    break
        if start != -1:
            try:
                return json.loads(text[start: last_close + 1])
            except json.JSONDecodeError:
                pass

    # 4. FIRST complete { … } block
    first_open = text.find("{")
    if first_open != -1:
        depth = 0
        end = -1
        for i, ch in enumerate(text[first_open:], first_open):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break
        if end != -1:
            try:
                return json.loads(text[first_open: end + 1])
            except json.JSONDecodeError:
                pass

    return None


def _call_openrouter_direct(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 1200,
    temperature: float = 0.25,
) -> Optional[str]:
    """
    Call the chat completions API directly via urllib.
    Bypasses Strands agent-loop overhead so the full token budget goes to the response.
    Works for both OpenRouter and OpenAI providers.
    Returns the text content string, or None on any failure.
    """
    provider = settings.detect_provider()
    if provider == "openrouter":
        api_key = settings.OPENROUTER_API_KEY
        base_url = settings.OPENROUTER_BASE_URL
        model_id = settings.MODEL_NAME
    elif provider == "openai":
        api_key = settings.OPENAI_API_KEY
        base_url = "https://api.openai.com/v1"
        model_id = settings.MODEL_NAME
    else:
        return None

    if not api_key:
        return None

    payload = json.dumps({
        "model": model_id,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        choices = data.get("choices", [])
        if not choices:
            log.warning("_call_openrouter_direct: empty choices")
            return None
        message = choices[0].get("message", {})
        content = message.get("content") or ""
        # Some reasoning models put output in "reasoning" when content is empty
        if not content:
            content = message.get("reasoning") or message.get("reasoning_content") or ""
        finish = choices[0].get("finish_reason", "unknown")
        log.info(
            "_call_openrouter_direct: model=%s finish=%s chars=%d",
            data.get("model", "?"),
            finish,
            len(content),
        )
        if finish == "length":
            log.warning("_call_openrouter_direct: finish_reason=length (output truncated)")
        return content or None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:400]
        log.error("_call_openrouter_direct HTTP %d: %s", e.code, body)
        return None
    except Exception as e:  # noqa: BLE001
        log.error("_call_openrouter_direct error: %s", e)
        return None


def _extract_partial_text_from_agent(agent: Any) -> Optional[str]:
    """Extract the last assistant text from agent.messages (post MaxTokensReachedException)."""
    try:
        messages = getattr(agent, "messages", None)
        if not messages:
            return None
        for msg in reversed(messages):
            role = msg.get("role") if isinstance(msg, dict) else getattr(msg, "role", None)
            if role != "assistant":
                continue
            content = msg.get("content") if isinstance(msg, dict) else getattr(msg, "content", None)
            if content is None:
                continue
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                texts = [
                    (b.get("text", "") if isinstance(b, dict) and b.get("type") == "text"
                     else b if isinstance(b, str)
                     else getattr(b, "text", ""))
                    for b in content
                ]
                combined = " ".join(t for t in texts if t).strip()
                if combined:
                    return combined
    except Exception as e:  # noqa: BLE001
        log.debug("_extract_partial_text_from_agent error: %s", e)
    return None


def invoke_agent_sync(
    agent: Any,
    prompt: str,
    output_model: Type[M],
    *,
    system_prompt: str = "",
    max_tokens: int = 1200,
) -> tuple[Optional[M], Optional[str]]:
    """
    Invoke the model and return (structured_output, raw_text).

    Primary path: call the provider API directly (bypasses Strands overhead so the
    full max_tokens budget is available for the response — critical for free/small models).

    Fallback: use the Strands Agent, catching MaxTokensReachedException and attempting
    partial text recovery from agent.messages.

    structured_output is always None; callers use parse_output() on the raw_text.
    """
    # --- Primary path: direct HTTP call ---
    if system_prompt and settings.provider_ready():
        raw = _call_openrouter_direct(
            system_prompt=system_prompt,
            user_prompt=prompt,
            max_tokens=max_tokens,
        )
        if raw:
            return None, raw

    # --- Fallback: Strands Agent ---
    log.warning("invoke_agent_sync: direct call failed, falling back to Strands Agent")
    try:
        from strands._async import run_async
    except ImportError:  # pragma: no cover
        run_async = None

    partial_agent_ref: list[Any] = []

    def _do_invoke():
        partial_agent_ref.append(agent)
        return agent.invoke_async(prompt)

    try:
        if run_async is not None:
            agent_result = run_async(_do_invoke)
            raw_text = (
                getattr(agent_result, "final_output", None)
                or getattr(agent_result, "output", None)
                or str(agent_result)
            )
            return None, raw_text
        else:
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", DeprecationWarning)
                agent_result = agent(prompt)
                return None, str(agent_result)
    except Exception as exc:  # noqa: BLE001
        exc_name = type(exc).__name__
        if "MaxTokensReached" in exc_name or "MaxTokensReached" in str(exc):
            log.warning("Strands fallback caught %s, attempting partial recovery", exc_name)
            a = partial_agent_ref[0] if partial_agent_ref else agent
            partial = _extract_partial_text_from_agent(a)
            if partial:
                log.info("Partial text recovered (%d chars)", len(partial))
                return None, partial
            return None, None
        raise


def parse_output(
    raw_output: Any,
    output_model: Type[M],
    degraded_reason: str,
    agent_name: str,
) -> Optional[M]:
    """
    Parse raw_output (model instance, dict, or raw string) into output_model.
    Returns None on failure; caller decides whether to retry or degrade.
    """
    if isinstance(raw_output, output_model):
        return raw_output

    if isinstance(raw_output, dict):
        try:
            return output_model.model_validate(raw_output)
        except Exception as e:  # noqa: BLE001
            log.warning("%s dict-parse failed: %s", agent_name, e)
            return None

    if isinstance(raw_output, str):
        extracted = _extract_json_from_text(raw_output)
        if extracted is not None:
            try:
                return output_model.model_validate(extracted)
            except Exception as e:  # noqa: BLE001
                log.warning("%s model_validate failed: %s", agent_name, e)
        else:
            log.warning("%s no JSON found in text (len=%d)", agent_name, len(raw_output))

    return None
