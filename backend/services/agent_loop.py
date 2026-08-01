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
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

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
    {"toolSpec": {"name": "check_sop_rules", "description": "查詢 SOP 規則，可用條款編號或關鍵字。", "inputSchema": {"json": {"type": "object", "properties": {"query": {"type": "string", "description": "條款編號或關鍵字"}}, "required": ["query"]}}}},
    {"toolSpec": {"name": "get_live_incidents", "description": "查詢即時事件清單。", "inputSchema": {"json": {"type": "object", "properties": {}, "required": []}}}},
    {"toolSpec": {"name": "classify_traffic_level", "description": "根據飽和度判定級別：A級>=0.95、B級>=0.85。", "inputSchema": {"json": {"type": "object", "properties": {"saturation_score": {"type": "number", "description": "飽和度(0-1)"}}, "required": ["saturation_score"]}}}},
    {"toolSpec": {"name": "generate_multilang_alert", "description": "產出中英日韓四語緊急通報。", "inputSchema": {"json": {"type": "object", "properties": {"incident_description": {"type": "string", "description": "事件描述"}, "location": {"type": "string", "description": "位置"}, "alternative_routes": {"type": "string", "description": "替代路線"}}, "required": ["incident_description", "location"]}}}},
]


# ============ 工具執行 ============

def _execute_tool(tool_name: str, tool_input: dict) -> str:
    if tool_name == "check_road_saturation":
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

    return json.dumps({"error": f"Unknown tool: {tool_name}"})


# ============ Agent Loop ============

SYSTEM_PROMPT = """你是「城市應變分析 AI Agent」，一個智慧交通指揮系統的自主決策引擎。

## 你的角色
你能夠自主感知交通環境、分析數據、做出決策建議。請根據問題自主決定需要查詢哪些資料。

## 工作原則
1. 收到問題後，先思考需要什麼資訊，主動呼叫工具查詢
2. 根據查詢結果分析，如需更多資訊繼續呼叫工具
3. 所有建議必須引用 SOP 條款
4. 最終回答包含：[情況分析] + [SOP 依據] + [具體建議] + [ETE 預估]

## SOP 分級
- A 級（癱瘓）：Saturation_Score >= 0.95
- B 級（壅擠）：0.85 <= Saturation_Score < 0.95
- 多語通報：Roaming_User_Pct >= 30%

## 注意
- 不要編造數據，用工具查詢
- 替代路線排除飽和度 >= 0.85 的路段
- ETE 必須呼叫 calculate_ete 工具"""


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
            response = client.converse(
                modelId=BEDROCK_MODEL_ID,
                messages=messages,
                system=[{"text": system_text}],
                toolConfig={"tools": TOOLS},
                inferenceConfig={"maxTokens": 2048, "temperature": 0.2},
            )
        except Exception as e:
            return {"reply": f"[Agent Error] {e}", "tool_calls": tool_call_log, "iterations": iteration}

        output = response.get("output", {}).get("message", {})
        stop_reason = response.get("stopReason", "")
        messages.append({"role": "assistant", "content": output.get("content", [])})

        if stop_reason == "end_turn":
            final_text = "".join(b["text"] for b in output.get("content", []) if "text" in b)
            return {"reply": final_text, "tool_calls": tool_call_log, "iterations": iteration + 1}

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
