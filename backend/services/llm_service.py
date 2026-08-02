"""
LLM 服務層 — 統一封裝 Bedrock Claude 呼叫
用於：對話諮詢、導引文字生成、分析摘要、ETE解釋、多語通報
"""
import os
import json
from typing import Optional
from services.data_loader import data_store

USE_BEDROCK = os.getenv("USE_BEDROCK", "false").lower() == "true"
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0")
AWS_REGION = os.getenv("AWS_REGION", "us-west-2")
GUARDRAIL_ID = os.getenv("GUARDRAIL_ID", "")
GUARDRAIL_VERSION = os.getenv("GUARDRAIL_VERSION", "1")

_client = None


def _get_client():
    global _client
    if _client is None:
        import boto3
        _client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
    return _client


def invoke_llm(system_prompt: str, user_message: str, max_tokens: int = 1024) -> str:
    """呼叫 Bedrock Claude，回傳文字結果"""
    if not USE_BEDROCK:
        return ""

    try:
        client = _get_client()
        kwargs = dict(
            modelId=BEDROCK_MODEL_ID,
            messages=[
                {"role": "user", "content": [{"text": user_message}]}
            ],
            system=[{"text": system_prompt}],
            inferenceConfig={"maxTokens": max_tokens, "temperature": 0.3},
        )
        if GUARDRAIL_ID:
            kwargs["guardrailConfig"] = {
                "guardrailIdentifier": GUARDRAIL_ID,
                "guardrailVersion": GUARDRAIL_VERSION,
            }
        response = client.converse(**kwargs)
        # 檢查是否被 Guardrail 攔截
        if response.get("stopReason") == "guardrail_intervened":
            return response["output"]["message"]["content"][0]["text"]
        return response["output"]["message"]["content"][0]["text"]
    except Exception as e:
        print(f"[LLM Error] {e}")
        return ""


# ============ 1. 趨勢異常分析摘要 ============

def generate_anomaly_summary(anomalies: list) -> str:
    """趨勢異常時產出分析摘要"""
    if not USE_BEDROCK or not anomalies:
        return ""

    sop_context = data_store.sop_text[:2000]
    anomaly_text = "\n".join([
        f"- {a['road']}：{a['metric']} 目前 {a['current']}，正常值 {a['normal']}，偏差 {a['deviation']}"
        for a in anomalies
    ])

    system = f"""你是智慧交通指揮系統的 AI 分析師。根據以下 SOP 規則分析交通異常趨勢。
回答須簡潔（100字內），格式：[異常摘要] + [預判風險] + [建議動作]，並引用 SOP 條款。

SOP 規則摘要：
{sop_context}"""

    user_msg = f"以下路段出現趨勢異常，請產出分析摘要：\n{anomaly_text}"
    return invoke_llm(system, user_msg, max_tokens=300)


# ============ 2. 即時方案導引文字 ============

def generate_routing_guidance(incident: dict, alternatives: list, ete_minutes: int) -> str:
    """事件處理後產出導引文字"""
    if not USE_BEDROCK:
        return ""

    sop_context = data_store.sop_text[:2000]
    alt_text = "\n".join([
        f"- {a.get('name', '未知')}：飽和度 {a.get('saturation', 'N/A')}"
        for a in alternatives
    ])

    system = f"""你是智慧交通指揮系統。根據路網重規劃結果，產出面向民眾的導引文字。
要求：1) 簡潔明瞭 2) 包含替代路線 3) 預估恢復時間 4) 引用 SOP 依據

SOP 規則摘要：
{sop_context}"""

    user_msg = (
        f"事件：{incident.get('description', '交通事故')}\n"
        f"位置：{incident.get('location', '未知')}\n"
        f"嚴重度：{incident.get('severity', 'High')}\n"
        f"ETE：{ete_minutes} 分鐘\n"
        f"替代路線：\n{alt_text}\n\n"
        f"請產出導引文字（中文，100字內）。"
    )
    return invoke_llm(system, user_msg, max_tokens=300)


# ============ 3. 對話式策略諮詢 ============

def chat_with_sop(message: str) -> str:
    """根據 SOP 回答指揮官問題"""
    if not USE_BEDROCK:
        return ""

    sop_context = data_store.sop_text

    system = f"""你是城市交通應變 AI 助理。嚴格遵守以下規則：
1. 只能根據以下 SOP 文件回答問題。
2. 每個回答必須引用具體的 SOP 條款編號。
3. 如果 SOP 中找不到相關資訊，回答：「目前 SOP 中未涵蓋此情境，建議諮詢交控中心。」
4. 不可編造數字或規則。
5. 回答格式：「根據 SOP 第 X 條：[內容]。建議措施：[行動]。」

===== SOP 全文 =====
{sop_context}
===== SOP 結束 ====="""

    return invoke_llm(system, message, max_tokens=500)


# ============ 4. ETE 解釋 ============

def explain_ete(ete_minutes: int, severity: str, saturation_avg: float, incident_desc: str) -> str:
    """解釋 ETE 計算結果"""
    if not USE_BEDROCK:
        return ""

    sop_context = data_store.sop_text[:2000]

    system = f"""你是交通 AI 系統，負責向指揮官解釋 ETE（預計交通恢復時間）計算結果。
用白話文解釋，引用 SOP 第 7 條公式，說明每個參數的意義。

SOP 摘要：
{sop_context}"""

    user_msg = (
        f"事件：{incident_desc}\n"
        f"嚴重度：{severity}\n"
        f"平均飽和度：{saturation_avg:.2f}\n"
        f"計算結果 ETE = {ete_minutes} 分鐘\n\n"
        f"請用 2-3 句話解釋這個結果是如何計算的，以及為什麼是這個數值。"
    )
    return invoke_llm(system, user_msg, max_tokens=300)


# ============ 5. 多語通報文字 ============

def generate_multilang_alert(incident_desc: str, location: str, alternatives: str, ete: int) -> dict:
    """產出中/英/日/韓四語緊急通報"""
    if not USE_BEDROCK:
        return {}

    system = """你是多語交通警報系統。根據事件資訊產出四種語言的簡短交通警報（每語約40字）。
格式必須為 JSON：{"zh": "...", "en": "...", "ja": "...", "ko": "..."}
內容包含：事件說明、替代路線、預估恢復時間。不要加任何其他文字。"""

    user_msg = (
        f"事件：{incident_desc}\n"
        f"位置：{location}\n"
        f"替代路線：{alternatives}\n"
        f"預估恢復：{ete} 分鐘\n\n"
        f"請產出四語警報 JSON。"
    )

    result = invoke_llm(system, user_msg, max_tokens=500)

    # 解析 JSON
    try:
        json_match = result[result.find("{"):result.rfind("}") + 1]
        return json.loads(json_match)
    except (json.JSONDecodeError, ValueError):
        return {}
