"""
Chat 路由 — 對話式策略諮詢（含輸入驗證）
"""
from fastapi import APIRouter
from pydantic import BaseModel
from services.chat_service import answer_question
from middleware.security import validate_chat_input

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/")
def chat(req: ChatRequest):
    """POST /api/chat/ — AI Agent 對話（含 Prompt Injection 防護）"""
    import os
    from middleware.security import validate_chat_input

    # 輸入驗證 + 過濾
    safe_message = validate_chat_input(req.message)
    if safe_message.startswith("[已過濾]"):
        return {"reply": safe_message}

    # Agent 模式：回傳推理過程
    use_bedrock = os.getenv("USE_BEDROCK", "false").lower() == "true"
    if use_bedrock:
        try:
            from services.agent_loop import run_agent
            result = run_agent(safe_message)
            return {
                "reply": result.get("reply", ""),
                "agent_tool_calls": result.get("tool_calls", []),
                "agent_iterations": result.get("iterations", 0),
                "mode": "agent"
            }
        except Exception:
            pass

    reply = answer_question(safe_message)
    return {"reply": reply, "mode": "local"}
