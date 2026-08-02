"""
AI Agent Loop — 使用 Bedrock Converse + Tool Use 實現自主決策
Agent 自主感知環境 → 決定呼叫哪些工具 → 觀察結果 → 產出最終建議
"""
import os
import json
from typing import Optional
from services.data_loader import data_store
from services.sop_engine import classify_event, calculate_ete, check_mrt_trigger, check_multilang_trigger

USE_BEDROCK = os.getenv("USE_BEDROCK", "false").lower() == "true"
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-20250514-v1:0")
AWS_REGION = os.getenv("AWS_REGION", "us-west-2")
GUARDRAIL_ID = os.getenv("GUARDRAIL_ID", "")
GUARDRAIL_VERSION = os.getenv("GUARDRAIL_VERSION", "1")

_client = None
MAX_ITERATIONS = 8


def _get_client():
    global _client
    if _client is None:
        import boto3
        _client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
    return _client


# ============ 工具定義 ============

TOOLS = [
    {"toolSpec": {"name": "check_road_saturation", "description": "查詢指定路段或所有路段的即時飽和度。回傳路段名稱、飽和度分數、狀態。", "inputSchema": {"json": {"type": "object", "properties": {"road_name": {"type": "string", "description": "路段名稱。留空回傳全部。"}}, "required": []}}}},
    {"toolSpec": {"name": "get_alternative_routes", "description": "查詢受影響路段的替代路線，含飽和度和容量。", "inputSchema": {"json": {"type": "object", "properties": {"road_name": {"type": "string", "description": "受影響路段名稱"}}, "required": ["road_name"]}}}},
    {"toolSpec": {"name": "calculate_ete", "description": "計算 ETE（預計交通恢復時間），回傳分鐘數和公式。", "inputSchema": {"json": {"type": "object", "properties": {"severity": {"type": "string", "description": "嚴重度：Critical/High/Medium/Low"}, "road_name": {"type": "string", "description": "受影響路段名稱"}}, "required": ["severity", "road_name"]}}}},
    {"toolSpec": {"name": "check_crowd_density", "description": "查詢基地台漫遊率，判斷是否觸發多語通報（>=30%）。", "inputSchema": {"json": {"type": "object", "properties": {"station_name": {"type": "string", "description": "站名，留空回傳全部"}}, "required": []}}}},
    {"toolSpec": {"name": "search_sop_knowledge_base", "description": "從 SOP 知識庫中語意搜索相關規則和處置方式。使用此工具查詢 SOP 條款、處置步驟、觸發條件等。", "inputSchema": {"json": {"type": "object", "properties": {"query": {"type": "string", "description": "搜索問題，例如「路面塌陷應變步驟」、「多語通報觸發條件」"}}, "required": ["query"]}}}},
    {"toolSpec": {"name": "check_sop_rules", "description": "直接查詢 SOP 規則全文，可用條款編號或關鍵字。", "inputSchema": {"json": {"type": "object", "properties": {"query": {"type": "string", "description": "條款編號或關鍵字"}}, "required": ["query"]}}}},
    {"toolSpec": {"name": "get_live_incidents", "description": "查詢即時事件清單。", "inputSchema": {"json": {"type": "object", "properties": {}, "required": []}}}},
    {"toolSpec": {"name": "classify_traffic_level", "description": "根據飽和度判定級別：A級>=0.95、B級>=0.85。", "inputSchema": {"json": {"type": "object", "properties": {"saturation_score": {"type": "number", "description": "飽和度(0-1)"}}, "required": ["saturation_score"]}}}},
    {"toolSpec": {"name": "generate_multilang_alert", "description": "產出中英日韓四語緊急通報。", "inputSchema": {"json": {"type": "object", "properties": {"incident_description": {"type": "string", "description": "事件描述"}, "location": {"type": "string", "description": "位置"}, "alternative_routes": {"type": "string", "description": "替代路線"}}, "required": ["incident_description", "location"]}}}},
    {"toolSpec": {"name": "dispatch_to_agency", "description": "根據事故類型通報對應單位並建議號誌調整。回傳通報單位清單、號誌建議、預估處理時間。", "inputSchema": {"json": {"type": "object", "properties": {"incident_type": {"type": "string", "description": "事故類型：car_accident_minor/car_accident_major/road_collapse/fallen_tree/signal_failure/flooding/mass_event/hazmat_spill/construction/power_line_down"}, "location": {"type": "string", "description": "事故地點"}, "severity": {"type": "string", "description": "嚴重度：Critical/High/Medium/Low"}}, "required": ["incident_type", "location"]}}}},
]


