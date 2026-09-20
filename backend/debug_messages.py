"""Debug: inspect agent.messages structure after MaxTokensReachedException."""
from app.config import settings
from app.agents._common import make_openai_model
from strands import Agent

SYSTEM = (
    "You are a test analyst. "
    "Return ONLY a JSON object: "
    '{"score": 72, "summary": "test summary here", "risks": ["risk1"], "opportunities": ["opp1"]}'
)

model = make_openai_model(max_tokens=800)
agent = Agent(model=model, system_prompt=SYSTEM, tools=[])

try:
    from strands._async import run_async
    result = run_async(lambda: agent.invoke_async("Evaluate this test venture."))
    print("SUCCESS result type:", type(result).__name__)
    print("structured_output:", getattr(result, "structured_output", None))
    out = (
        getattr(result, "final_output", None)
        or getattr(result, "output", None)
        or str(result)
    )
    print("raw output:", str(out)[:400])
except Exception as e:
    print("Exception:", type(e).__name__, str(e)[:200])
    print("Messages count:", len(agent.messages))
    for i, m in enumerate(agent.messages):
        role = m.get("role")
        content = m.get("content")
        print(f"  msg[{i}] role={role} content_type={type(content).__name__}")
        if isinstance(content, str):
            print(f"    text preview: {content[:300]}")
        elif isinstance(content, list):
            for j, blk in enumerate(content):
                if isinstance(blk, dict):
                    print(f"    block[{j}]: {str(blk)[:200]}")
                else:
                    print(f"    block[{j}] type={type(blk).__name__}: {str(blk)[:200]}")
