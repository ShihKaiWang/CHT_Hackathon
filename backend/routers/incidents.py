"""
事件處理路由 — 注入事件 + 產出建議書（含認證 + 輸入驗證）
"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from services.route_planner import process_incident, generate_report
from middleware.security import validate_incident_input, require_commander, verify_dispatch, audit_logger

router = APIRouter()


class IncidentRequest(BaseModel):
    type: str
    location: str
    description: str = ""


class ReportRequest(BaseModel):
    incident_id: str = ""


class DispatchRequest(BaseModel):
    pin: str
    channels: list = []


_last_result = {}


@router.post("/process")
def handle_incident(req: IncidentRequest, user: dict = Depends(require_commander)):
    """POST /api/incidents/process — 處理事件（需指揮官權限）"""
    global _last_result
    event_type, location, description = validate_incident_input(req.type, req.location, req.description)
    result = process_incident(event_type, location, description)
    _last_result = result
    return result


@router.post("/report")
def handle_report(req: ReportRequest, user: dict = Depends(require_commander)):
    """POST /api/incidents/report — 生成建議書（需指揮官權限）"""
    if not _last_result:
        return {"report": "尚無已處理事件，請先注入事件。"}
    report = generate_report(_last_result)
    return {"report": report}


@router.post("/dispatch")
def handle_dispatch(req: DispatchRequest, request: Request, user: dict = Depends(require_commander)):
    """POST /api/incidents/dispatch — 發送通報（需 PIN 二次驗證）"""
    username = user.get("sub", "unknown")
    ip = request.client.host if request.client else "unknown"

    if not verify_dispatch(username, req.pin):
        audit_logger.log(ip, "POST", "/api/incidents/dispatch", username, 403, "Dispatch verification failed")
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="PIN 錯誤或冷卻時間未到（60 秒內不可重複發送）")

    audit_logger.log(ip, "POST", "/api/incidents/dispatch", username, 200,
                     f"Dispatch authorized: channels={req.channels}")
    return {
        "success": True,
        "message": f"通報已授權發送至 {len(req.channels)} 個管道",
        "channels": req.channels,
        "authorized_by": username,
    }
