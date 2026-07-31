"""
城市應變分析 AI Agent — 後端 API
中華電信 2026 AI Hackathon
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import dashboard, incidents, chat

app = FastAPI(
    title="城市應變分析 AI Agent API",
    description="智慧交通指揮 Dashboard 後端服務",
    version="1.0.0",
)

# CORS 設定（允許前端跨域存取）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由掛載
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "cht-hackathon-backend"}
