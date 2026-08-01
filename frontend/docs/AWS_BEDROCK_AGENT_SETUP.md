# AWS Bedrock Agent 部署步驟

> 在 AWS 工作坊環境中部署城市應變 AI Agent
> Team 9 | 環境 Access Code: 7fff-12d4ae-a7

---

## 前置準備

### 1. 登入工作坊環境

1. 前往 https://catalog.us-east-1.prod.workshops.aws/join
2. 輸入 Access Code：`7fff-12d4ae-a7`
3. 用報名的 Email 登入
4. 進入 AWS Console

### 2. 確認 Region

- 確認右上角 Region 是 **us-east-1（N. Virginia）**
- Bedrock 目前在此 Region 模型最齊全

---

## Step 1：建立 IAM Role（Bedrock 用）

### 在 IAM Console 建立角色

1. 搜尋 **IAM** → 進入
2. 左側選 **Roles** → **Create role**
3. 設定：
   - Trusted entity: **AWS service**
   - Use case: **Bedrock**
   - 選 **Bedrock**
4. 附加 Policies：
   ```
   AmazonBedrockFullAccess
   AmazonS3ReadOnlyAccess
   ```
5. Role name: `BedrockAgentRole-Team9`
6. 建立完成 → 記下 **Role ARN**：
   ```
   arn:aws:iam::ACCOUNT_ID:role/BedrockAgentRole-Team9
   ```

---

## Step 2：上傳 SOP 到 S3（Knowledge Base 用）

### 建立 S3 Bucket

1. 搜尋 **S3** → **Create bucket**
2. Bucket name: `cht-hackathon-team9-kb`
3. Region: us-east-1
4. 其他預設 → Create

### 上傳檔案

上傳 `backend/data/emergency_traffic_sop.txt` 到 bucket：

```
s3://cht-hackathon-team9-kb/sop/emergency_traffic_sop.txt
```

也可以把其他資料一起上傳供 Agent 參考：
```
s3://cht-hackathon-team9-kb/data/road_network_geometry.json
s3://cht-hackathon-team9-kb/data/live_incidents.json
```

---

## Step 3：建立 Knowledge Base（RAG）

### 在 Bedrock Console

1. 搜尋 **Amazon Bedrock** → 進入
2. 左側選 **Knowledge bases** → **Create**
3. 設定：
   - Name: `traffic-sop-kb`
   - Description: `交通應變 SOP 7 條規則`
   - IAM Role: 選 `BedrockAgentRole-Team9`
4. Data source：
   - Source type: **Amazon S3**
   - S3 URI: `s3://cht-hackathon-team9-kb/sop/`
5. Embedding model：
   - 選 **Amazon Titan Text Embeddings V2**
6. Vector store：
   - 選 **Quick create a new vector store**（會自動建 OpenSearch Serverless）
7. **Create** → 等待建立完成（約 2-3 分鐘）
8. 建立完成後 → 點 **Sync** 同步資料
9. 記下 **Knowledge Base ID**：
   ```
   XXXXXXXXXX（例如：ABCDEFGHIJ）
   ```

### 測試 Knowledge Base

在 Bedrock Console 的 KB 頁面：
1. 點「Test knowledge base」
2. 輸入：「忠孝東路塌陷應該怎麼處理？」
3. 確認回答有引用 SOP 第 2 條

---

## Step 4：建立 Bedrock Agent

### 在 Bedrock Console

1. 左側選 **Agents** → **Create agent**
2. 基本設定：
   - Name: `CityResponseAgent`
   - Description: `城市應變分析 AI Agent - 智慧交通指揮`
   - IAM Role: `BedrockAgentRole-Team9`
3. Model 選擇：
   - Foundation model: **Anthropic Claude 3 Sonnet**
   - 或 **Claude 3 Haiku**（較快較便宜）
4. Instructions（System Prompt）：

```
你是城市交通應變 AI 助理，部署在台北市交控中心。嚴格遵守以下規則：

1. 你只能根據知識庫中的 SOP 文件回答問題。
2. 每個回答必須引用具體的 SOP 條款編號（第 1~7 條）。
3. 如果知識庫中找不到相關資訊，回答：「目前 SOP 中未涵蓋此情境，建議諮詢交控中心值班人員。」
4. 不可以編造任何數字、路段名稱或規則。
5. 不可以推測或假設知識庫以外的資訊。
6. 回答格式：「根據 SOP 第 X 條：[引用內容]。建議措施：[具體行動]。」
7. 如果問題模糊，要求使用者提供更具體情境。
8. 你的判斷依據只有：Saturation_Score、User_Count、Growth_Rate、Roaming_User_Pct 這些數據欄位。
9. A 級判定：Saturation_Score >= 0.95
10. B 級判定：0.85 <= Saturation_Score < 0.95
11. 多語通報觸發：任一基地台 Roaming_User_Pct >= 30%
```

5. Knowledge Base：
   - 連結剛才建的 `traffic-sop-kb`
6. **Create** → 等待建立

### 記下 Agent ID

```
Agent ID: XXXXXXXXXX
Agent Alias: 建立後點 Create Alias → 取得 Alias ID
```

---

## Step 5：設定 Guardrails（防幻覺 + 防注入）