# ============ 工具執行 ============

def _execute_tool(tool_name: str, tool_input: dict) -> str:
    if tool_name == "search_sop_knowledge_base":
        query = tool_input.get("query", "")
        kb_id = os.getenv("BEDROCK_KB_ID", "")
        if not kb_id:
            # Fallback to local SOP text search
            return _execute_tool("check_sop_rules", {"query": query})
        try:
            import boto3
            kb_client = boto3.client("bedrock-agent-runtime", region_name=AWS_REGION)
            response = kb_client.retrieve(
                knowledgeBaseId=kb_id,
                retrievalQuery={"text": query},
                retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 5}},
            )
            results = []
            for r in response.get("retrievalResults", []):
                text = r.get("content", {}).get("text", "")
                score = r.get("score", 0)
                source = r.get("location", {}).get("s3Location", {}).get("uri", "")
                results.append({"text": text, "score": round(score, 3), "source": source.split("/")[-1] if source else ""})
            return json.dumps(results, ensure_ascii=False)
        except Exception as e:
            # Fallback to local
            return _execute_tool("check_sop_rules", {"query": query})

    elif tool_name == "check_road_saturation":
        road_name = tool_input.get("road_name", "")
        traffic_data = data_store.get_traffic_timeseries()
        saturation = traffic_data.get("saturation", [])
        if road_name:
            matches = [s for s in saturation if road_name in s["name"]]
            return json.dumps(matches or [{"error": f"找不到：{road_name}"}], ensure_ascii=False)
        return json.dumps(saturation[:10], ensure_ascii=False)

    elif tool_name == "get_alternative_routes":
        road_name = tool_input.get("road_name", "")
        road = data_store.find_road_by_name(road_name)
        if not road:
            return json.dumps({"error": f"找不到：{road_name}"}, ensure_ascii=False)
        alt_ids = road.get("alternatives", [])
        alternatives = []
        for alt_id in alt_ids:
            alt_road = data_store.find_road_by_id(alt_id)
            if alt_road:
                alternatives.append({"name": alt_road["name"], "saturation": alt_road.get("saturation", 0.5), "capacity": alt_road.get("capacity", 1500), "status": "available" if alt_road.get("saturation", 0.5) < 0.85 else "congested"})
        return json.dumps({"affected_road": road_name, "alternatives": alternatives}, ensure_ascii=False)

    elif tool_name == "calculate_ete":
        severity = tool_input.get("severity", "High")
        road_name = tool_input.get("road_name", "")
        road = data_store.find_road_by_name(road_name)
        segment_id = road.get("segment_id", "") if road else ""
        ete = calculate_ete(severity, [segment_id] if segment_id else [])
        return json.dumps(ete, ensure_ascii=False)

    elif tool_name == "check_crowd_density":
        report = data_store.get_multilang_report()
        return json.dumps({"roaming_rate": report["roaming_rate"], "triggered": report["triggered"], "trigger_station": report.get("trigger_station", ""), "threshold": "30%"}, ensure_ascii=False)

    elif tool_name == "check_sop_rules":
        query = tool_input.get("query", "")
        sop_text = data_store.sop_text
        if "第" in query and "條" in query:
            lines = sop_text.split("\n")
            result_lines = []
            capturing = False
            for line in lines:
                if query.replace(" ", "") in line.replace(" ", ""):
                    capturing = True
                elif capturing and line.startswith("第") and "條" in line:
                    break
                if capturing:
                    result_lines.append(line)
            if result_lines:
                return "\n".join(result_lines)
        lines = sop_text.split("\n")
        relevant = [l for l in lines if query in l or any(k in l for k in query.split())]
        return "\n".join(relevant[:20]) if relevant else sop_text[:3000]

    elif tool_name == "get_live_incidents":
        return json.dumps([{"event_id": inc.get("event_id", ""), "type": inc.get("type", ""), "location": inc.get("location", ""), "severity": inc.get("severity", ""), "description": inc.get("description", "")[:100], "affected_segment": inc.get("affected_segment", "")} for inc in data_store.incidents], ensure_ascii=False)

    elif tool_name == "classify_traffic_level":
        sat = tool_input.get("saturation_score", 0)
        level = classify_event(sat)
        return json.dumps({"saturation": sat, "level": level, "description": "A級癱瘓" if level == "A" else "B級壅擠" if level == "B" else "正常"}, ensure_ascii=False)

    elif tool_name == "generate_multilang_alert":
        desc = tool_input.get("incident_description", "")
        loc = tool_input.get("location", "")
        alts = tool_input.get("alternative_routes", "")
        from services.llm_service import generate_multilang_alert
        result = generate_multilang_alert(desc, loc, alts, 60)
        if result:
            return json.dumps(result, ensure_ascii=False)
        return json.dumps({"zh": f"⚠️ {loc}因{desc}封閉，請改走{alts or '替代路線'}。", "en": f"⚠️ {loc} closed. Use alternatives.", "ja": f"⚠️ {loc}通行止め。", "ko": f"⚠️ {loc} 폐쇄."}, ensure_ascii=False)

    elif tool_name == "dispatch_to_agency":
        incident_type = tool_input.get("incident_type", "")
        location = tool_input.get("location", "")
        severity = tool_input.get("severity", "High")
        
        DISPATCH_MATRIX = {
            "car_accident_minor": {
                "agencies": [{"name": "警察局交通大隊", "action": "到場處理事故、疏導交通", "priority": "P0"}],
                "signal": {"action": "事故路口切黃閃燈，鄰近路口綠燈延長 +15%", "duration": "20 分鐘"},
                "ete": 20,
            },
            "car_accident_major": {
                "agencies": [
                    {"name": "警察局", "action": "封鎖現場、事故調查", "priority": "P0"},
                    {"name": "消防局救護車", "action": "傷患救助、送醫", "priority": "P0"},
                    {"name": "鑑識組", "action": "事故重建（如有傷亡）", "priority": "P1"},
                ],
                "signal": {"action": "封閉事故路段，替代路線綠燈延長 +30%，上游路口引導改道", "duration": "60 分鐘"},
                "ete": 60,
            },
            "road_collapse": {
                "agencies": [
                    {"name": "工務局搶修組", "action": "路面修復、管線檢查", "priority": "P0"},
                    {"name": "警察局", "action": "封路管制、交通疏導", "priority": "P0"},
                    {"name": "自來水公司", "action": "確認管線狀態", "priority": "P1"},
                    {"name": "瓦斯公司", "action": "確認瓦斯管線安全", "priority": "P1"},
                ],
                "signal": {"action": "封閉雙向車道，周邊 3 個路口全面重配時相，替代幹道綠燈 +40%", "duration": "120+ 分鐘"},
                "ete": 120,
            },
            "fallen_tree": {
                "agencies": [
                    {"name": "環保局公園處", "action": "樹木移除、清運", "priority": "P0"},
                    {"name": "警察局", "action": "現場管制、引導車輛", "priority": "P0"},
                ],
                "signal": {"action": "佔用車道方向紅燈延長 +10s，對向綠燈延長 +20%", "duration": "30 分鐘"},
                "ete": 30,
            },
            "signal_failure": {
                "agencies": [
                    {"name": "交通局號誌維修組", "action": "緊急搶修號誌設備", "priority": "P0"},
                    {"name": "警察局", "action": "路口手動指揮交通", "priority": "P0"},
                ],
                "signal": {"action": "故障路口切閃光黃燈模式，鄰近路口綠燈補償 +15%", "duration": "45 分鐘"},
                "ete": 45,
            },
            "flooding": {
                "agencies": [
                    {"name": "水利處", "action": "抽水作業", "priority": "P0"},
                    {"name": "警察局", "action": "封閉積水路段", "priority": "P0"},
                    {"name": "環保局", "action": "清淤、環境復原", "priority": "P1"},
                ],
                "signal": {"action": "封閉低窪路段，高架道路/替代路線綠燈延長 +25%", "duration": "60 分鐘"},
                "ete": 60,
            },
            "mass_event": {
                "agencies": [
                    {"name": "警察局", "action": "人潮管制、維安", "priority": "P0"},
                    {"name": "台北捷運公司", "action": "加開班次、站務人員增派", "priority": "P0"},
                    {"name": "公車處", "action": "接駁車調度", "priority": "P1"},
                ],
                "signal": {"action": "場館周邊出場方向綠燈 +40%，入場方向紅燈延長，持續 30 分鐘", "duration": "30 分鐘"},
                "ete": 30,
            },
            "hazmat_spill": {
                "agencies": [
                    {"name": "消防局 HAZMAT 小組", "action": "危險物質處理、除污", "priority": "P0"},
                    {"name": "警察局", "action": "封鎖 500m 範圍、全面管制", "priority": "P0"},
                    {"name": "環保局", "action": "環境監測、善後處理", "priority": "P0"},
                ],
                "signal": {"action": "封鎖半徑 500m 所有路口，全面改道，遠端路口引導繞行", "duration": "180+ 分鐘"},
                "ete": 180,
            },
            "construction": {
                "agencies": [
                    {"name": "交通局", "action": "確認施工許可、協調施工方", "priority": "P1"},
                    {"name": "警察局", "action": "施工區交通引導", "priority": "P1"},
                ],
                "signal": {"action": "佔用車道方向紅燈延長 +10s，確保施工安全間距", "duration": "依施工期程"},
                "ete": 0,
            },
            "power_line_down": {
                "agencies": [
                    {"name": "台電", "action": "斷電搶修、電纜修復", "priority": "P0"},
                    {"name": "消防局", "action": "現場安全警戒（觸電風險）", "priority": "P0"},
                    {"name": "警察局", "action": "封路管制、絕對禁止通行", "priority": "P0"},
                ],
                "signal": {"action": "封閉該路段雙向，絕對不可通行，鄰近路口全紅 30 秒後引導改道", "duration": "90 分鐘"},
                "ete": 90,
            },
        }
        
        dispatch_info = DISPATCH_MATRIX.get(incident_type, DISPATCH_MATRIX.get("car_accident_minor"))
        result = {
            "incident_type": incident_type,
            "location": location,
            "severity": severity,
            "dispatch_agencies": dispatch_info["agencies"],
            "signal_adjustment": dispatch_info["signal"],
            "estimated_handling_time": f"{dispatch_info['ete']} 分鐘" if dispatch_info['ete'] > 0 else "依期程",
            "sop_reference": "SOP 第 2 條（事故應變）+ 第 5 條（號誌異常）",
        }
        return json.dumps(result, ensure_ascii=False)

    return json.dumps({"error": f"Unknown tool: {tool_name}"})


