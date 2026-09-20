"""Show complete raw API response to understand None content."""
import json, urllib.request
from app.config import settings

SYSTEM = """You are a customer analyst. Return ONLY a JSON object:
{"score": <int 0-100>, "summary": "<2 sentences>", "risks": ["risk1", "risk2"], "opportunities": ["opp1", "opp2"]}
No other text."""

USER = """idea: Cloud kitchen South Indian breakfast in Whitefield Bengaluru
customers: IT professionals 25-40 in tech parks
pricing: Rs 120/meal"""

payload = json.dumps({
    "model": settings.MODEL_NAME,
    "messages": [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": USER},
    ],
    "max_tokens": 400,
    "temperature": 0.25,
}).encode("utf-8")

req = urllib.request.Request(
    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
    data=payload,
    headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}", "Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read())

print("Model:", data.get("model"))
print("Finish:", data.get("choices", [{}])[0].get("finish_reason"))
msg = data.get("choices", [{}])[0].get("message", {})
print("Message keys:", list(msg.keys()))
print("content:", repr(msg.get("content", "MISSING"))[:200])
for k, v in msg.items():
    if k != "content":
        print(f"  {k}:", repr(str(v))[:200])
