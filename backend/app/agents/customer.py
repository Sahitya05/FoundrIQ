from __future__ import annotations

import logging
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..models import ScoredAgentResult
from ._common import invoke_agent_sync, make_openai_model, parse_output

log = logging.getLogger("foundriq.agents.customer")


CUSTOMER_SYSTEM_PROMPT = """\
You are the Customer Intelligence Analyst for FoundrIQ.

Core rule: Don't invest in assumptions. Validate them.

Analyze ONLY the founder-supplied information. Do not invent statistics,
customer counts, demographics, survey results, market research, or external facts.

Evaluate:
- clarity of the target customer
- strength of the stated customer problem
- customer accessibility
- willingness-to-pay signals
- mismatch between customer, pricing, and venture type

Clearly label founder claims as assumptions.
Distinguish reasoning from evidence gaps.
Do not guarantee success or failure.

Score CUSTOMER ATTRACTIVENESS from 0 to 100.

Return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "summary": "<2-4 sentences, 40-110 words>",
  "risks": ["<risk>", "<risk>", "<risk>"],
  "opportunities": ["<opportunity>", "<opportunity>", "<opportunity>"]
}
"""


class CustomerInput(BaseModel):
    idea: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    location: str = Field(..., min_length=1)
    customers: str = Field(..., min_length=1)
    pricing: str = Field(..., min_length=1)


class CustomerOutput(BaseModel):
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


def _prompt(data: CustomerInput) -> str:
    return f"""Evaluate customer attractiveness.

Founder inputs:
- idea: {data.idea}
- type: {data.type}
- location: {data.location}
- customers: {data.customers}
- pricing: {data.pricing}

Treat customer and pricing claims as founder-supplied assumptions.
Return ONLY the required JSON object.
"""


def _degraded(reason: str) -> ScoredAgentResult:
    return ScoredAgentResult(
        score=50,
        summary=f"Customer analysis degraded: {reason}",
        risks=[],
        opportunities=[],
    )


def run_customer_agent(
    idea: str,
    type_: str,
    location: str,
    customers: str,
    pricing: str,
    max_retries: int = 1,
) -> ScoredAgentResult:
    data = CustomerInput(
        idea=idea,
        type=type_,
        location=location,
        customers=customers,
        pricing=pricing,
    )

    last_error: Optional[str] = None

    for attempt in range(1 + max(0, max_retries)):
        try:
            model = make_openai_model()
            from strands import Agent

            agent = Agent(
                model=model,
                system_prompt=CUSTOMER_SYSTEM_PROMPT,
                tools=[],
            )

            _, raw = invoke_agent_sync(
                agent,
                _prompt(data),
                CustomerOutput,
                system_prompt=CUSTOMER_SYSTEM_PROMPT,
                max_tokens=600,
            )

            if raw:
                parsed = parse_output(
                    raw,
                    CustomerOutput,
                    "customer output invalid",
                    "customer-agent",
                )
                if parsed is not None:
                    return ScoredAgentResult(
                        score=parsed.score,
                        summary=parsed.summary,
                        risks=parsed.risks,
                        opportunities=parsed.opportunities,
                    )

            last_error = "model did not return usable customer JSON"

        except Exception as exc:
            last_error = f"{type(exc).__name__}: {exc}"
            log.error("customer attempt=%d failed: %s", attempt + 1, last_error)

    return _degraded(last_error or "unknown error")