# ============ Agent Loop ============

SYSTEM_PROMPT = """你是「城市應變分析 AI Agent」，一個智慧交通指揮系統的自主決策引擎。

## 你的角色
你能夠自主感知交通環境、分析數據、做出決策建議。請根據問題自主決定需要查詢哪些資料。

## 回答格式（五段式，每次都必須遵守）
1. **結論**：一句話概述建議行動
2. **數據證據**：引用你查詢到的真實數據（飽和度、人流、ETE 等）
3. **SOP 條款**：明確引用第幾條，並說明為何適用
4. **執行動作**：具體的操作步驟（分流比例、號誌調整、通報範圍等）
5. **風險與限制**：說明可能的連鎖影響或例外情況

## What-if 假設性問題處理流程
當使用者提出假設（如「如果 BL17 人數增至 40,000」），你必須：
1. 辨識被改變的變數
2. 用工具查詢目前的真實狀態（作為基準）
3. 根據假設條件重新計算（成長率、門檻判定等）
4. 重新判定事件級別（A/B 級）
5. 重新查詢替代路線
6. 重新計算 ETE
7. 產出「模擬前後對比」表格，清楚展示差異

## SOP 分級標準
- A 級（癱瘓）：Saturation_Score >= 0.95
- B 級（壅擠）：0.85 <= Saturation_Score < 0.95
- 多語通報觸發：Roaming_User_Pct >= 30%
- 捷運聯動觸發（第 3 條）：Growth_Rate > 0.30 且 User_Count > 25,000
- ETE 公式：base_clearance + max(0, (avg_saturation - 0.5) × 60)

## 排除路線規則
替代路線必須：
- 排除飽和度 >= 0.85 的路段（SOP 第 1 條）
- 排除容量 < 1000 vph 的路段（SOP 第 2 條）
- 說明每條被排除路線的原因

## 事故分類與通報規則
當偵測到事故時，你必須：
1. 判定事故類型（car_accident_minor/car_accident_major/road_collapse/fallen_tree/signal_failure/flooding/mass_event/hazmat_spill/construction/power_line_down）
2. 呼叫 dispatch_to_agency 工具取得通報單位和號誌建議
3. 在回答中明確列出：要通知哪些單位、號誌如何調整、預估處理時間

事故類型對照：
- 輕微車禍 → 警察局交通大隊
- 重大車禍（傷亡）→ 警察局 + 消防局救護車 + 鑑識組
- 路面塌陷 → 工務局 + 警察局 + 自來水/瓦斯公司
- 路樹倒塌 → 環保局公園處 + 警察局
- 號誌故障 → 交通局維修組 + 警察局（手動指揮）
- 淹水積水 → 水利處 + 警察局 + 環保局
- 大型活動散場 → 警察局 + 捷運公司 + 公車處
- 危險物品洩漏 → 消防局 HAZMAT + 警察局 + 環保局
- 施工佔道 → 交通局 + 警察局
- 電纜掉落 → 台電 + 消防局 + 警察局

## 注意
- 不要編造數據，所有數值必須用工具查詢
- 替代路線排除飽和度 >= 0.85 的路段
- ETE 必須呼叫 calculate_ete 工具
- 回答使用繁體中文"""


