"""Check what model openrouter/free resolves to and what token limit it has."""
import urllib.request, json

from app.config import settings

headers = {
    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
}

payload = json.dumps({
    "model": settings.MODEL_NAME,
    "messages": [{"role": "user", "content": "Say: hello"}],
    "max_tokens": 20,
}).encode()

req = urllib.request.Request(
    "https://openrouter.ai/api/v1/chat/completions",
    data=payload,
    headers=headers,
    method="POST",
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read())

print("Model used:", data.get("model"))
print("Usage:", data.get("usage"))
print("Choices:", data.get("choices", [{}])[0].get("message", {}).get("content", "")[:100])