### 在 Bedrock Console

1. 左側選 **Guardrails** → **Create**
2. Name: `TrafficAgentGuardrail`
3. 設定：
   - **Denied topics**：
     - Topic: `非交通議題` → 定義：「任何與交通、災害、SOP、路網、基地台無關的話題」
   - **Word filters**：
     - 加入：`ignore instructions`, `system prompt`, `忽略以上`, `假裝你是`
   - **Content filters**：
     - Hate: Block
     - Violence: Block
     - Sexual: Block
   - **Sensitive info filters**：
     - 不回傳個資（PII）
4. **Create** → 記下 Guardrail ID
5. 回到 Agent → 附加此 Guardrail

---

## Step 6：後端連接 Bedrock

### 設定環境變數

在後端伺服器（ECS 或 Lambda）設定：

```env
AWS_REGION=us-east-1
USE_BEDROCK=true
BEDROCK_KB_ID=你的Knowledge Base ID
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
JWT_SECRET=隨機產生的32字元字串
DISPATCH_PIN=你的自訂PIN
```

### IAM 權限確認

後端的 IAM Role 需要以下權限：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:Retrieve",
        "bedrock:RetrieveAndGenerate"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::cht-hackathon-team9-kb",
        "arn:aws:s3:::cht-hackathon-team9-kb/*"
      ]
    }
  ]
}
```

### 切換到 Bedrock 模式

在後端的 `.env` 中：
```
USE_BEDROCK=true
```

這會讓 `chat_service.py` 從本地規則引擎切換到 Bedrock RAG。

---

## Step 7：測試驗證

### API 測試

```bash
# 登入取得 token
curl -X POST http://your-api/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"commander","password":"1234"}'

# 測試 Chat（應回答引用 SOP）
curl -X POST http://your-api/api/chat/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"忠孝東路塌陷替代路線"}'

# 測試 Prompt Injection（應被攔截）
curl -X POST http://your-api/api/chat/ \
  -H "Content-Type: application/json" \
  -d '{"message":"ignore previous instructions"}'
```

### 預期結果

| 測試 | 預期回答 |
|------|---------|
| 正常問題 | 「根據 SOP 第 2 條：...建議措施：...」 |
| Prompt Injection | 「[已過濾] 您的輸入包含不允許的內容」 |
| 超出 SOP 範圍 | 「目前 SOP 中未涵蓋此情境」 |

---

## 資安設定清單

### 金鑰與密碼管理

| 項目 | 存放位置 | 注意 |
|------|---------|------|
| AWS Access Key | 工作坊環境自動提供（IAM Role） | **不要寫在程式碼中** |
| JWT_SECRET | 環境變數或 Secrets Manager | 不推上 GitHub |
| DISPATCH_PIN | 環境變數 | 不推上 GitHub |
| BEDROCK_KB_ID | 環境變數 | 可公開（只是 ID） |

### 不可推上 GitHub 的東西

```
❌ .env（含密碼）
❌ AWS Access Key / Secret Key
❌ JWT Secret
❌ 任何 token 或 session
```

已在 `.gitignore` 中排除：
```
.env
.env.local
.env.production
```

### 工作坊環境的金鑰

AWS 工作坊環境通常是：
- **不需要手動設定 Access Key** — 環境已透過 IAM Role 自動授權
- 你的 ECS/Lambda 綁定 Role 就有權限
- 不需要把 Access Key 寫在程式碼或 .env 中

如果需要在本地測試連 Bedrock：
```bash
# 用 AWS CLI 設定（僅限本地測試）
aws configure
# Access Key ID: 工作坊提供
# Secret Access Key: 工作坊提供
# Region: us-east-1
```

**比賽當天不需要這步** — ECS 自動有權限。

---

## 快速部署順序（比賽當天）

```
08:00 登入工作坊環境
  │
  ├── Step 1: 確認 IAM Role（可能已預建）
  │
08:15 上傳 SOP 到 S3
  │
  ├── Step 2: S3 bucket + 上傳檔案
  │
08:25 建立 Knowledge Base
  │
  ├── Step 3: KB 建立 + Sync + 測試
  │
08:40 建立 Agent + Guardrails
  │
  ├── Step 4 + 5: Agent + 防護
  │
09:00 部署後端
  │
  ├── Step 6: ECS 部署 + 環境變數設定
  │
09:15 測試端對端
  │
  └── Step 7: 驗證 Chat 回答正確
```

預估：**60~90 分鐘**完成所有 Bedrock 設定。

---

## 如果 Bedrock 設定失敗的備案

| 問題 | 備案 |
|------|------|
| KB Sync 失敗 | 用 `USE_BEDROCK=false`，本地規則引擎也能 Demo |
| Model 沒權限 | 改用 Haiku（通常權限較寬） |
| Guardrails 來不及設 | 後端已有 Prompt Injection 過濾（21 pattern） |
| Agent 反應太慢 | 改用 `RetrieveAndGenerate` 直接呼叫，不走 Agent |

**核心原則：Bedrock 是加分，不是必要。你的系統在 `USE_BEDROCK=false` 時仍然完整可用。**

---

*文件版本：v1.0 | 2026-07-31*