def run_agent(user_message: str, context: str = "") -> dict:
    """執行 Agent Loop，回傳 {reply, tool_calls, iterations}"""
    if not USE_BEDROCK:
        return {"reply": "", "tool_calls": [], "iterations": 0}

    try:
        client = _get_client()
    except Exception as e:
        return {"reply": "", "tool_calls": [], "iterations": 0, "error": str(e)}

    system_text = SYSTEM_PROMPT + (f"\n\n## 背景\n{context}" if context else "")
    messages = [{"role": "user", "content": [{"text": user_message}]}]
    tool_call_log = []

    for iteration in range(MAX_ITERATIONS):
        try:
            kwargs = dict(
                modelId=BEDROCK_MODEL_ID,
                messages=messages,
                system=[{"text": system_text}],
                toolConfig={"tools": TOOLS},
                inferenceConfig={"maxTokens": 2048, "temperature": 0.2},
            )
            if GUARDRAIL_ID:
                kwargs["guardrailConfig"] = {
                    "guardrailIdentifier": GUARDRAIL_ID,
                    "guardrailVersion": GUARDRAIL_VERSION,
                }
            response = client.converse(**kwargs)
        except Exception as e:
            return {"reply": f"[Agent Error] {e}", "tool_calls": tool_call_log, "iterations": iteration}

        output = response.get("output", {}).get("message", {})
        stop_reason = response.get("stopReason", "")
        messages.append({"role": "assistant", "content": output.get("content", [])})

        if stop_reason == "end_turn":
            final_text = "".join(b["text"] for b in output.get("content", []) if "text" in b)
            return {"reply": final_text, "tool_calls": tool_call_log, "iterations": iteration + 1}

        if stop_reason == "guardrail_intervened":
            final_text = "".join(b["text"] for b in output.get("content", []) if "text" in b)
            return {"reply": final_text or "⚠️ 安全護欄：此問題不在交通應變範圍內。", "tool_calls": tool_call_log, "iterations": iteration + 1, "guardrail": True}

        if stop_reason == "tool_use":
            tool_results = []
            for block in output.get("content", []):
                if "toolUse" in block:
                    tu = block["toolUse"]
                    result_str = _execute_tool(tu["name"], tu.get("input", {}))
                    tool_call_log.append({"tool": tu["name"], "input": tu.get("input", {}), "output_preview": result_str[:200]})
                    tool_results.append({"toolResult": {"toolUseId": tu["toolUseId"], "content": [{"text": result_str}]}})
            messages.append({"role": "user", "content": tool_results})
            continue

        final_text = "".join(b["text"] for b in output.get("content", []) if "text" in b)
        return {"reply": final_text or "[Token limit]", "tool_calls": tool_call_log, "iterations": iteration + 1}

    return {"reply": "[Max iterations reached]", "tool_calls": tool_call_log, "iterations": MAX_ITERATIONS}


