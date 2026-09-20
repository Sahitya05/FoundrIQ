from __future__ import annotations

import logging
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .models import (
    AnalyzeResponse,
    HealthResponse,
    RiskAgentResult,
    ScoredAgentResult,
    SynthesisResult,
    ValidationStep,
    VentureInput,
)

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("foundriq")


app = FastAPI(
    title="FoundrIQ Venture Intelligence API",
    version="0.1.0-stage5",
    description="Local hackathon backend. /api/health + /api/agents/market/customer/finance/competition/operations active.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["X-Request-ID"],
    max_age=3600,
)


class MarketAgentRequest(BaseModel):
    idea: str = Field(..., min_length=2)
    type: str = Field(..., min_length=2)
    location: str = Field(..., min_length=2)
    demand: str = Field(..., min_length=2)


class MarketAgentResponse(BaseModel):
    agent: Literal["market"] = "market"
    result: ScoredAgentResult


class CustomerAgentRequest(BaseModel):
    idea: str = Field(..., min_length=2)
    type: str = Field(..., min_length=2)
    location: str = Field(..., min_length=2)
    customers: str = Field(..., min_length=2)
    pricing: str = Field(..., min_length=2)


class CustomerAgentResponse(BaseModel):
    agent: Literal["customer"] = "customer"
    result: ScoredAgentResult


class FinanceAgentRequest(BaseModel):
    idea: str = Field(..., min_length=2)
    type: str = Field(..., min_length=2)
    investment: str = Field(..., min_length=2)
    pricing: str = Field(..., min_length=2)
    demand: str = Field(..., min_length=2)
    team: str = Field(..., min_length=2)
    capacity: str = Field(..., min_length=2)


class FinanceAgentResponse(BaseModel):
    agent: Literal["finance"] = "finance"
    result: ScoredAgentResult


class CompetitionAgentRequest(BaseModel):
    idea: str = Field(..., min_length=2)
    type: str = Field(..., min_length=2)
    location: str = Field(..., min_length=2)
    competitors: str = Field(..., min_length=2)
    pricing: str = Field(..., min_length=2)


class CompetitionAgentResponse(BaseModel):
    agent: Literal["competition"] = "competition"
    result: ScoredAgentResult


class OperationsAgentRequest(BaseModel):
    idea: str = Field(..., min_length=2)
    type: str = Field(..., min_length=2)
    location: str = Field(..., min_length=2)
    demand: str = Field(..., min_length=2)
    team: str = Field(..., min_length=2)
    capacity: str = Field(..., min_length=2)


class OperationsAgentResponse(BaseModel):
    agent: Literal["operations"] = "operations"
    result: ScoredAgentResult


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/api/agents/market", response_model=MarketAgentResponse, tags=["agents"])
def run_market(req: MarketAgentRequest) -> MarketAgentResponse:
    if not settings.provider_ready():
        logger.warning("market-agent endpoint hit but provider not configured")
        raise HTTPException(
            status_code=503,
            detail="Market Intelligence provider is not configured.",
        )
    from .agents.market import run_market_agent

    logger.info(
        "market-agent endpoint request idea_len=%d type_len=%d location_len=%d demand_len=%d",
        len(req.idea),
        len(req.type),
        len(req.location),
        len(req.demand),
    )
    result = run_market_agent(req.idea, req.type, req.location, req.demand)
    logger.info("market-agent endpoint response score=%d", result.score)
    return MarketAgentResponse(result=result)


@app.post("/api/agents/customer", response_model=CustomerAgentResponse, tags=["agents"])
def run_customer(req: CustomerAgentRequest) -> CustomerAgentResponse:
    if not settings.provider_ready():
        logger.warning("customer-agent endpoint hit but provider not configured")
        raise HTTPException(
            status_code=503,
            detail="Customer Intelligence provider is not configured.",
        )
    from .agents.customer import run_customer_agent

    logger.info(
        "customer-agent endpoint request idea_len=%d type_len=%d location_len=%d customers_len=%d pricing_len=%d",
        len(req.idea),
        len(req.type),
        len(req.location),
        len(req.customers),
        len(req.pricing),
    )
    result = run_customer_agent(req.idea, req.type, req.location, req.customers, req.pricing)
    logger.info("customer-agent endpoint response score=%d", result.score)
    return CustomerAgentResponse(result=result)


