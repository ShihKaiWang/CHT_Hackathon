"""
AWS 服務整合層 — DynamoDB / SNS / SSM Parameter Store / Bedrock Guardrails
所有 AWS 服務呼叫集中在此，方便管理和 fallback
"""
import os
import json
from datetime import datetime

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE", "cht-hackathon-events")
SNS_TOPIC_ARN = os.getenv("SNS_TOPIC_ARN", "arn:aws:sns:us-east-1:714134783639:cht-hackathon-alerts")
GUARDRAIL_ID = os.getenv("GUARDRAIL_ID", "71wdn9xn9mc5")
GUARDRAIL_VERSION = os.getenv("GUARDRAIL_VERSION", "1")

_dynamo = None
_sns = None
_ssm = None
_bedrock = None


def _get_dynamo():
    global _dynamo
    if _dynamo is None:
        import boto3
        _dynamo = boto3.resource("dynamodb", region_name=AWS_REGION).Table(DYNAMODB_TABLE)
    return _dynamo


def _get_sns():
    global _sns
    if _sns is None:
        import boto3
        _sns = boto3.client("sns", region_name=AWS_REGION)
    return _sns


def _get_ssm():
    global _ssm
    if _ssm is None:
        import boto3
        _ssm = boto3.client("ssm", region_name=AWS_REGION)
    return _ssm


def _get_bedrock():
    global _bedrock
    if _bedrock is None:
        import boto3
        _bedrock = boto3.client("bedrock-runtime", region_name=AWS_REGION)
    return _bedrock


# ============ DynamoDB ============

def save_incident(incident_data: dict) -> bool:
    try:
        table = _get_dynamo()
        table.put_item(Item={
            "pk": "INCIDENT",
            "sk": f"{datetime.now().isoformat()}#{incident_data.get('event', 'unknown')}",
            "timestamp": datetime.now().isoformat(),
            "data": json.dumps(incident_data, ensure_ascii=False, default=str),
            "type": "incident",
        })
        return True
    except Exception as e:
        print(f"[DynamoDB Error] save_incident: {e}")
        return False


def save_audit_log(ip: str, method: str, path: str, user: str, status: int, detail: str) -> bool:
    try:
        table = _get_dynamo()
        table.put_item(Item={
            "pk": "AUDIT",
            "sk": datetime.now().isoformat(),
            "ip": ip, "method": method, "path": path,
            "user": user, "status": status, "detail": detail,
            "type": "audit",
        })
        return True
    except Exception as e:
        print(f"[DynamoDB Error] save_audit: {e}")
        return False


def save_agent_trace(action: str, tool_calls: list, iterations: int, reply_preview: str) -> bool:
    try:
        table = _get_dynamo()
        table.put_item(Item={
            "pk": "AGENT_TRACE",
            "sk": datetime.now().isoformat(),
            "action": action,
            "tool_calls": json.dumps(tool_calls, ensure_ascii=False, default=str),
            "iterations": iterations,
            "reply_preview": reply_preview[:500],
            "type": "agent_trace",
        })
        return True
    except Exception as e:
        print(f"[DynamoDB Error] save_agent_trace: {e}")
        return False


def get_recent_incidents(limit: int = 20) -> list:
    try:
        table = _get_dynamo()
        response = table.query(
            KeyConditionExpression="pk = :pk",
            ExpressionAttributeValues={":pk": "INCIDENT"},
            ScanIndexForward=False, Limit=limit,
        )
        return response.get("Items", [])
    except Exception as e:
        print(f"[DynamoDB Error] get_recent_incidents: {e}")
        return []


# ============ SNS ============

def send_alert_notification(subject: str, message: str) -> bool:
    try:
        _get_sns().publish(TopicArn=SNS_TOPIC_ARN, Subject=subject[:100], Message=message[:2048])
        print(f"[SNS] Alert sent: {subject}")
        return True
    except Exception as e:
        print(f"[SNS Error] {e}")
        return False