# ============ 便捷函數 ============

def agent_chat(message: str) -> str:
    result = run_agent(message)
    return result.get("reply", "")

def agent_process_incident(event_type: str, location: str, description: str) -> dict:
    """事件處理 — Agent 自主規劃，回傳結構化 JSON"""

    STRUCTURED_PROMPT = """你必須根據工具查詢結果，回傳嚴格的 JSON 格式（不要 markdown，不要多餘文字）。
JSON 結構如下：
{
  "situation": {
    "event_type": "事件類型",
    "location": "事件位置",
    "description": "事件描述",
    "affected_scope": "影響範圍"
  },
  "classification": {
    "level": "A 或 B 或 正常",
    "saturation": 0.95,
    "basis": "判定依據說明"
  },
  "alternatives": [
    {"name": "路線名", "saturation": 0.5, "capacity": 1500, "status": "available", "recommendation": "推薦原因"}
  ],
  "ete": {
    "minutes": 60,
    "formula": "公式字串",
    "explanation": "白話文解釋"
  },
  "multilang": {
    "triggered": true,
    "roaming_rate": 0.45,
    "station": "站名",
    "zh": "中文通報",
    "en": "English alert",
    "ja": "日本語通報",
    "ko": "한국어 통보"
  },
  "sop_actions": [
    {"priority": "P0", "action": "行動內容", "unit": "執行單位", "sop_clause": "第X條"}
  ],
  "guidance_text": "面向民眾的導引文字（100字內）"
}

重要規則：
1. 回傳必須是純 JSON，不要加 ```json 標記
2. 所有數值必須用工具查詢，不可編造
3. 替代路線必須排除飽和度 >= 0.85 的路段
4. 必須引用 SOP 條款"""

    prompt = (
        f"突發事件需要處理：\n"
        f"- 類型：{event_type}\n"
        f"- 位置：{location}\n"
        f"- 描述：{description}\n\n"
        f"請依序呼叫工具查詢後，以嚴格 JSON 格式回傳結果。"
    )

    result = run_agent(prompt, context=STRUCTURED_PROMPT)
    reply = result.get("reply", "")

    # 多重 JSON 解析策略
    structured = _parse_structured_response(reply)

    return {
        "structured": structured,
        "raw_reply": reply,
        "tool_calls": result.get("tool_calls", []),
        "iterations": result.get("iterations", 0),
    }


