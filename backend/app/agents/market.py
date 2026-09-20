from __future__ import annotations

import logging
import time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..config import settings
from ..models import ScoredAgentResult
from ._common import invoke_agent_sync, make_openai_model, parse_output

log = logging.getLogger("foundriq.agents.market")


MARKET_SYSTEM_PROMPT = """\
You are the **Market Intelligence Analyst** for FoundrIQ, an agentic venture-intelligence platform.

FoundrIQ's core rule: Don't invest in assumptions. Validate them.

Your job is to read the founder's inputs carefully and produce an honest, structured market-intelligence reading that another founder can act on. You are not a cheerleader and you are not a skeptic — you are an analyst.

## Founder inputs
You will receive exactly four free-text fields (they may be short, long, or loosely written):
  - idea:        the venture in one breath
  - type:        business category / kind
  - location:    where the venture operates (city, corridor, catchment, country)
  - demand:      what demand the founder is counting on (a number, a claim, a story)

## FACTUAL RULES — VIOLATE THESE AND THE FOUNDER GETS HURT

1. YOU DO NOT HAVE INTERNET ACCESS. YOU DO NOT HAVE A SEARCH TOOL.
   - Do NOT invent or imply any external facts you were not given.
   - Do NOT quote market size, population, growth percentages, GMV figures,
     local statistics, per-capita income, competitor counts, penetration rates,
     survey results, or government data — unless such a number is explicitly
     present in the founder's inputs above.

2. CLEARLY LABEL FOUNDER-SUPPLIED CLAIMS as assumptions.
   - If the founder says "100 orders/day", write it as:
     "Founder-supplied demand assumption: 100 orders/day."
   - Never rewrite that into "The market has 100 daily customers" or
     "The city already supports 100/day demand."

3. Distinguish three things explicitly:
   a. Founder-supplied fact / assumption  (label this "Founder states: …")
   b. Your reasoning / inference / pattern recognition
   c. Evidence gaps (things the founder will need to measure outside this tool)

4. Do NOT declare the startup will definitely succeed or definitely fail.
   - No "guaranteed", no "zero risk", no "100% fails".
   - Use conditional language: "holds if…", "weak unless…", "credible only after…".

## ANALYSIS FRAMEWORK — SCORE 0–100

Produce an integer `score` between 0 and 100 that represents MARKET ATTRACTIVENESS
given ONLY the information available.

Score guidance (use the whole range, not the middle):
  - 85–100  Very attractive: clear dense need, weak substitutes, favorable timing
             given the stated inputs, and few structural blockers.
  - 65–84   Attractive with caveats: credible segment and location but category
             noise, weak distribution path, or timing ambiguity.
  - 45–64   Neutral / conditional: plausible idea with at least two unresolved
             structural questions (demand, category maturity, catchment fit…)
  - 25–44   Unattractive fundamentals despite surface appeal.
  -  0–24   Deep structural mismatch in the stated inputs.

Use the score honestly; do NOT compress to 60–80.

## OUTPUT STRUCTURE (MUST MATCH — NO OTHER FIELDS, NO PROSE AROUND IT)

Return ONLY a single JSON object with four keys:

  {
    "score": <integer 0-100>,
    "summary": "<2-4 sentences. Begin with a crisp market reading. Label any founder-supplied numbers as assumptions. Explicitly identify what evidence is missing. One short paragraph, 40–110 words.>",
    "risks": [
      "<concise market-specific risk, actionably written, 1–2 sentences each. 2–4 items.>",
      "…"
    ],
    "opportunities": [
      "<concise market-specific opportunity, actionably written, 1–2 sentences each. 2–4 items.>",
      "…"
    ]
  }

No markdown code fences. No preamble. No "Here is my analysis". No "As an AI…".
Just the JSON object.
"""


MARKET_SYSTEM_PROMPT_COMPACT = """\
You are a market intelligence analyst. Analyze ONLY the founder-supplied inputs — do NOT invent external facts, statistics, or data.
Label founder-supplied claims as assumptions. Distinguish your reasoning from evidence gaps.
Score 0-100 for market attractiveness. Use the whole range.

Return ONLY this JSON (no other text, no markdown):
{"score": <integer 0-100>, "summary": "<2-4 sentences, 40-110 words, label founder assumptions>", "risks": ["<risk 1>", "<risk 2>", "<risk 3>"], "opportunities": ["<opp 1>", "<opp 2>", "<opp 3>"]}
"""