def notify_incident(event_name: str, severity: str, location: str, extra_data: dict = None) -> bool:
    """事件發生時通知指揮官 — 包含完整分析資訊"""
    extra = extra_data or {}
    alternatives = extra.get("alternative_routes", [])
    ete = extra.get("ete", {})
    level = extra.get("level", "")
    affected = extra.get("affected_roads", [])

    alt_text = ""
    for alt in alternatives[:3]:
        alt_text += f"  * {alt.get('path', alt.get('name', ''))}\n"

    subject = f"[{severity}] 交通事件通報 - {event_name}"
    message = (
        f"======================================\n"
        f"  城市應變分析 AI Agent - 事件通報\n"
        f"======================================\n\n"
        f"事件：{event_name}\n"
        f"位置：{location}\n"
        f"嚴重度：{severity}（{level} 級）\n"
        f"時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"\n"
        f"--- AI Agent 分析結果 ---\n"
        f"* ETE 預估恢復時間：{ete.get('ete_minutes', 'N/A')} 分鐘\n"
        f"* 影響路段：{', '.join(affected) if affected else 'N/A'}\n"
        f"* 替代路線：\n{alt_text if alt_text else '  (分析中)'}\n"
        f"\n"
        f"--- 操作連結 ---\n"
        f"Dashboard：https://d29bomxt4wi5pg.cloudfront.net\n"
        f"民眾端：https://d29bomxt4wi5pg.cloudfront.net/?mode=public\n"
        f"\n"
        f"此通報由 AI Agent 自動產出，經系統安全驗證。\n"
    )

    line_msg = (
        f"\n🚨 城市應變 AI Agent 通報\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📋 事件：{event_name}\n"
        f"📍 位置：{location}\n"
        f"⚠️ 等級：{severity}（{level} 級）\n"
        f"⏱️ ETE：{ete.get('ete_minutes', 'N/A')} 分鐘\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🛤️ 替代路線：\n{alt_text if alt_text else '  分析中...'}"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🔗 https://d29bomxt4wi5pg.cloudfront.net\n"
    )

    sns_ok = send_alert_notification(subject, message)
    line_ok = send_line_notify(line_msg)
    return sns_ok or line_ok


# ============ LINE Messaging API ============

LINE_CHANNEL_TOKEN = os.getenv("LINE_CHANNEL_TOKEN", "")
LINE_USER_ID = os.getenv("LINE_USER_ID", "")


def send_line_notify(message: str) -> bool:
    """透過 LINE Messaging API Push Message 發送通知"""
    if not LINE_CHANNEL_TOKEN or not LINE_USER_ID:
        print("[LINE] No token or user ID configured, skipping")
        return False
    try:
        import urllib.request
        data = json.dumps({
            "to": LINE_USER_ID,
            "messages": [{"type": "text", "text": message}]
        }).encode()
        req = urllib.request.Request(
            "https://api.line.me/v2/bot/message/push",
            data=data,
            headers={
                "Authorization": f"Bearer {LINE_CHANNEL_TOKEN}",
                "Content-Type": "application/json",
            },
        )
        urllib.request.urlopen(req, timeout=10)
        print(f"[LINE] Push message sent")
        return True
    except Exception as e:
        print(f"[LINE Error] {e}")
        return False


# ============ SSM Parameter Store ============

def get_parameter(name: str, default: str = "") -> str:
    try:
        return _get_ssm().get_parameter(Name=name, WithDecryption=True)["Parameter"]["Value"]
    except Exception as e:
        print(f"[SSM Fallback] {name}: {e}")
        env_key = name.split("/")[-1].upper().replace("-", "_")
        return os.getenv(env_key, default)


# ============ Bedrock Guardrails ============

def apply_guardrail(text: str, source: str = "INPUT") -> dict:
    try:
        response = _get_bedrock().apply_guardrail(
            guardrailIdentifier=GUARDRAIL_ID,
            guardrailVersion=GUARDRAIL_VERSION,
            source=source,
            content=[{"text": {"text": text}}],
        )
        if response.get("action") == "GUARDRAIL_INTERVENED":
            outputs = response.get("outputs", [])
            return {"action": "BLOCKED", "output": outputs[0]["text"] if outputs else "內容已被安全過濾。"}
        return {"action": "PASS", "output": text}
    except Exception as e:
        print(f"[Guardrail Error] {e}")
        return {"action": "PASS", "output": text}


def check_input_safety(user_input: str) -> dict:
    return apply_guardrail(user_input, source="INPUT")


def check_output_safety(ai_output: str) -> dict:
    return apply_guardrail(ai_output, source="OUTPUT")
