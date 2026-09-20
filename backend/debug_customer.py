"""Quick test of customer agent with the updated common invoke logic."""
from app.agents.customer import run_customer_agent

result = run_customer_agent(
    idea="Cloud kitchen delivering South Indian breakfast to IT office corridors",
    type_="Food & Beverage / Cloud Kitchen",
    location="Whitefield Bengaluru",
    customers="IT professionals aged 25-40 working in tech parks who prefer quick healthy traditional breakfast",
    pricing="Rs 120 per meal combo free delivery above Rs 200",
)
print("score:", result.score)
print("summary:", result.summary[:200])
print("risks:", result.risks)
print("opportunities:", result.opportunities)
