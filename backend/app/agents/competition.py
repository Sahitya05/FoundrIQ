from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..models import ScoredAgentResult
from ._common import invoke_agent_sync, make_openai_model, parse_output

log = logging.getLogger("foundriq.agents.competition")


COMPETITION_SYSTEM_PROMPT = """\
You are the Competition Intelligence Analyst for FoundrIQ.

Core rule: Don't invest in assumptions. Validate them.

Analyze ONLY the founder-supplied information.
You do not have internet access and must not invent competitor facts,
competitor counts, market shares, pricing benchmarks, or company information.

Evaluate:
- stated competitor landscape
- differentiation
- pricing position
- substitute risk
- barriers to differentiation

Clearly distinguish founder claims, reasoning, and evidence gaps.

Score COMPETITIVE ATTRACTIVENESS from 0 to 100.

Return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "summary": "<2-4 sentences, 40-110 words>",
  "risks": ["<risk>", "<risk>", "<risk>"],
  "opportunities": ["<opportunity>", "<opportunity>", "<opportunity>"]
}
"""


class CompetitionInput(BaseModel):
    idea: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    location: str = Field(..., min_length=1)
    competitors: str = Field(..., min_length=1)
    pricing: str = Field(..., min_length=1)


class CompetitionOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    score: int = Field(..., ge=0, le=100)
    summary: str = Field(..., min_length=1)
    risks: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)

    @field_validator("score", mode="before")
    @classmethod
    def clamp_score(cls, value: object) -> int:
        try:
            return max(0, min(100, int(float(value))))
        except (TypeError, ValueError):
            return 50

    @field_validator("risks", "opportunities", mode="after")
    @classmethod
    def clean_items(cls, value: list[str]) -> list[str]:
        return [x.strip() for x in value if isinstance(x, str) and x.strip()][:8]


def _prompt(data: CompetitionInput) -> str:
    return f"""Evaluate competitive attractiveness.

Founder inputs:
- idea: {data.idea}
- type: {data.type}
- location: {data.location}
- competitors: {data.competitors}
- pricing: {data.pricing}

Treat the competitor description and pricing as founder-supplied information.
Do not invent external competitor facts.

Return ONLY the required JSON object.
"""


def _degraded(reason: str) -> ScoredAgentResult:
    return ScoredAgentResult(
        score=50,
        summary=f"Competition analysis degraded: {reason}",
        risks=[],
        opportunities=[],
    )


def run_competition_agent(
    idea: str,
    type_: str,
    location: str,
    competitors: str,
    pricing: str,
    max_retries: int = 1,
) -> ScoredAgentResult:
    data = CompetitionInput(
        idea=idea,
        type=type_,
        location=location,
        competitors=competitors,
        pricing=pricing,
    )

    last_error: Optional[str] = None

    for attempt in range(1 + max(0, max_retries)):
        try:
            model = make_openai_model()
            from strands import Agent

            agent = Agent(
                model=model,
                system_prompt=COMPETITION_SYSTEM_PROMPT,
                tools=[],
            )

            _, raw = invoke_agent_sync(
                agent,
                _prompt(data),
                CompetitionOutput,
                system_prompt=COMPETITION_SYSTEM_PROMPT,
                max_tokens=600,
            )

            if raw:
                parsed = parse_output(
                    raw,
                    CompetitionOutput,
                    "competition output invalid",
                    "competition-agent",
                )
                if parsed is not None:
                    return ScoredAgentResult(
                        score=parsed.score,
                        summary=parsed.summary,
                        risks=parsed.risks,
                        opportunities=parsed.opportunities,
                    )

            last_error = "model did not return usable competition JSON"

        except Exception as exc:
            last_error = f"{type(exc).__name__}: {exc}"
            log.error(
                "competition attempt=%d failed: %s",
                attempt + 1,
                last_error,
            )

    return _degraded(last_error or "unknown error")