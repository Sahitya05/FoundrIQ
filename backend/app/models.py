from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


ScoredAgentId = Literal["market", "customer", "finance", "competition", "operations"]
AgentId = Literal[ScoredAgentId, "risk"]


class VentureInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    idea: str = Field(..., min_length=2)
    type: str = Field(..., min_length=2)
    location: str = Field(..., min_length=2)
    investment: str = Field(..., min_length=2)
    team: str = Field(..., min_length=2)
    customers: str = Field(..., min_length=2)
    demand: str = Field(..., min_length=2)
    pricing: str = Field(..., min_length=2)
    competitors: str = Field(..., min_length=2)
    capacity: str = Field(..., min_length=2)


class ScoredAgentResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    score: int = Field(..., ge=0, le=100)
    summary: str = Field(..., min_length=1)
    risks: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)

    @field_validator("score", mode="before")
    @classmethod
    def _clamp_score(cls, v: object) -> int:
        try:
            iv = int(float(v))
        except (TypeError, ValueError):
            iv = 50
        return max(0, min(100, iv))


class RiskAgentResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: str = Field(..., min_length=1)
    majorRisks: list[str] = Field(default_factory=list)
    weakAssumptions: list[str] = Field(default_factory=list)
    missingInfo: list[str] = Field(default_factory=list)


class ValidationStep(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1)
    detail: str = Field(..., min_length=1)


class SynthesisResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    feasibilitySummary: str = Field(..., min_length=1)
    opportunityAnalysis: str = Field(..., min_length=1)
    validationPlan: list[ValidationStep] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sessionId: str = Field(default_factory=lambda: uuid4().hex)
    venture: VentureInput
    agents: dict[str, ScoredAgentResult | RiskAgentResult]
    synthesis: SynthesisResult
    generatedAt: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    )


class HealthResponse(BaseModel):
    status: str = "ok"
