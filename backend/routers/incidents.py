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

    # AWS 整合：DynamoDB 持久化 + SNS 通知
    try:
        from services.aws_services import save_incident, notify_incident, save_agent_trace
        save_incident(result)
        notify_incident(result.get("event", ""), result.get("severity", ""), location, extra_data=result)
        if result.get("agent_tool_calls"):
            save_agent_trace("incident_process", result["agent_tool_calls"], result.get("agent_iterations", 0), result.get("llm_guidance", "")[:200])
    except Exception:
        pass

    return result


@router.post("/dispatch-agencies")
def dispatch_agencies(request_body: dict):
    """POST /api/incidents/dispatch-agencies — 通報公務單位（真實發送 SMS + LINE + Email）"""
    agencies = request_body.get("agencies", [])
    message = request_body.get("message", "")
    incident_type = request_body.get("incident_type", "交通事故")
    location = request_body.get("location", "")

    if not agencies or not message:
        return {"success": False, "error": "Missing agencies or message"}

    full_message = (
        f"[城市應變 AI Agent — 公務單位通報]\n"
        f"{'=' * 30}\n"
        f"事故類型：{incident_type}\n"
        f"事故地點：{location}\n"
        f"通報單位：{', '.join(agencies)}\n"
        f"{'=' * 30}\n\n"
        f"{message}\n\n"
        f"請相關單位立即啟動應變程序。\n"
        f"Dashboard：https://d29bomxt4wi5pg.cloudfront.net"
    )

    try:
        from services.aws_services import send_alert_notification, send_line_notify
        subject = f"[通報] {incident_type} — {location}"
        sns_ok = send_alert_notification(subject, full_message)
        line_ok = send_line_notify(f"\n📞 公務單位通報\n━━━━━━━━━━━━━━━\n事故：{incident_type}\n地點：{location}\n通報：{', '.join(agencies)}\n━━━━━━━━━━━━━━━\n{message[:200]}")
        return {"success": True, "sns": sns_ok, "line": line_ok, "agencies_count": len(agencies)}
    except Exception as e:
        return {"success": False, "error": str(e)}


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
