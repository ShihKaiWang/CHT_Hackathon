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


@router.get("/ete")
def get_ete_calculation():
    """GET /api/dashboard/ete — 即時 ETE 計算（程式運算 + LLM 解釋）"""
    from services.sop_engine import calculate_ete, classify_event
    from services.data_loader import data_store

    # 取最嚴重的事件
    incidents = data_store.incidents
    severity = "Critical"
    affected_segment = ""
    incident_desc = "路面塌陷"
    for inc in incidents:
        if inc.get("severity") in ["Critical", "High"]:
            severity = inc["severity"]
            affected_segment = inc.get("affected_segment", "")
            incident_desc = inc.get("description", "交通事故")[:50]
            break

    # 程式計算 ETE
    ete = calculate_ete(severity, [affected_segment] if affected_segment else [])

    # 取排除路線（飽和度 >= 0.85 的路段）
    traffic = data_store.get_traffic_timeseries()
    saturation = traffic.get("saturation", [])
    excluded = [s for s in saturation if s["saturation"] >= 0.85]
    selected = [s for s in saturation if s["saturation"] < 0.85 and s["saturation"] >= 0.5][:3]

    # 分級
    level = classify_event(ete["avg_saturation"])

    result = {
        "ete": ete,
        "level": level,
        "severity": severity,
        "incident_desc": incident_desc,
        "excluded_roads": excluded,
        "selected_roads": selected,
    }

    # LLM 解釋（如果啟用）
    try:
        from services.llm_service import explain_ete
        explanation = explain_ete(
            ete["ete_minutes"], severity, ete["avg_saturation"], incident_desc
        )
        if explanation:
            result["llm_explanation"] = explanation
    except Exception:
        pass

    return result


@router.post("/smart-app")
def smart_app_agent(request_body: dict):
    """POST /api/dashboard/smart-app — 智慧應用 AI Agent 統一入口"""
    import os
    action = request_body.get("action", "")
    params = request_body.get("params", {})

    use_bedrock = os.getenv("USE_BEDROCK", "false").lower() == "true"
    if not use_bedrock:
        return {"reply": "", "error": "USE_BEDROCK is not enabled"}

    from services.agent_loop import run_agent

    prompts = {
        "maas_plan": (
            f"使用者需要出行規劃：\n"
            f"- 起點：{params.get('from', '未指定')}\n"
            f"- 終點：{params.get('to', '未指定')}\n\n"
            f"請：1) 查詢即時路況（飽和度）2) 查詢是否有事件影響 3) 根據結果產出多模式出行建議\n"
            f"回傳 JSON 格式：{{\"routes\": [{{\"type\": \"捷運/公車/YouBike/步行\", \"description\": \"路線描述\", "
            f"\"steps\": [\"步驟1\", \"步驟2\"], \"time_min\": 數字, \"cost\": \"費用\", \"avoid_reason\": \"避開原因\"}}], "
            f"\"warning\": \"路況警告（如有）\"}}"
        ),
        "dispatch_plan": (
            f"目前需要進行共享運具調度分析：\n"
            f"請：1) 查詢目前路況 2) 查詢即時事件 3) 判斷哪些區域需要增加運具\n"
            f"回傳 JSON 格式：{{\"dispatch_actions\": [{{\"station\": \"站名\", \"action\": \"增派/撤離\", "
            f"\"quantity\": 數字, \"reason\": \"原因\", \"priority\": \"high/medium/low\"}}], "
            f"\"summary\": \"調度摘要\"}}"
        ),
        "event_impact": (
            f"分析大型活動對路網的影響：\n"
            f"- 活動：{params.get('event_name', '演唱會')}\n"
            f"- 場館：{params.get('venue', '台北大巨蛋')}\n"
            f"- 人數：{params.get('capacity', 50000)}\n\n"
            f"請：1) 查詢場館周邊路段飽和度 2) 查詢基地台人流 3) 預估散場衝擊\n"
            f"回傳 JSON 格式：{{\"impact_analysis\": {{\"peak_flow\": 數字, \"duration_min\": 數字, "
            f"\"affected_roads\": [\"路段\"], \"recommendations\": [\"建議\"]}}, "
            f"\"pre_event_actions\": [\"散場前行動\"], \"sop_triggered\": [\"第X條\"]}}"
        ),
        "weather_impact": (
            f"分析天氣對路網的影響：\n"
            f"- 天氣狀況：{params.get('condition', '降雨')}\n"
            f"- 降雨機率：{params.get('rain_prob', 75)}%\n\n"
            f"請：1) 查詢目前路段飽和度 2) 預估天氣影響後的容量變化\n"
            f"回傳 JSON 格式：{{\"capacity_reduction\": \"百分比\", \"at_risk_roads\": [{{\"name\": \"路名\", "
            f"\"current_sat\": 0.8, \"predicted_sat\": 0.92}}], \"recommendations\": [\"建議\"], "
            f"\"alert_level\": \"high/medium/low\"}}"
        ),
        "analyze_report": (
            f"民眾回報了一則路況：\n"
            f"- 類型：{params.get('type', '塞車')}\n"
            f"- 位置：{params.get('location', '未指定')}\n"
            f"- 描述：{params.get('description', '')}\n\n"
            f"請：1) 查詢該位置附近路段飽和度 2) 判斷是否需要啟動應變 3) 產出建議\n"
            f"回傳 JSON 格式：{{\"verified\": true, \"severity\": \"high/medium/low\", "
            f"\"related_road\": \"路段名\", \"current_saturation\": 0.8, "
            f"\"recommendation\": \"建議行動\", \"sop_applicable\": \"第X條或無\"}}"
        ),
    }

    prompt = prompts.get(action, f"處理智慧應用請求：{action}，參數：{json.dumps(params, ensure_ascii=False)}")

    context = "回傳必須是純 JSON，不要加 markdown 標記或多餘文字。所有數值必須用工具查詢真實資料。"
    result = run_agent(prompt, context=context)

    # 解析結構化回覆
    from services.agent_loop import _parse_structured_response
    structured = _parse_structured_response(result.get("reply", ""))

    return {
        "structured": structured,
        "raw_reply": result.get("reply", ""),
        "tool_calls": result.get("tool_calls", []),
        "iterations": result.get("iterations", 0),
    }


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
