# 城市應變分析 AI Agent — 使用說明書

> 中華電信 2026 AI Hackathon｜智慧交通指揮 Dashboard

---

## 目錄

1. [系統概述](#系統概述)
2. [指揮官操作手冊](#指揮官操作手冊)
3. [民眾使用手冊](#民眾使用手冊)
4. [系統功能總覽](#系統功能總覽)
5. [部署與架設指南](#部署與架設指南)
6. [後端對接準備](#後端對接準備)
7. [AWS 架設清單](#aws-架設清單)

---

## 系統概述

本系統為具備「自動感知」與「互動決策」能力的智慧交通指揮 Dashboard。系統能隨時間推移自動偵測異常，接收突發事件後於 60 秒內產出專業指揮建議與多語民眾通報。

### 核心能力

| 能力 | 說明 |
|------|------|
| 自動感知 | AI Agent 每 30 秒巡邏所有數據源，主動偵測趨勢異常 |
| 預測預警 | 在問題發生前 8-30 分鐘提出預測性告警 |
| 60 秒應變 | 事件注入後 60 秒內完成路網重規劃 |
| 多語通報 | 漫遊率 ≥ 30% 自動產出中/英/日/韓四語通報 |
| 跨系統聯動 | 自動產出對北捷、公車、警力的協調請求 |

### 技術棧

- 前端：React 18 / Vite 6 / Tailwind CSS 4 / Recharts / Leaflet
- 後端：Python 3.12 / FastAPI / LangChain / Pandas
- AI：Amazon Bedrock (Claude) / RAG Knowledge Base
- 通訊：REST API + WebSocket
- 部署：AWS (S3 + CloudFront + ECS + Bedrock)

---

## 指揮官操作手冊

### 登入

1. 開啟系統後點擊「🔐 資安」Tab
2. 選擇「🎖️ 指揮官」角色
3. 輸入密碼（正式環境使用 Cognito SSO）
4. 登入後擁有完整系統權限

### 日常監控流程

#### Step 1：動態監測

- 進入「動態監測」Tab
- 查看即時路網態勢圖（衛星地圖）
  - 紅色虛線 = 封閉路段
  - 綠色實線 = 替代路線
  - 圓圈 = 基地台覆蓋（黃色=漫遊觸發）
- 查看車流量時序圖 + 右側 TOP 5 排名
- 查看基地台人流密度 + 右側 TOP 5 排名
- 注意 Toast 預警彈窗（右上角自動出現）

#### Step 2：主動預警監控

- 進入「🤖 主動預警」Tab
- 觀察 AI Agent 巡邏 Log（自動運行）
- 查看預測性告警（含倒數計時+信心度）
- 決定是否「立即執行」建議動作
- 可按「🛡️ 一鍵採納所有預防建議」

#### Step 3：突發事件處理

- 進入「突發事件」Tab
- 方式一：匯入 live_incidents.json（按「📂 選擇 JSON 檔案」）
- 方式二：手動選擇事件類型 + 地點
- 系統自動匹配 SOP 條款（第 2/3/5 條）
- 按「送出事件 → 啟動應變」
- 觀察 60 秒倒數 + 應變方案產出

#### Step 4：AI 決策審查

- 進入「AI 決策」Tab
- 查看 ETE 計算推導（公式逐步展開）
- 查看排除路線分析（為何不選某些路）
- 審閱交控中心建議書（五大區段）
- 審閱多語化民眾簡訊（SMS/CMS 格式）
- 可匯出 Markdown 或列印

#### Step 5：發送通報

- 進入「多語通報」Tab
- 確認漫遊率觸發狀態
- 選擇通報管道（CBS/SMS/CMS/APP/社群/導航）
- 按「👁️ 預覽」查看各管道呈現方式
- 按「🚀 發送通報」
- 系統要求 PIN 確認 + 5 秒倒數
- 確認後通報發送，狀態即時追蹤

#### Step 6：策略諮詢

- 任何頁面點擊 Header「💬 策略諮詢」按鈕
- 右側滑出對話視窗
- 可輸入 What-if 問題，例如：
  - 「如果忠孝東路塌陷，替代路線有哪些？」
  - 「BL17 增至 40,000，會觸發什麼？」
  - 「漫遊率超過 30% 時應該做什麼？」

### 進階功能

| 功能 | 操作 |
|------|------|
| 全屏指揮模式 | Header 右上「全屏」按鈕，ESC 退出 |
| 一鍵 Demo | 「🎬 Demo」Tab → 按「▶ 啟動 Demo」 |
| 大型活動模擬 | 「🏟️ 活動模擬」Tab → 選活動 → 開始模擬 |
| 天氣連動 | 「🌧️ 天氣連動」Tab → 選天氣情境或自動演變 |
| 共享運具調度 | 「🚲 運具調度」Tab → 查看 AI 調度建議 |

---

## 民眾使用手冊

### 進入民眾模式

1. 點擊 Header 右上的「📱 民眾模式」綠色按鈕
2. 進入手機友善的路況查詢頁面
3. 左上角「← 返回指揮官模式」可切回

### 民眾可用功能

#### 查看即時路況

- 目前事件列表（封閉狀態 + 恢復倒數）
- 建議替代路線（多花幾分鐘 + 壅塞程度）
- 附近大眾運輸狀態（捷運/公車是否正常）
- 安全提醒

#### 語音播報

- 選擇語言（中/英/日/韓）
- 按「▶ 播報」聽取路況
- 按「🌐 全語播報」依序播四種語言
- 適合開車時使用

#### 智慧出行規劃

- 選擇起點和終點
- 系統產出多種方案比較：
  - 捷運 / 公車 / YouBike / 計程車 / 步行
- 每方案標示：時間 / 費用 / 碳排 / 舒適度
- 受事件影響的方案會標示⚠️

#### 公眾回報

- 按「＋ 我要回報」
- 選擇事件類型（塞車/事故/積水/路面損壞等）
- 選擇嚴重程度
- 輸入地點和描述
- 送出後可追蹤處理進度
- 可「👍 附議」他人的回報

---

## 系統功能總覽

| Tab | 功能 | 對應命題模組 |
|-----|------|-------------|
| 動態監測 | 地圖 + 車流圖 + 人流圖 + 告警 | 模組 1 |
| 🤖 主動預警 | AI Agent 巡邏 + 預測告警 | 模組 1 加強 |
| 突發事件 | JSON 注入 + SOP 匹配 + 60 秒應變 | 模組 2 |
| AI 決策 | ETE 公式 + 建議書 + 民眾簡訊 | 模組 4 + 產出 |
| 多語通報 | 漫遊率 + 四語 + 六管道發送 | 模組 5 |
| 🚌 智慧出行 | MaaS 路線規劃 + 碳排比較 | 延伸功能 |
| 🚲 運具調度 | YouBike/機車供需 + AI 調度 | 延伸功能 |
| 📢 公眾回報 | 民眾回報 + 附議 + 交叉驗證 | 延伸功能 |
| 🏟️ 活動模擬 | 散場模擬 + 事前部署建議 | 延伸功能 |
| 🌧️ 天氣連動 | 天氣影響 + 積水 + 雨天方案 | 延伸功能 |
| 🔐 資安 | 角色登入 + PIN 確認 + Audit Log | 安全機制 |
| 🎬 Demo | 一鍵自動展示完整流程 | Demo 用 |

### 跨頁面功能

| 功能 | 說明 |
|------|------|
| 💬 策略諮詢（側邊欄） | 任何頁面可開啟，RAG 對話 |
| 📱 民眾模式 | 切換到手機友善公開頁面 |
| 全屏模式 | 隱藏 header，適合投影 |
| Toast 預警 | 右上角自動彈出即時告警 |
| StatusBar | 頂部即時狀態列（連線/事件/飽和度） |

---

## 部署與架設指南

### 本地開發

```bash
cd frontend
npm install
npm run dev
# 開啟 http://localhost:5173
```

### 建置生產版本

```bash
npm run build
# 產出在 dist/ 資料夾
```

### 前端部署到 AWS S3

```bash
# 1. 建立 S3 bucket
aws s3 mb s3://cht-hackathon-frontend

# 2. 設定靜態網站代管
aws s3 website s3://cht-hackathon-frontend \
  --index-document index.html \
  --error-document index.html

# 3. 上傳 build 檔案
aws s3 sync dist/ s3://cht-hackathon-frontend --delete

# 4. 設定 CloudFront（HTTPS + CDN）
# 在 AWS Console 建立 Distribution，Origin 指向 S3
```

---

## 後端對接準備

### API 規格（前端預期的端點）

```
GET  /api/dashboard/traffic     → 車流時序資料
GET  /api/dashboard/alerts      → 當前告警列表
WS   /api/dashboard/ws          → WebSocket 即時推送
POST /api/incidents/process     → 處理事件 → 應變方案
POST /api/incidents/report      → 生成交控中心建議書
POST /api/chat/                 → 對話式 SOP 諮詢
GET  /api/dashboard/multilang-report → 多語通報內容
```

### 切換到真實後端

編輯 `src/services/api.js`：

```javascript
const USE_MOCK = false  // 改為 false
```

所有 API 呼叫會自動轉到 `/api/*`，由 `vite.config.js` proxy 轉發到 `http://localhost:8000`。

### 後端需要準備的回應格式

#### GET /api/dashboard/traffic

```json
{
  "flow": [
    { "time": "08:00", "路段A_忠孝東路": 850, "路段B_中山北路": 720, ... },
    ...
  ],
  "saturation": [
    { "id": "R001", "name": "忠孝東路四段", "saturation": 0.92, "status": "critical" },
    ...
  ]
}
```

#### POST /api/incidents/process

Request:
```json
{
  "type": "road_collapse",
  "location": "忠孝東路四段",
  "description": "路面塌陷"
}
```

Response:
```json
{
  "event": "忠孝東路四段道路塌陷",
  "severity": "critical",
  "affected_roads": ["忠孝東路四段", "忠孝東路五段", "大安路一段"],
  "alternative_routes": [
    { "path": "仁愛路四段 → 復興南路", "ete": "12 分鐘", "congestion": "low" }
  ],
  "signal_adjustments": [
    { "intersection": "忠孝/復興路口", "action": "綠燈延長 15 秒" }
  ],
  "processing_time_sec": 8.2
}
```

#### POST /api/chat/

Request:
```json
{ "message": "如果忠孝東路塌陷，替代路線有哪些？" }
```

Response:
```json
{ "reply": "根據 SOP 第 2 條，建議路徑：1. 仁愛路四段（ETE 12 分）..." }
```

### WebSocket 推播格式

```json
{
  "id": 1690000000000,
  "time": "14:32",
  "type": "saturation",
  "level": "critical",
  "message": "忠孝東路四段飽和度達 92%",
  "road": "忠孝東路四段"
}
```

---

## AWS 架設清單

### 必要服務（最小可用）

| # | 服務 | 用途 | 優先度 |
|---|------|------|--------|
| 1 | S3 | 前端靜態檔案存放 | ⭐⭐⭐ |
| 2 | CloudFront | CDN + HTTPS | ⭐⭐⭐ |
| 3 | ECS Fargate 或 Lambda | 後端 FastAPI 運行 | ⭐⭐⭐ |
| 4 | Bedrock | LLM 對話 + RAG | ⭐⭐⭐ |
| 5 | DynamoDB | 車流/事件/Audit 資料 | ⭐⭐ |
| 6 | API Gateway | WebSocket 管理 | ⭐⭐ |
| 7 | Cognito | 使用者認證 | ⭐⭐ |

### 進階服務（完整版）

| # | 服務 | 用途 |
|---|------|------|
| 8 | Kinesis | 即時車流數據串流 |
| 9 | SNS | SMS 簡訊發送 |
| 10 | EventBridge | 排程觸發 AI Agent |
| 11 | WAF | Web 防火牆 |
| 12 | CloudTrail | 完整操作稽核 |
| 13 | Secrets Manager | API Key 管理 |

### 需要預先準備的程式碼

#### 1. 後端 Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 2. 後端 requirements.txt

```
fastapi==0.115.0
uvicorn==0.32.0
langchain==0.3.0
langchain-aws==0.2.0
boto3==1.35.0
pandas==2.2.0
python-dotenv==1.0.0
websockets==13.0
pydantic==2.9.0
```

#### 3. Bedrock RAG 設定（上傳 SOP）

```python
import boto3

bedrock_agent = boto3.client('bedrock-agent')

# 建立 Knowledge Base
response = bedrock_agent.create_knowledge_base(
    name='traffic-sop-kb',
    description='交通應變 SOP 7 條規則',
    roleArn='arn:aws:iam::ACCOUNT:role/BedrockKBRole',
    knowledgeBaseConfiguration={
        'type': 'VECTOR',
        'vectorKnowledgeBaseConfiguration': {
            'embeddingModelArn': 'arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0'
        }
    },
    storageConfiguration={
        'type': 'OPENSEARCH_SERVERLESS',
        ...
    }
)
```

#### 4. 環境變數（.env）

```env
# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_KB_ID=your-knowledge-base-id

# Database
DYNAMODB_TABLE_TRAFFIC=traffic_flow
DYNAMODB_TABLE_EVENTS=incidents
DYNAMODB_TABLE_AUDIT=audit_log

# Auth
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id
```

#### 5. 前端生產環境設定

建立 `frontend/.env.production`：

```env
VITE_API_BASE=https://api.your-domain.com
VITE_WS_URL=wss://ws.your-domain.com
```

修改 `src/services/api.js`：

```javascript
const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const USE_MOCK = import.meta.env.VITE_API_BASE ? false : true
```

---

## 對接 Checklist

### 前端（A）要做的

- [x] 所有 UI 元件完成
- [x] Mock data 可獨立運行
- [x] API service layer 抽象化（USE_MOCK 開關）
- [ ] 切換 `USE_MOCK = false` 測試真實 API
- [ ] 處理 API error state（loading/error/empty）
- [ ] 部署到 S3 + CloudFront

### 後端（B/C）要做的

- [ ] FastAPI 伺服器啟動（main.py）
- [ ] 實作 5 個 API 端點
- [ ] 接入 Bedrock RAG（Chat 對話）
- [ ] 實作 WebSocket 推播
- [ ] 讀取 5 個官方資料檔案
- [ ] SOP 邏輯引擎（7 條規則）
- [ ] Dockerfile 打包

### 整合（D）要做的

- [ ] AWS 帳號設定 + IAM 角色
- [ ] S3 + CloudFront 部署前端
- [ ] ECS/Lambda 部署後端
- [ ] Bedrock Knowledge Base 設定
- [ ] DynamoDB 建表
- [ ] Cognito User Pool 設定
- [ ] API Gateway WebSocket 設定
- [ ] 域名 + SSL 設定

---

## 常見問題

**Q: 前端跑不起來？**
```bash
cd C:\Users\劉炤輝\Downloads\CHT_Hackathon\frontend
npm install
npm run dev
```

**Q: 怎麼切換到真實後端？**
修改 `src/services/api.js` 中 `USE_MOCK = false`

**Q: Demo 時如何展示？**
進入「🎬 Demo」Tab → 按「▶ 啟動 Demo」，系統自動跑完整流程

**Q: 如何切換民眾/指揮官視角？**
Header 右上「📱 民眾模式」切換

---

*文件版本：v1.0 | 最後更新：2026-07-27*
*城市應變分析 AI Agent — 中華電信 2026 AI Hackathon*
