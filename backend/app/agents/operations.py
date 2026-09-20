from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..models import ScoredAgentResult
from ._common import invoke_agent_sync, make_openai_model, parse_output

log = logging.getLogger("foundriq.agents.operations")


OPERATIONS_SYSTEM_PROMPT = """\
You are the Operations Intelligence Analyst for FoundrIQ.

Core rule: Don't invest in assumptions. Validate them.

Analyze ONLY founder-supplied inputs. Never invent operational statistics,
labor costs, supplier facts, logistics facts, capacity benchmarks, or external data.

Evaluate:
- team capacity
- operational capacity versus stated demand
- delivery complexity
- execution bottlenecks
- location-related operational constraints
- scalability risks

Treat all founder claims as assumptions.
Use conditional reasoning and identify evidence gaps.

Score OPERATIONAL READINESS from 0 to 100.

Return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "summary": "<2-4 sentences, 40-110 words>",
  "risks": ["<risk>", "<risk>", "<risk>"],
  "opportunities": ["<opportunity>", "<opportunity>", "<opportunity>"]
}
"""


class OperationsInput(BaseModel):
    idea: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    location: str = Field(..., min_length=1)
    demand: str = Field(..., min_length=1)
    team: str = Field(..., min_length=1)
    capacity: str = Field(..., min_length=1)


class OperationsOutput(BaseModel):
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


def _prompt(data: OperationsInput) -> str:
    return f"""Evaluate operational readiness.

Founder inputs:
- idea: {data.idea}
- type: {data.type}
- location: {data.location}
- demand: {data.demand}
- team: {data.team}
- capacity: {data.capacity}

Treat all claims and numbers as founder-supplied assumptions.
Do not invent external operational facts.

Return ONLY the required JSON object.
"""


def _degraded(reason: str) -> ScoredAgentResult:
    return ScoredAgentResult(
        score=50,
        summary=f"Operations analysis degraded: {reason}",
        risks=[],
        opportunities=[],
    )


def run_operations_agent(
    idea: str,
    type_: str,
    location: str,
    demand: str,
    team: str,
    capacity: str,
    max_retries: int = 1,
) -> ScoredAgentResult:
    data = OperationsInput(
        idea=idea,
        type=type_,
        location=location,
        demand=demand,
        team=team,
        capacity=capacity,
    )

    last_error: Optional[str] = None

    for attempt in range(1 + max(0, max_retries)):
        try:
            model = make_openai_model()
            from strands import Agent

            agent = Agent(
                model=model,
                system_prompt=OPERATIONS_SYSTEM_PROMPT,
                tools=[],
            )

            _, raw = invoke_agent_sync(
                agent,
                _prompt(data),
                OperationsOutput,
                system_prompt=OPERATIONS_SYSTEM_PROMPT,
                max_tokens=600,
            )

            if raw:
                parsed = parse_output(
                    raw,
                    OperationsOutput,
                    "operations output invalid",
                    "operations-agent",
                )
                if parsed is not None:
                    return ScoredAgentResult(
                        score=parsed.score,
                        summary=parsed.summary,
                        risks=parsed.risks,
                        opportunities=parsed.opportunities,
                    )

            last_error = "model did not return usable operations JSON"

        except Exception as exc:
            last_error = f"{type(exc).__name__}: {exc}"
            log.error(
                "operations attempt=%d failed: %s",
                attempt + 1,
                last_error,
            )

    return _degraded(last_error or "unknown error")