@app.post("/api/agents/finance", response_model=FinanceAgentResponse, tags=["agents"])
def run_finance(req: FinanceAgentRequest) -> FinanceAgentResponse:
    if not settings.provider_ready():
        logger.warning("finance-agent endpoint hit but provider not configured")
        raise HTTPException(
            status_code=503,
            detail="Financial Intelligence provider is not configured.",
        )
    from .agents.finance import run_finance_agent

    logger.info(
        "finance-agent endpoint request idea_len=%d type_len=%d investment_len=%d pricing_len=%d demand_len=%d team_len=%d capacity_len=%d",
        len(req.idea),
        len(req.type),
        len(req.investment),
        len(req.pricing),
        len(req.demand),
        len(req.team),
        len(req.capacity),
    )
    result = run_finance_agent(req.idea, req.type, req.investment, req.pricing, req.demand, req.team, req.capacity)
    logger.info("finance-agent endpoint response score=%d", result.score)
    return FinanceAgentResponse(result=result)


@app.post("/api/agents/competition", response_model=CompetitionAgentResponse, tags=["agents"])
def run_competition(req: CompetitionAgentRequest) -> CompetitionAgentResponse:
    if not settings.provider_ready():
        logger.warning("competition-agent endpoint hit but provider not configured")
        raise HTTPException(
            status_code=503,
            detail="Competition Intelligence provider is not configured.",
        )
    from .agents.competition import run_competition_agent

    logger.info(
        "competition-agent endpoint request idea_len=%d type_len=%d location_len=%d competitors_len=%d pricing_len=%d",
        len(req.idea),
        len(req.type),
        len(req.location),
        len(req.competitors),
        len(req.pricing),
    )
    result = run_competition_agent(req.idea, req.type, req.location, req.competitors, req.pricing)
    logger.info("competition-agent endpoint response score=%d", result.score)
    return CompetitionAgentResponse(result=result)


@app.post("/api/agents/operations", response_model=OperationsAgentResponse, tags=["agents"])
def run_operations(req: OperationsAgentRequest) -> OperationsAgentResponse:
    if not settings.provider_ready():
        logger.warning("operations-agent endpoint hit but provider not configured")
        raise HTTPException(
            status_code=503,
            detail="Operations Intelligence provider is not configured.",
        )
    from .agents.operations import run_operations_agent

    logger.info(
        "operations-agent endpoint request idea_len=%d type_len=%d location_len=%d demand_len=%d team_len=%d capacity_len=%d",
        len(req.idea),
        len(req.type),
        len(req.location),
        len(req.demand),
        len(req.team),
        len(req.capacity),
    )
    result = run_operations_agent(req.idea, req.type, req.location, req.demand, req.team, req.capacity)
    logger.info("operations-agent endpoint response score=%d", result.score)
    return OperationsAgentResponse(result=result)

