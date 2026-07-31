"""
Pydantic 資料模型定義
"""
from pydantic import BaseModel
from typing import Optional


class TrafficRecord(BaseModel):
    road_id: str
    road_name: str
    speed_kmh: float
    vehicle_count: int
    saturation: float


class Alert(BaseModel):
    id: int
    time: str
    type: str
    level: str
    message: str
    road: str


class IncidentInput(BaseModel):
    type: str
    location: str
    description: Optional[str] = ""


class ChatMessage(BaseModel):
    message: str
