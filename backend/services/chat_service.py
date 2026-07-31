"""
對話服務 — RAG 檢索 SOP + LLM 回答
支援本地模式（不需 AWS）和 Bedrock 模式
"""
import os
import re
from services.data_loader import data_store

# 是否使用 AWS Bedrock（預設 False，本地用規則引擎回答）
USE_BEDROCK = os.getenv("USE_BEDROCK", "false").lower() == "true"


def answer_question(message: str) -> str:
    """回答使用者問題"""
    if USE_BEDROCK:
        return _bedrock_rag_answer(message)
    return _local_rule_answer(message)


def _local_rule_answer(message: str) -> str:
    """本地規則引擎回答（不需 AWS，Demo 可用）"""
    sop = data_store.sop_text
    msg = message.lower()

    # 路面塌陷 / 替代路線相關
    if any(k in message for k in ["塌陷", "替代", "改道", "封閉", "忠孝"]):
        return (
            "根據 SOP 第 2 條（主疏散規則），系統建議以下替代路徑：\n\n"
            "1. **仁愛路四段**（飽和度 58%，餘量 924 車/時）→ ETE 12 分鐘\n"
            "2. **市民大道四段**（飽和度 62%，餘量 950 車/時）→ ETE 15 分鐘\n\n"
            "已排除基隆路一段（飽和度 94% > 85% 閾值）。\n"
            "上游路口（延吉街口）號誌已建議延長綠燈 +25%。"
        )

    # 漫遊率 / 多語通報
    if any(k in message for k in ["漫遊", "30%", "多語", "通報", "roaming"]):
        return (
            "根據 SOP 第 6 條：\n\n"
            "**觸發條件**：任一基地台漫遊率 ≥ 30%\n\n"
            "目前大巨蛋站 (BL17) 漫遊率為 35%，已觸發多語通報。\n"
            "系統自動產出中文、英文、日文、韓文四語版本，"
            "透過 CBS 細胞廣播 + SMS + 電子看板同步發送。"
        )

    # BL17 / 人數增加
    if any(k in message for k in ["BL17", "40000", "四萬", "人數增加"]):
        return (
            "根據 SOP 第 4 條，系統重新評估：\n\n"
            "若 BL17（大巨蛋站）用戶數增至 40,000：\n"
            "- 漫遊率維持 35% → 漫遊用戶約 14,000 人\n"
            "- 仍觸發 SOP 第 6 條多語通報\n"
            "- 建議觸發 SOP 第 3 條跨系統聯動（捷運加開、公車改道）\n"
            "- 人群密度超過安全閾值，建議啟動過站不停 + 接駁分流"
        )

    # 號誌故障
    if any(k in message for k in ["號誌", "故障", "紅綠燈"]):
        return (
            "根據 SOP 第 5 條（號誌異常處置）：\n\n"
            "1. 通知交通大隊派員該路口手動指揮\n"
            "2. 鄰近路口號誌切為閃光黃燈模式\n"
            "3. 若該路口為主要幹道交叉口，啟動第 3 條跨系統聯動"
        )

    # ETE / 恢復時間
    if any(k in message for k in ["ETE", "恢復", "多久", "時間"]):
        return (
            "根據 SOP 第 7 條 ETE 計算公式：\n\n"
            "ETE = Base_Time × Severity_Factor + Signal_Delay\n\n"
            "以目前事件（路面塌陷、A 級）：\n"
            "- Base_Time = 20 分鐘\n"
            "- Severity_Factor = 1.5（A 級）\n"
            "- Signal_Delay = +5 分鐘（≥3 路口）\n"
            "- **ETE = 20 × 1.5 + 5 = 35 分鐘**\n\n"
            "預計恢復時間：15:07"
        )

    # 活動散場
    if any(k in message for k in ["散場", "演唱會", "活動", "大巨蛋"]):
        return (
            "根據 SOP 第 2、3 條，大型活動散場建議：\n\n"
            "1. 散場前 30 分鐘通知捷運加開（第 3 條）\n"
            "2. 散場前 20 分鐘號誌切換疏散模式（+40%）\n"
            "3. 散場前 15 分鐘警力到位\n"
            "4. 散場前 10 分鐘接駁車就位\n"
            "5. 散場時 CBS 推播疏散指引（第 6 條若漫遊率觸發）"
        )

    # 預設回答
    return (
        f"根據 SOP 規範，系統正在分析您的問題：「{message}」\n\n"
        "本系統依據以下 SOP 條款提供建議：\n"
        "- 第 1 條：事件分級\n"
        "- 第 2 條：主疏散規則\n"
        "- 第 3 條：跨系統聯動\n"
        "- 第 5 條：號誌異常處置\n"
        "- 第 6 條：多語通報\n"
        "- 第 7 條：ETE 計算\n\n"
        "請提供更具體的情境或數據，以便精確回答。"
    )


def _bedrock_rag_answer(message: str) -> str:
    """使用 AWS Bedrock Knowledge Base RAG 回答"""
    try:
        import boto3

        region = os.getenv("AWS_REGION", "us-east-1")
        kb_id = os.getenv("BEDROCK_KB_ID", "")
        model_id = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")

        client = boto3.client("bedrock-agent-runtime", region_name=region)

        response = client.retrieve_and_generate(
            input={"text": message},
            retrieveAndGenerateConfiguration={
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": {
                    "knowledgeBaseId": kb_id,
                    "modelArn": f"arn:aws:bedrock:{region}::foundation-model/{model_id}",
                },
            },
        )

        return response["output"]["text"]

    except Exception as e:
        # Bedrock 失敗時 fallback 到本地規則
        return _local_rule_answer(message)
