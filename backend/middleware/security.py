"""
資安中介層 — JWT 認證 + Rate Limiting + Audit Log + 輸入驗證
"""
from typing import Optional
import os
import time
import hashlib
import json
from datetime import datetime, timedelta
from collections import defaultdict
from functools import wraps

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# ============ JWT 簡易實作（Demo 用，正式版用 Cognito） ============

SECRET_KEY = os.getenv("JWT_SECRET", os.urandom(32).hex() if not os.getenv("JWT_SECRET") else "")
# 確保有值
if not SECRET_KEY:
    SECRET_KEY = "cht-hackathon-2026-change-in-production"
TOKEN_EXPIRE_HOURS = 8

# 使用者資料庫（Demo 用）
USERS = {
    "commander": {"password_hash": hashlib.sha256("1234".encode()).hexdigest(), "role": "commander"},
    "public": {"password_hash": "", "role": "public"},
}


def create_token(username: str, role: str) -> str:
    """產生簡易 JWT token（Demo 用）"""
    payload = {
        "sub": username,
        "role": role,
        "exp": int((datetime.now() + timedelta(hours=TOKEN_EXPIRE_HOURS)).timestamp()),
        "iat": int(datetime.now().timestamp()),
    }
    # 簡易簽名（正式版用 PyJWT + RS256）
    data = json.dumps(payload, sort_keys=True)
    signature = hashlib.sha256(f"{data}{SECRET_KEY}".encode()).hexdigest()[:16]
    import base64
    token = base64.b64encode(f"{data}|{signature}".encode()).decode()
    return token


def verify_token(token: str) -> dict:
    """驗證 token"""
    import base64
    try:
        decoded = base64.b64decode(token).decode()
        data_str, signature = decoded.rsplit("|", 1)
        expected_sig = hashlib.sha256(f"{data_str}{SECRET_KEY}".encode()).hexdigest()[:16]
        if signature != expected_sig:
            return None
        payload = json.loads(data_str)
        if payload["exp"] < int(datetime.now().timestamp()):
            return None
        return payload
    except Exception:
        return None


def authenticate_user(username: str, password: str) -> Optional[dict]:
    """驗證使用者"""
    user = USERS.get(username)
    if not user:
        return None
    if username == "public":
        return {"username": username, "role": "public"}
    pw_hash = hashlib.sha256(password.encode()).hexdigest()
    if pw_hash != user["password_hash"]:
        return None
    return {"username": username, "role": user["role"]}


# ============ Rate Limiting ============

class RateLimiter:
    """IP-based rate limiting"""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = window_seconds
        self.requests = defaultdict(list)

    def is_allowed(self, ip: str) -> bool:
        now = time.time()
        # 清除過期紀錄
        self.requests[ip] = [t for t in self.requests[ip] if now - t < self.window]
        if len(self.requests[ip]) >= self.max_requests:
            return False
        self.requests[ip].append(now)
        return True

    def get_remaining(self, ip: str) -> int:
        now = time.time()
        self.requests[ip] = [t for t in self.requests[ip] if now - t < self.window]
        return max(0, self.max_requests - len(self.requests[ip]))


rate_limiter = RateLimiter(max_requests=60, window_seconds=60)


# ============ Audit Log ============

class AuditLogger:
    """操作稽核紀錄"""

    def __init__(self):
        self.logs = []

    def log(self, ip: str, method: str, path: str, user: str = "anonymous", status: int = 200, detail: str = ""):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "ip": ip,
            "method": method,
            "path": path,
            "user": user,
            "status": status,
            "detail": detail,
        }
        self.logs.append(entry)
        # 只保留最近 1000 筆
        if len(self.logs) > 1000:
            self.logs = self.logs[-500:]

    def get_logs(self, limit: int = 50) -> list:
        return self.logs[-limit:][::-1]


audit_logger = AuditLogger()


# ============ Security Middleware ============

class SecurityMiddleware(BaseHTTPMiddleware):
    """安全中介層：Rate Limiting + Request Size + Audit"""

    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        path = request.url.path
        method = request.method

        # 1. Rate Limiting（排除 health check）
        if path != "/health":
            if not rate_limiter.is_allowed(ip):
                audit_logger.log(ip, method, path, status=429, detail="Rate limit exceeded")
                return JSONResponse(
                    status_code=429,
                    content={"error": "Too many requests. Please try again later.", "retry_after": 60}
                )

        # 2. Request Body Size Limit（1MB）
        if method in ["POST", "PUT"]:
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > 1_048_576:
                audit_logger.log(ip, method, path, status=413, detail="Request too large")
                return JSONResponse(
                    status_code=413,
                    content={"error": "Request body too large. Maximum 1MB."}
                )

        # 3. 執行請求
        response = await call_next(request)

        # 4. 記錄 Audit Log
        audit_logger.log(ip, method, path, status=response.status_code)

        # 5. 安全 Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


