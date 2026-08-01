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
    """GET /api/dashboard/multilang-report — 多語通報（LLM 生成多語文字）"""
    base_report = data_store.get_multilang_report()

    # 嘗試用 LLM 生成多語通報文字
    try:
        from services.llm_service import generate_multilang_alert
        if base_report.get("triggered"):
            llm_reports = generate_multilang_alert(
                incident_desc="光復南路與忠孝東路口路面塌陷暫時封閉",
                location="忠孝東路四段/光復南路口",
                alternatives="市民大道或仁愛路",
                ete=60,
            )
            if llm_reports:
                base_report["reports"] = llm_reports
                base_report["llm_generated"] = True
    except Exception:
        pass

    return base_report


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WS /api/dashboard/ws — 即時推播（需 token + 連線數限制）"""
    from middleware.security import verify_ws_token, ws_limiter

    # 認證
    token = websocket.query_params.get("token", "")
    user = verify_ws_token(token)
    if not user:
        await websocket.close(code=4001, reason="Authentication required")
        return

    # 連線數限制
    ip = websocket.client.host if websocket.client else "unknown"
    if not ws_limiter.can_connect(ip):
        await websocket.close(code=4002, reason="Too many connections from this IP")
        return

    ws_limiter.connect(ip)
    await websocket.accept()
    try:
        while True:
            alerts = data_store.get_alerts()
            if alerts:
                import random
                alert = random.choice(alerts)
                alert["id"] = int(asyncio.get_event_loop().time() * 1000)
                await websocket.send_json(alert)
            await asyncio.sleep(10)
    except WebSocketDisconnect:
        pass
    finally:
        ws_limiter.disconnect(ip)


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

    # 前值填充 flow
    for i in range(1, len(flow)):
        for s in stations:
            if s not in flow[i] and s in flow[i - 1]:
                flow[i][s] = flow[i - 1][s]

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

    # 前值填充 roaming
    for i in range(1, len(roaming)):
        for s in stations:
            if s not in roaming[i] and s in roaming[i - 1]:
                roaming[i][s] = roaming[i - 1][s]

    # 站點清單（含顏色）
    colors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#ef4444', '#84cc16']
    station_list = [{"id": s, "name": s, "color": colors[i % len(colors)]} for i, s in enumerate(stations)]

    return {
        "flow": flow,
        "roaming": roaming,
        "stations": station_list,
        "timestamps": [ts.split(" ")[1] for ts in timestamps],
    }
