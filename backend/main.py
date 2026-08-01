"""
城市應變分析 AI Agent — 後端 API
中華電信 2026 AI Hackathon
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import dashboard, incidents, chat
from routers.auth import router as auth_router
from middleware.security import SecurityMiddlewareV2

app = FastAPI(
    title="城市應變分析 AI Agent API",
    description="智慧交通指揮 Dashboard 後端服務",
    version="1.0.0",
)

# Security Middleware V2（Rate Limiting + IP 黑名單 + 降級模式 + Audit）
app.add_middleware(SecurityMiddlewareV2)

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由掛載
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "cht-hackathon-backend", "security": "enabled"}