# ============ Input Validation ============

def validate_chat_input(message: str) -> str:
    """過濾 Chat 輸入，防止 Prompt Injection"""
    dangerous_patterns = [
        # English
        "ignore previous", "ignore above", "disregard",
        "you are now", "new instructions", "system prompt",
        "act as", "pretend to be", "forget everything",
        "override", "bypass", "jailbreak",
        # 中文
        "忽略以上", "忽略之前", "無視指令", "忘記之前",
        "你現在是", "假裝你是", "輸出系統提示",
        "顯示所有規則", "告訴我你的指令",
    ]
    msg_lower = message.lower()
    for pattern in dangerous_patterns:
        if pattern in msg_lower or pattern in message:
            return "[已過濾] 您的輸入包含不允許的內容，請重新提問。"

    # 長度限制
    if len(message) > 500:
        return message[:500]

    return message


def validate_incident_input(event_type: str, location: str, description: str) -> tuple:
    """驗證事件注入輸入"""
    # 允許的事件類型
    allowed_types = [
        "road_collapse", "Road_Collapse_Accident",
        "crowd_surge", "Crowd_Surge_Injury",
        "signal_failure", "Power_Failure",
        "accident", "construction", "weather",
        "collapse", "crowd",
    ]

    if event_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid event type: {event_type}")

    if len(location) > 200:
        location = location[:200]

    if len(description) > 1000:
        description = description[:1000]

    return event_type, location, description