@app.post("/api/analyze", response_model=AnalyzeResponse, tags=["analysis"])
def analyze_venture(req: VentureInput) -> AnalyzeResponse:
    """
    Run the complete FoundrIQ venture analysis.

    Five specialist AI agents analyze the venture independently.
    Risk and synthesis are then derived from their actual outputs.
    """

    logger.info("full venture analysis started")

    try:
        from .agents.market import run_market_agent
        from .agents.customer import run_customer_agent
        from .agents.finance import run_finance_agent
        from .agents.competition import run_competition_agent
        from .agents.operations import run_operations_agent

        market = run_market_agent(
            req.idea,
            req.type,
            req.location,
            req.demand,
        )

        customer = run_customer_agent(
            req.idea,
            req.type,
            req.location,
            req.customers,
            req.pricing,
        )

        finance = run_finance_agent(
            req.idea,
            req.type,
            req.investment,
            req.pricing,
            req.demand,
            req.team,
            req.capacity,
        )

        competition = run_competition_agent(
            req.idea,
            req.type,
            req.location,
            req.competitors,
            req.pricing,
        )

        operations = run_operations_agent(
            req.idea,
            req.type,
            req.location,
            req.demand,
            req.team,
            req.capacity,
        )

    except Exception as exc:
        logger.exception("full venture analysis failed")
        raise HTTPException(
            status_code=500,
            detail=f"Venture analysis failed: {type(exc).__name__}",
        ) from exc

    agents = {
        "market": market,
        "customer": customer,
        "finance": finance,
        "competition": competition,
        "operations": operations,
    }

    # ---------------------------------------------------------
    # Aggregate the actual AI findings.
    # Nothing here is invented: these are derived from the
    # specialist agents' returned risks/opportunities.
    # ---------------------------------------------------------

    all_risks: list[str] = []
    all_opportunities: list[str] = []

    for result in agents.values():
        all_risks.extend(result.risks)
        all_opportunities.extend(result.opportunities)

    # Keep the report concise for the frontend.
    major_risks = []
    seen_risks: set[str] = set()

    for risk in all_risks:
        normalized = risk.strip()
        key = normalized.lower()

        if normalized and key not in seen_risks:
            seen_risks.add(key)
            major_risks.append(normalized)

        if len(major_risks) >= 6:
            break

    opportunities = []
    seen_opportunities: set[str] = set()

    for opportunity in all_opportunities:
        normalized = opportunity.strip()
        key = normalized.lower()

        if normalized and key not in seen_opportunities:
            seen_opportunities.add(key)
            opportunities.append(normalized)

        if len(opportunities) >= 6:
            break

    # ---------------------------------------------------------
    # Weak assumptions are taken directly from the venture
    # inputs that the agents were asked to validate.
    # ---------------------------------------------------------

    weak_assumptions = [
        f"Demand assumption: {req.demand}",
        f"Pricing assumption: {req.pricing}",
        f"Customer assumption: {req.customers}",
        f"Competitive assumption: {req.competitors}",
        f"Capacity assumption: {req.capacity}",
    ]

    missing_info = [
        "Customer validation evidence",
        "Observed demand or pre-orders",
        "Validated unit economics",
        "Competitor pricing and positioning evidence",
        "Operational capacity validation",
    ]

    risk_result = RiskAgentResult(
        summary=(
            f"FoundrIQ identified {len(major_risks)} material risk signals "
            f"across the five specialist analyses. The venture should validate "
            f"its strongest assumptions before committing significant capital."
        ),
        majorRisks=major_risks,
        weakAssumptions=weak_assumptions,
        missingInfo=missing_info,
    )

    # ---------------------------------------------------------
    # Calculate an overall analytical signal from the five
    # independent specialist scores.
    # ---------------------------------------------------------

    scores = [
        market.score,
        customer.score,
        finance.score,
        competition.score,
        operations.score,
    ]

    overall_score = round(sum(scores) / len(scores))

    if overall_score >= 75:
        feasibility = (
            f"The five specialist agents produce an overall feasibility signal "
            f"of {overall_score}/100. The venture shows several encouraging "
            f"signals, but the assumptions identified below still require "
            f"real-world validation before major investment."
        )
    elif overall_score >= 50:
        feasibility = (
            f"The five specialist agents produce an overall feasibility signal "
            f"of {overall_score}/100. The concept is conditionally plausible, "
            f"but multiple commercial or execution assumptions remain unresolved."
        )
    else:
        feasibility = (
            f"The five specialist agents produce an overall feasibility signal "
            f"of {overall_score}/100. The analysis exposes significant unresolved "
            f"assumptions that should be tested before substantial investment."
        )

    opportunity_text = (
        "The specialist analyses identify the following potential opportunities: "
        + (" ".join(opportunities) if opportunities else
           "No clear opportunity signals were returned; additional validation is needed.")
    )

    validation_steps = [
        ValidationStep(
            title="Validate customer demand",
            detail="Interview target customers and test whether the stated problem is urgent enough to drive purchase behavior.",
        ),
        ValidationStep(
            title="Test willingness to pay",
            detail="Run a pricing experiment or collect paid/pre-order commitments rather than relying only on stated pricing assumptions.",
        ),
        ValidationStep(
            title="Validate competitive differentiation",
            detail="Compare the proposed offering against the competitors and substitutes identified by the founder.",
        ),
        ValidationStep(
            title="Validate unit economics",
            detail="Measure acquisition cost, contribution margin, expected order volume, and operating costs using real evidence.",
        ),
        ValidationStep(
            title="Stress-test operations",
            detail="Run a small pilot to determine whether the stated team and capacity can support the expected demand.",
        ),
    ]

    synthesis = SynthesisResult(
        feasibilitySummary=feasibility,
        opportunityAnalysis=opportunity_text,
        validationPlan=validation_steps,
    )

    logger.info(
        "full venture analysis completed overall_score=%d",
        overall_score,
    )

    return AnalyzeResponse(
        venture=req,
        agents=agents | {"risk": risk_result},
        synthesis=synthesis,
    )