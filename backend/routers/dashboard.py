"""
Dashboard 路由 — 車流、告警、WebSocket
"""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.data_loader import data_store

router = APIRouter()


@router.get("/traffic")
def get_traffic():
    """GET /api/dashboard/traffic — 車流時序資料"""
    return data_store.get_traffic_timeseries()


@router.get("/alerts")
def get_alerts():
    """GET /api/dashboard/alerts — 當前告警列表"""
    return data_store.get_alerts()


@router.get("/multilang-report")
def get_multilang_report():
    """GET /api/dashboard/multilang-report — 多語通報"""
    return data_store.get_multilang_report()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WS /api/dashboard/ws — 即時推播"""
    await websocket.accept()
    try:
        while True:
            # 每 10 秒推送最新告警
            alerts = data_store.get_alerts()
            if alerts:
                import random
                alert = random.choice(alerts)
                alert["id"] = int(asyncio.get_event_loop().time() * 1000)
                await websocket.send_json(alert)
            await asyncio.sleep(10)
    except WebSocketDisconnect:
        pass


@router.get("/agent-patrol")
def run_agent_patrol():
    """GET /api/dashboard/agent-patrol — AI Agent 執行一輪巡邏"""
    from services.agent_service import run_patrol
    return run_patrol()


@router.get("/crowd-density")
def get_crowd_density():
    """GET /api/dashboard/crowd-density — 基地台人流信令時序"""
    from services.data_loader import data_store
    df = data_store.crowd_df

    # 取得所有站點
    stations = df["Location_Name"].unique().tolist()

    # 按時間排序
    timestamps = sorted(df["Timestamp"].unique())

    # 組成時序資料
    flow = []
    for ts in timestamps:
        time_str = ts.split(" ")[1] if " " in ts else ts
        row = {"time": time_str}
        subset = df[df["Timestamp"] == ts]
        for _, r in subset.iterrows():
            row[r["Location_Name"]] = int(r["User_Count"])
        flow.append(row)

    # 漫遊率時序
    roaming = []
    for ts in timestamps:
        time_str = ts.split(" ")[1] if " " in ts else ts
        subset = df[df["Timestamp"] == ts]
        row = {"time": time_str}
        for _, r in subset.iterrows():
            pct = r["Roaming_User_Pct"]
            if isinstance(pct, str):
                pct = float(pct.replace("%", "")) / 100
            row[r["Location_Name"]] = round(float(pct), 3)
        roaming.append(row)

    # 站點清單（含顏色）
    colors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#ef4444', '#84cc16']
    station_list = [{"id": s, "name": s, "color": colors[i % len(colors)]} for i, s in enumerate(stations)]

    return {
        "flow": flow,
        "roaming": roaming,
        "stations": station_list,
        "timestamps": [ts.split(" ")[1] for ts in timestamps],
    }
