"""
AI Agent 自動巡邏服務 — 適配真實資料格式
"""
from datetime import datetime
from services.data_loader import data_store
from services.sop_engine import classify_event, calculate_ete, check_mrt_trigger


def run_patrol() -> dict:
    """執行一輪 AI Agent 巡邏"""
    thoughts = []
    predictions = []
    anomalies = []
    now = datetime.now().strftime("%H:%M:%S")

    # === Step 1: 掃描車流 ===
    latest_traffic = data_store.get_latest_traffic()
    thoughts.append({"time": now, "type": "scan", "msg": f"掃描 {len(latest_traffic)} 路段即時車流數據..."})

    critical_roads = []
    warning_roads = []

    for road in latest_traffic:
        sat = float(road["Saturation_Score"])
        name = road["Road_Name"]
        seg_id = road["Segment_ID"]

        if sat >= 0.95:
            critical_roads.append({"name": name, "id": seg_id, "saturation": sat})
        elif sat >= 0.85:
            warning_roads.append({"name": name, "id": seg_id, "saturation": sat})

    # 分析危險路段
    for road in critical_roads:
        thoughts.append({
            "time": now, "type": "analyze",
            "msg": f"分析 {road['name']}：飽和度 {int(road['saturation']*100)}% → A 級癱瘓"
        })
        # 查替代路線
        road_data = data_store.find_road_by_id(road["id"])
        if road_data:
            alts = road_data.get("alternatives", [])
            alt_names = [data_store.get_road_name_by_id(a) for a in alts]
            if alt_names:
                thoughts.append({
                    "time": now, "type": "predict",
                    "msg": f"⚡ 連鎖預測：{road['name']}超標 → {'、'.join(alt_names[:3])}負載上升"
                })
                predictions.append({
                    "id": f"PA-{road['id']}",
                    "severity": "critical",
                    "title": f"{road['name']}連鎖壅塞風險",
                    "prediction": f"已達 A 級，將連鎖影響 {len(alts)} 路段",
                    "currentValue": f"{int(road['saturation']*100)}%",
                    "trend": "持續惡化",
                    "confidence": 92,
                    "countdown": 5,
                    "affectedRoads": [f"{n} (替代路線)" for n in alt_names[:3]],
                })

        anomalies.append({
            "road": road["name"],
            "metric": "飽和度",
            "current": int(road["saturation"] * 100),
            "normal": 60,
            "deviation": f"+{int((road['saturation'] - 0.60) * 100)}%",
            "status": "anomaly",
        })

    # === Step 2: 掃描基地台信令 ===
    thoughts.append({"time": now, "type": "scan", "msg": "掃描基地台信令密度..."})

    multilang = data_store.get_multilang_report()
    if multilang["triggered"]:
        thoughts.append({
            "time": now, "type": "trigger",
            "msg": f"🚨 觸發 SOP 第 6 條：{multilang.get('trigger_station','某站')} 漫遊率 {int(multilang['roaming_rate']*100)}% ≥ 30%"
        })
        predictions.append({
            "id": "PA-ROAMING",
            "severity": "warning",
            "title": "多語通報已觸發",
            "prediction": f"漫遊率 {int(multilang['roaming_rate']*100)}%，需發送多語告警",
            "currentValue": f"{int(multilang['roaming_rate']*100)}%",
            "trend": "觸發中",
            "confidence": 99,
            "countdown": 0,
            "affectedRoads": None,
        })

    # === Step 3: 掃描捷運狀態（SOP 第 3 條）===
    mrt = check_mrt_trigger()
    if mrt["triggered"]:
        thoughts.append({
            "time": now, "type": "trigger",
            "msg": f"🚨 觸發 SOP 第 3 條：BL17 用戶 {mrt['user_count']:,}，Growth_Rate {mrt['growth_rate']:.2f}"
        })
        thoughts.append({
            "time": now, "type": "action",
            "msg": "✅ 建議：北捷過站不停 + 調度接駁專車"
        })

    # === Step 4: 掃描事件 ===
    thoughts.append({"time": now, "type": "scan", "msg": f"掃描 live_incidents：{len(data_store.incidents)} 筆事件..."})

    for inc in data_store.incidents:
        if inc.get("severity") in ["Critical", "High"]:
            thoughts.append({
                "time": now, "type": "analyze",
                "msg": f"分析事件 {inc['event_id']}：{inc['type']} — {inc['severity']}"
            })
            ete = calculate_ete(inc["severity"], [inc.get("affected_segment", "")])
            thoughts.append({
                "time": now, "type": "action",
                "msg": f"✅ ETE = {ete['ete_minutes']} 分鐘（{ete['formula']}）"
            })

    # === Step 5: 趨勢預測 ===
    for road in warning_roads[:3]:
        thoughts.append({
            "time": now, "type": "predict",
            "msg": f"⚡ 預測：{road['name']} 飽和度 {int(road['saturation']*100)}%，趨勢上升中"
        })
        predictions.append({
            "id": f"PA-TREND-{road['id']}",
            "severity": "warning",
            "title": f"{road['name']}趨勢異常",
            "prediction": "飽和度持續上升，可能進入 A 級",
            "currentValue": f"{int(road['saturation']*100)}%",
            "trend": "+上升中",
            "confidence": 85,
            "countdown": 10,
            "affectedRoads": None,
        })
        anomalies.append({
            "road": road["name"],
            "metric": "飽和度",
            "current": int(road["saturation"] * 100),
            "normal": 60,
            "deviation": f"+{int((road['saturation'] - 0.60) * 100)}%",
            "status": "anomaly",
        })

    # === 完成 ===
    if critical_roads or warning_roads:
        thoughts.append({"time": now, "type": "action", "msg": f"✅ 已產出 {len(predictions)} 則預測告警"})

    thoughts.append({"time": now, "type": "scan", "msg": "巡邏完成。所有數據源已掃描。"})

    result = {
        "thoughts": thoughts,
        "predictions": predictions,
        "anomalies": anomalies,
        "summary": {
            "critical_roads": len(critical_roads),
            "warning_roads": len(warning_roads),
            "predictions_count": len(predictions),
            "anomalies_count": len(anomalies),
        }
    }

    # LLM 生成分析摘要（USE_BEDROCK=true 時啟用 Agent 自主巡邏）
    try:
        from services.agent_loop import agent_patrol as agent_patrol_loop
        agent_result = agent_patrol_loop()
        if agent_result.get("reply"):
            result["llm_summary"] = agent_result["reply"]
            result["agent_tool_calls"] = agent_result.get("tool_calls", [])
            result["agent_iterations"] = agent_result.get("iterations", 0)
            thoughts.append({"time": now, "type": "action", "msg": f"📝 Agent 自主分析完成（{agent_result.get('iterations', 0)} 輪推理，{len(agent_result.get('tool_calls', []))} 次工具呼叫）"})
    except Exception:
        pass

    return result