def _parse_structured_response(text: str) -> dict:
    """多重策略解析 LLM 的 JSON 回傳"""
    import re

    # 策略 1：直接解析（如果 LLM 乖乖回傳純 JSON）
    try:
        return json.loads(text.strip())
    except (json.JSONDecodeError, ValueError):
        pass

    # 策略 2：提取 {...} 區塊
    try:
        # 找最外層的 { }
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            candidate = text[start:end]
            return json.loads(candidate)
    except (json.JSONDecodeError, ValueError):
        pass

    # 策略 3：提取 ```json ... ``` 區塊
    try:
        match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
    except (json.JSONDecodeError, ValueError):
        pass

    # 策略 4：逐行移除非 JSON 內容後解析
    try:
        lines = text.split("\n")
        json_lines = []
        in_json = False
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("{"):
                in_json = True
            if in_json:
                json_lines.append(line)
            if stripped.endswith("}") and in_json:
                break
        if json_lines:
            return json.loads("\n".join(json_lines))
    except (json.JSONDecodeError, ValueError):
        pass

    # 全部失敗 → 回傳空結構，前端用 raw_reply fallback
    return {}

def agent_patrol() -> dict:
    prompt = "執行自主巡邏：1)查所有路段飽和度 2)判定異常級別 3)查漫遊率 4)查即時事件 5)產出摘要和預警"
    return run_agent(prompt)
