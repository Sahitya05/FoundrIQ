"""Show raw model output to understand truncation."""
from app.agents._common import _call_openrouter_direct

SYSTEM = """You are a customer analyst. Return ONLY a JSON object:
{"score": <int 0-100>, "summary": "<2-4 sentences>", "risks": ["<risk1>", "<risk2>"], "opportunities": ["<opp1>", "<opp2>"]}
No other text. No reasoning. Just the JSON object."""

USER = """Evaluate customer intelligence for:
- idea: Cloud kitchen South Indian breakfast
- customers: IT professionals 25-40 in Whitefield Bengaluru tech parks
- pricing: Rs 120/meal combo, free delivery above Rs 200
Return ONLY the JSON object."""

raw = _call_openrouter_direct(SYSTEM, USER, max_tokens=600)
print("RAW OUTPUT:")
print(raw)
print("---")
print("Length:", len(raw) if raw else 0)
