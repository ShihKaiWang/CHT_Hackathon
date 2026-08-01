"""
認證路由 — 登入 + 登出 + Audit Log 查詢
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from middleware.security import (
    authenticate_user,
    create_token,
    verify_token,
    audit_logger,
    rate_limiter,
)

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str = ""


class LoginResponse(BaseModel):
    token: str
    role: str
    username: str


@router.post("/login")
def login(req: LoginRequest, request: Request):
    """POST /api/auth/login — 登入取得 token"""
    ip = request.client.host if request.client else "unknown"

    user = authenticate_user(req.username, req.password)
    if not user:
        audit_logger.log(ip, "POST", "/api/auth/login", req.username, 401, "Login failed")
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")

    token = create_token(user["username"], user["role"])
    audit_logger.log(ip, "POST", "/api/auth/login", user["username"], 200, f"Login success, role={user['role']}")

    return LoginResponse(token=token, role=user["role"], username=user["username"])


@router.post("/verify")
def verify(request: Request):
    """POST /api/auth/verify — 驗證 token 有效性"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = auth.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {"valid": True, "role": payload["role"], "username": payload["sub"]}


@router.get("/audit-log")
def get_audit_log(request: Request, limit: int = 50):
    """GET /api/auth/audit-log — 取得操作稽核紀錄（需 commander）"""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth.replace("Bearer ", "")
        payload = verify_token(token)
        if payload and payload["role"] != "commander":
            raise HTTPException(status_code=403, detail="Permission denied")

    return {"logs": audit_logger.get_logs(limit)}


@router.get("/rate-status")
def get_rate_status(request: Request):
    """GET /api/auth/rate-status — 查詢目前 rate limit 狀態"""
    ip = request.client.host if request.client else "unknown"
    remaining = rate_limiter.get_remaining(ip)
    return {"ip": ip, "remaining": remaining, "limit": 60, "window": "60s"}


# ============ DDoS 管理端點（需指揮官權限） ============

from middleware.security import ip_blacklist, ws_limiter, degradation_mode, require_commander
from fastapi import Depends


@router.get("/security-status")
def get_security_status(request: Request, user: dict = Depends(require_commander)):
    """GET /api/auth/security-status — 整體安全狀態"""
    return {
        "ip_blacklist": ip_blacklist.get_status(),
        "websocket": ws_limiter.get_status(),
        "degradation": degradation_mode.get_status(),
        "rate_limit": rate_limiter.get_remaining(request.client.host if request.client else "unknown"),
    }


@router.post("/block-ip")
def block_ip(request: Request, user: dict = Depends(require_commander)):
    """POST /api/auth/block-ip — 手動封鎖 IP"""
    body = {"ip": request.query_params.get("ip", "")}
    if not body["ip"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Missing ip parameter")
    ip_blacklist.block_ip(body["ip"])
    audit_logger.log(
        request.client.host, "POST", "/api/auth/block-ip",
        user.get("sub", ""), 200, f"Blocked IP: {body['ip']}"
    )
    return {"success": True, "blocked_ip": body["ip"]}


@router.post("/unblock-ip")
def unblock_ip(request: Request, user: dict = Depends(require_commander)):
    """POST /api/auth/unblock-ip — 解除封鎖"""
    ip = request.query_params.get("ip", "")
    if not ip:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Missing ip parameter")
    ip_blacklist.unblock_ip(ip)
    return {"success": True, "unblocked_ip": ip}


@router.post("/degradation-on")
def activate_degradation(request: Request, user: dict = Depends(require_commander)):
    """POST /api/auth/degradation-on — 啟動降級模式"""
    degradation_mode.activate("Manual activation by commander")
    audit_logger.log(
        request.client.host, "POST", "/api/auth/degradation-on",
        user.get("sub", ""), 200, "Degradation mode activated"
    )
    return degradation_mode.get_status()


@router.post("/degradation-off")
def deactivate_degradation(request: Request, user: dict = Depends(require_commander)):
    """POST /api/auth/degradation-off — 關閉降級模式"""
    degradation_mode.deactivate()
    return {"success": True, "degradation_mode": False}
