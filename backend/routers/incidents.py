"""
事件處理路由 — 注入事件 + 產出建議書
"""
from fastapi import APIRouter
from pydantic import BaseModel
from services.route_planner import process_incident, generate_report

router = APIRouter()


class IncidentRequest(BaseModel):
    type: str
    location: str
    description: str = ""


class ReportRequest(BaseModel):
    incident_id: str = ""


# 快取最近一次處理結果
_last_result = {}


@router.post("/process")
def handle_incident(req: IncidentRequest):
    """POST /api/incidents/process — 處理事件"""
    global _last_result
    result = process_incident(req.type, req.location, req.description)
    _last_result = result
    return result


@router.post("/report")
def handle_report(req: ReportRequest):
    """POST /api/incidents/report — 生成建議書"""
    if not _last_result:
        return {"report": "尚無已處理事件，請先注入事件。"}
    report = generate_report(_last_result)
    return {"report": report}
