"""
Chat 路由 — 對話式策略諮詢
"""
from fastapi import APIRouter
from pydantic import BaseModel
from services.chat_service import answer_question

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/")
def chat(req: ChatRequest):
    """POST /api/chat/ — RAG 對話"""
    reply = answer_question(req.message)
    return {"reply": reply}