class _MarketAgentPrompt(BaseModel):
    idea: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    location: str = Field(..., min_length=1)
    demand: str = Field(..., min_length=1)


class MarketAgentOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    score: int = Field(..., ge=0, le=100)
    summary: str = Field(..., min_length=1)
    risks: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)

    @field_validator("score", mode="before")
    @classmethod
    def _clamp(cls, v: object) -> int:
        try:
            iv = int(float(v))
        except (TypeError, ValueError):
            iv = 50
        return max(0, min(100, iv))

    @field_validator("risks", "opportunities", mode="after")
    @classmethod
    def _clean_strings(cls, v: list[str]) -> list[str]:
        cleaned = [s.strip() for s in v if isinstance(s, str)]
        cleaned = [s for s in cleaned if s]
        if len(cleaned) > 8:
            cleaned = cleaned[:8]
        return cleaned


def _build_user_prompt(data: _MarketAgentPrompt) -> str:
    return (
        "Evaluate market attractiveness for the venture described below.\n\n"
        f"## Founder inputs\n"
        f"- idea: {data.idea}\n"
        f"- type: {data.type}\n"
        f"- location: {data.location}\n"
        f"- demand (founder-supplied assumption): {data.demand}\n\n"
        "Return ONLY the JSON object matching the required schema. No other text."
    )


def degraded_result(reason: str) -> ScoredAgentResult:
    return ScoredAgentResult(
        score=50,
        summary=f"⚠ Market analysis degraded: {reason}",
        risks=[],
        opportunities=[],
    )


def run_market_agent(
    idea: str,
    type_: str,
    location: str,
    demand: str,
    max_retries: int = 1,
) -> ScoredAgentResult:
    t0 = time.perf_counter()
    provider = settings.detect_provider()
    log.info(
        "market-agent start provider=%s model=%s",
        provider,
        settings.MODEL_NAME,
    )

    if not settings.provider_ready():
        return degraded_result("Model provider is not configured.")

    inputs = _MarketAgentPrompt(idea=idea, type=type_, location=location, demand=demand)
    user_prompt = _build_user_prompt(inputs)

    from strands import Agent

    last_error: Optional[str] = None

    for attempt in range(1 + max(0, max_retries)):
        try:
            model = make_openai_model()
            agent = Agent(
                model=model,
                system_prompt=MARKET_SYSTEM_PROMPT,
                tools=[],
            )
            structured, raw_text = invoke_agent_sync(
                    agent, user_prompt, MarketAgentOutput,
                    system_prompt=MARKET_SYSTEM_PROMPT_COMPACT,
                    max_tokens=600,
                )
            parsed: Optional[MarketAgentOutput] = None

            if structured is not None:
                parsed = parse_output(structured, MarketAgentOutput, "structured output invalid", "market-agent")
                if parsed is None:
                    last_error = "structured output parse failed"
            elif raw_text is not None:
                log.warning("market-agent no structured_output, trying raw text parse (attempt %d)", attempt + 1)
                parsed = parse_output(raw_text, MarketAgentOutput, "raw text JSON invalid", "market-agent")
                if parsed is None:
                    last_error = "raw text parse failed"

            if parsed is not None and len(parsed.summary) > 4:
                log.info(
                    "market-agent complete attempt=%d score=%d dur_ms=%d summary_chars=%d",
                    attempt + 1,
                    parsed.score,
                    int((time.perf_counter() - t0) * 1000),
                    len(parsed.summary),
                )
                return ScoredAgentResult(
                    score=parsed.score,
                    summary=parsed.summary,
                    risks=parsed.risks,
                    opportunities=parsed.opportunities,
                )
        except Exception as e:  # noqa: BLE001
            last_error = f"invoke: {type(e).__name__}: {e}"
            log.error("market-agent attempt=%d failed: %s", attempt + 1, last_error)
            if attempt < max_retries:
                time.sleep(0.3)

    log.error("market-agent all attempts exhausted")
    return degraded_result(last_error or "model did not return usable structured output")