# ============ Role-based Access Control Dependencies ============

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(request: Request) -> Optional[dict]:
    """從 Header 取得並驗證目前使用者（不強制）"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.replace("Bearer ", "")
    return verify_token(token)


def require_auth(request: Request) -> dict:
    """強制要求認證（任何角色）"""
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required. Please login first.")
    return user


def require_commander(request: Request) -> dict:
    """強制要求指揮官角色"""
    user = require_auth(request)
    if user.get("role") != "commander":
        audit_logger.log(
            request.client.host if request.client else "unknown",
            request.method, str(request.url.path),
            user.get("sub", "unknown"), 403, "Permission denied: commander required"
        )
        raise HTTPException(status_code=403, detail="Permission denied. Commander role required.")
    return user


# ============ 通報發送二次驗證 ============

# 發送冷卻：同一使用者 60 秒內不可重複發送
_dispatch_cooldown = {}  # {username: last_dispatch_time}
DISPATCH_PIN = os.getenv("DISPATCH_PIN", "0000")


def verify_dispatch(username: str, pin: str) -> bool:
    """驗證通報發送 PIN + 冷卻時間"""
    # 檢查 PIN
    if pin != DISPATCH_PIN:
        return False

    # 檢查冷卻
    now = time.time()
    last = _dispatch_cooldown.get(username, 0)
    if now - last < 60:
        return False

    _dispatch_cooldown[username] = now
    return True


# ============ WebSocket 認證 ============

def verify_ws_token(token: str) -> Optional[dict]:
    """驗證 WebSocket 連線 token（從 query param 取得）"""
    if not token:
        return None
    return verify_token(token)


# ============ DDoS 防護：IP 黑名單 + 連線限制 + 降級模式 ============

class IPBlacklist:
    """自動封鎖異常 IP（短時間大量被 429 的 IP 自動封鎖）"""

    def __init__(self, block_threshold: int = 10, block_duration: int = 300):
        self.block_threshold = block_threshold  # 被拒絕幾次後封鎖
        self.block_duration = block_duration    # 封鎖時間（秒）
        self.violations = defaultdict(list)     # {ip: [timestamps]}
        self.blocked = {}                       # {ip: unblock_time}
        self.manual_blocklist = set()           # 手動永久封鎖

    def record_violation(self, ip: str):
        """記錄一次違規（被 rate limit 拒絕）"""
        now = time.time()
        self.violations[ip].append(now)
        # 清除過期紀錄（5 分鐘前的不算）
        self.violations[ip] = [t for t in self.violations[ip] if now - t < 300]
        # 超過閾值自動封鎖
        if len(self.violations[ip]) >= self.block_threshold:
            self.blocked[ip] = now + self.block_duration
            self.violations[ip] = []

    def is_blocked(self, ip: str) -> bool:
        """檢查 IP 是否被封鎖"""
        if ip in self.manual_blocklist:
            return True
        if ip in self.blocked:
            if time.time() < self.blocked[ip]:
                return True
            else:
                del self.blocked[ip]
        return False

    def block_ip(self, ip: str, permanent: bool = False):
        """手動封鎖 IP"""
        if permanent:
            self.manual_blocklist.add(ip)
        else:
            self.blocked[ip] = time.time() + self.block_duration

    def unblock_ip(self, ip: str):
        """解除封鎖"""
        self.manual_blocklist.discard(ip)
        self.blocked.pop(ip, None)

    def get_status(self) -> dict:
        now = time.time()
        active_blocks = {ip: int(t - now) for ip, t in self.blocked.items() if t > now}
        return {
            "blocked_ips": list(active_blocks.keys()) + list(self.manual_blocklist),
            "blocked_count": len(active_blocks) + len(self.manual_blocklist),
            "block_details": active_blocks,
            "permanent_blocks": list(self.manual_blocklist),
        }


ip_blacklist = IPBlacklist(block_threshold=10, block_duration=300)


class WebSocketLimiter:
    """WebSocket 連線數限制"""

    def __init__(self, max_per_ip: int = 3, max_total: int = 50):
        self.max_per_ip = max_per_ip
        self.max_total = max_total
        self.connections = defaultdict(int)  # {ip: count}
        self.total = 0

    def can_connect(self, ip: str) -> bool:
        if self.total >= self.max_total:
            return False
        if self.connections[ip] >= self.max_per_ip:
            return False
        return True

    def connect(self, ip: str):
        self.connections[ip] += 1
        self.total += 1

    def disconnect(self, ip: str):
        self.connections[ip] = max(0, self.connections[ip] - 1)
        self.total = max(0, self.total - 1)
        if self.connections[ip] == 0:
            del self.connections[ip]

    def get_status(self) -> dict:
        return {
            "total_connections": self.total,
            "max_total": self.max_total,
            "per_ip": dict(self.connections),
        }


ws_limiter = WebSocketLimiter(max_per_ip=3, max_total=50)


class DegradationMode:
    """降級模式：偵測到攻擊時停用高耗能 API"""

    def __init__(self):
        self.enabled = False
        self.reason = ""
        self.activated_at = None
        self.disabled_endpoints = set()

    def activate(self, reason: str = "DDoS detected"):
        self.enabled = True
        self.reason = reason
        self.activated_at = datetime.now().isoformat()
        # 降級時停用的端點
        self.disabled_endpoints = {
            "/api/dashboard/agent-patrol",
            "/api/dashboard/crowd-density",
        }

    def deactivate(self):
        self.enabled = False
        self.reason = ""
        self.activated_at = None
        self.disabled_endpoints = set()

    def is_disabled(self, path: str) -> bool:
        if not self.enabled:
            return False
        return path in self.disabled_endpoints

    def get_status(self) -> dict:
        return {
            "degradation_mode": self.enabled,
            "reason": self.reason,
            "activated_at": self.activated_at,
            "disabled_endpoints": list(self.disabled_endpoints),
        }


degradation_mode = DegradationMode()


# ============ 升級 Security Middleware ============

class SecurityMiddlewareV2(BaseHTTPMiddleware):
    """安全中介層 V2：Rate Limiting + IP 黑名單 + 降級模式 + Audit"""

    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        path = request.url.path
        method = request.method

        # 0. IP 黑名單檢查
        if ip_blacklist.is_blocked(ip):
            audit_logger.log(ip, method, path, status=403, detail="IP blocked")
            return JSONResponse(
                status_code=403,
                content={"error": "Your IP has been blocked due to suspicious activity."}
            )

        # 1. Rate Limiting
        if path != "/health":
            if not rate_limiter.is_allowed(ip):
                # 記錄違規
                ip_blacklist.record_violation(ip)
                audit_logger.log(ip, method, path, status=429, detail="Rate limit exceeded")
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too many requests.",
                        "retry_after": 60,
                        "warning": "Continued abuse will result in IP block."
                    }
                )

        # 2. 降級模式檢查
        if degradation_mode.is_disabled(path):
            return JSONResponse(
                status_code=503,
                content={
                    "error": "Service temporarily unavailable (degradation mode).",
                    "reason": degradation_mode.reason,
                }
            )

        # 3. Request Body Size Limit
        if method in ["POST", "PUT"]:
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > 1_048_576:
                audit_logger.log(ip, method, path, status=413, detail="Request too large")
                return JSONResponse(status_code=413, content={"error": "Request body too large."})

        # 4. 請求超時（30 秒）
        import asyncio
        try:
            response = await asyncio.wait_for(call_next(request), timeout=30.0)
        except asyncio.TimeoutError:
            audit_logger.log(ip, method, path, status=504, detail="Request timeout")
            return JSONResponse(status_code=504, content={"error": "Request timeout."})

        # 5. Audit Log
        audit_logger.log(ip, method, path, status=response.status_code)

        # 6. 安全 Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-RateLimit-Remaining"] = str(rate_limiter.get_remaining(ip))

        return response
