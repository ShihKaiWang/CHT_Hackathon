# 城市應變分析 AI Agent — 完整技術文件

> 中華電信 2026 AI Hackathon｜前端技術文件 v2.0
> 最後更新：2026-07-27

---

## 目錄

1. [系統架構總覽](#一系統架構總覽)
2. [使用說明（指揮官）](#二使用說明指揮官)
3. [使用說明（民眾）](#三使用說明民眾)
4. [功能模組對照表](#四功能模組對照表)
5. [後端整合指南](#五後端整合指南)
6. [AWS 部署方法](#六aws-部署方法)
7. [風險評估與對策](#七風險評估與對策)
8. [團隊協作分工](#八團隊協作分工)

---

## 一、系統架構總覽

### 技術棧

```
前端：React 18 / Vite 6 / Tailwind CSS 4 / Recharts / Leaflet / react-leaflet
後端：Python 3.12 / FastAPI / LangChain / Pandas
AI：Amazon Bedrock (Claude) / RAG Knowledge Base
即時：WebSocket / Server-Sent Events
部署：AWS S3 + CloudFront + ECS Fargate + API Gateway
```

### 系統架構圖

```
                    ┌─────────────┐
                    │   使用者    │
                    │ (瀏覽器)   │
                    └──────┬──────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │ CloudFront  │ ← CDN + SSL
                    └──┬───────┬──┘
                       │       │
            靜態檔案    │       │ /api/*
                       ▼       ▼
              ┌─────────┐  ┌──────────┐
              │   S3    │  │   ALB    │ ← 負載均衡
              │ (前端)  │  └────┬─────┘
              └─────────┘       │
                                ▼
                        ┌───────────────┐
                        │  ECS Fargate  │ ← FastAPI
                        │   (後端)      │
                        └───┬───┬───┬───┘
                            │   │   │
              ┌─────────────┼───┼───┼─────────────┐
              ▼             ▼   │   ▼             ▼
        ┌──────────┐  ┌────────┐│ ┌────────┐ ┌────────┐
        │ Bedrock  │  │DynamoDB││ │  SNS   │ │Location│
        │(LLM/RAG)│  │(資料庫)││ │ (SMS)  │ │Service │
        └──────────┘  └────────┘│ └────────┘ └────────┘
                                ▼
                        ┌───────────────┐
                        │ API Gateway   │ ← WebSocket
                        │  (即時推播)   │
                        └───────────────┘
```

### 前端檔案結構

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── public/vite.svg
├── docs/
│   ├── COMPLETE_GUIDE.md      ← 本文件
│   ├── USER_GUIDE.md
│   └── DEPLOYMENT_CHECKLIST.md
└── src/
    ├── main.jsx               ← 進入點（ToastProvider 包裹）
    ├── index.css              ← Tailwind + 科技感動畫
    ├── App.jsx                ← 主框架（5 大分組 + 登入閘門）
    ├── hooks/
    │   └── useCountUp.js      ← 數字跳動動畫 Hook
    ├── services/
    │   ├── api.js             ← API 呼叫層（USE_MOCK 開關）
    │   └── mockData.js        ← 模擬資料
    └── components/
        ├── TrafficMap.jsx           ← 衛星地圖（Leaflet）
        ├── TrafficDashboard.jsx     ← 車流圖 + TOP 5 排名
        ├── CrowdDensityChart.jsx    ← 人流圖 + 排名
        ├── AlertList.jsx            ← 即時告警
        ├── ProactiveAlert.jsx       ← AI Agent 巡邏 + 預測告警
        ├── IncidentPanel.jsx        ← 事件注入 + SOP 匹配
        ├── HumanOverride.jsx        ← 指揮官最終控制權
        ├── ETECalculation.jsx       ← ETE 公式推導 + 排除分析
        ├── ReportDocument.jsx       ← 交控中心建議書
        ├── CitizenSMS.jsx           ← 多語民眾簡訊
        ├── MultiLangReport.jsx      ← 多語通報 + 管道發送
        ├── NotificationDispatch.jsx ← 通知管道選擇
        ├── ChannelPreview.jsx       ← 六管道 Demo 預覽
        ├── ChatDrawer.jsx           ← 旁設策略諮詢
        ├── MaaSPlanner.jsx          ← MaaS 路線規劃（下拉）
        ├── MapRoutePlanner.jsx      ← 地圖路線規劃（點選）
        ├── SharedMobility.jsx       ← 共享運具調度
        ├── EventSimulator.jsx       ← 大型活動模擬
        ├── WeatherModule.jsx        ← 天氣連動（Open-Meteo API）
        ├── PublicReport.jsx         ← 公眾回報系統
        ├── PublicView.jsx           ← 民眾模式主頁
        ├── VoiceBroadcast.jsx       ← 語音播報
        ├── SecurityModule.jsx       ← 資安控管
        ├── StatusBar.jsx            ← 頂部狀態列
        ├── ToastProvider.jsx        ← Toast 通知系統
        ├── DemoController.jsx       ← 一鍵 Demo
        └── EventTimeline.jsx        ← 事件時間線
```

---

## 二、使用說明（指揮官）

### 登入

1. 打開系統 → 顯示登入頁
2. 選擇「🎖️ 指揮官」
3. 輸入密碼：`1234`（Demo 用，正式版接 Cognito）
4. 進入 Dashboard

### 5 大頁面操作流程

#### 📡 即時態勢（第一眼看這裡）

- **衛星地圖**：紅線=封閉、綠線=替代、圓圈=基地台
- **車流圖**：LIVE 每 3 秒推進 + 右側 TOP 5 排名
- **人流圖**：面積圖 + 漫遊率監測 + TOP 5 排名
- **AI Agent**：可手動啟動巡邏，觀察思考 log
- **預測告警**：含倒數計時、信心度、連鎖影響
- **Toast**：右上角每 15 秒自動彈出預警

#### 🚨 事件應變（問題來了怎麼處理）

1. **指揮官控制權**（頁面最上方）
   - AI 產出 5 項決策，逐一 ✓ 批准 / ✏️ 覆寫 / ✕ 駁回
   - 可切換「逐一審核」或「自動模式（≥90% 信心自動）」
2. **事件注入**
   - 匯入 JSON 或手動選擇 → 自動匹配 SOP
   - 觀察 60 秒倒數 + 替代路線 + 號誌調整
3. **ETE 公式**
   - 5 步驟逐步推導（可按重新演算）
   - 排除路線分析（飽和度/餘量/原因）
4. **建議書**
   - 五大區段完整展示 → 可匯出 Markdown / 列印
5. **民眾簡訊**
   - SMS + CMS 格式切換 → 四語 → JSON 匯出 → 語音播報

#### 📢 通報發佈（通知民眾）

- 漫遊率偵測 + 觸發狀態
- 四語通報內容切換
- 六管道選擇（CBS/SMS/CMS/APP/社群/導航）
- 發送後跳出各管道 Demo 預覽
- 發送狀態追蹤（送達率/確認數）

#### 🧩 智慧應用（額外加分功能）

- 🚌 智慧出行：起終點下拉選擇 → 多方案比較
- 🚲 運具調度：YouBike/機車供需 → AI 調度建議
- 🏟️ 活動模擬：選活動 → 散場模擬 → 計畫書 + 甘特圖
- 🌧️ 天氣連動：開關控制 → Open-Meteo 即時 API → 容量影響
- 📢 公眾回報：民眾回報列表 + 附議 + 交叉驗證

#### ⚙️ 系統管理

- 🔐 資安：權限矩陣 + PIN 確認閘 + Audit Log + 架構說明
- 🎬 Demo：一鍵自動展示完整 SOP 流程

### 跨頁面功能

- **💬 策略諮詢**：Header 按鈕，右側 Drawer，任何頁面可用
- **📱 民眾模式**：Header 按鈕，切換民眾視角
- **🖥️ 全屏**：Header 按鈕，ESC 退出
- **登出**：Header 紅色按鈕

---

## 三、使用說明（民眾）

### 登入

1. 選擇「👥 民眾」→ 無需密碼 → 直接進入

### 三大功能

| Tab | 功能 |
|-----|------|
| **📍 即時路況** | 事件列表 + 替代路線 + 大眾運輸 + 語音播報 + 安全提醒 |
| **🚌 路線規劃** | 地圖點選起終點 / GPS 定位 → 5 種方案比較（時間/費用/碳排） |
| **📢 我要回報** | 選類型 → 填地點 → 送出 → 追蹤進度 → 可附議他人 |

### 語音播報

- 選語言（中/英/日/韓）→ 按 ▶ 播報
- 或按「🌐 全語播報」四語依序唸出

---

## 五、後端整合指南

### 前端切換到真實後端

**只需改一行：**

```javascript
// src/services/api.js
const USE_MOCK = false  // 改為 false
```

如果後端不在同一域名，加入環境變數：

```javascript
const API_BASE = import.meta.env.VITE_API_BASE || '/api'
```

`.env.production`：
```
VITE_API_BASE=https://api.your-domain.com
```

### 前端預期的 API 端點

| Method | Path | 用途 | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/dashboard/traffic` | 車流資料 | — | `{ flow: [...], saturation: [...] }` |
| GET | `/api/dashboard/alerts` | 告警列表 | — | `[{ id, time, type, level, message, road }]` |
| WS | `/api/dashboard/ws` | 即時推播 | — | 每筆 `{ id, time, type, level, message, road }` |
| POST | `/api/incidents/process` | 事件處理 | `{ type, location, description }` | `{ event, severity, affected_roads, alternative_routes, signal_adjustments, processing_time_sec }` |
| POST | `/api/incidents/report` | 建議書 | `{ incident_id }` | `{ report: "..." }` |
| POST | `/api/chat/` | 對話 | `{ message }` | `{ reply: "..." }` |
| GET | `/api/dashboard/multilang-report` | 多語通報 | — | `{ roaming_rate, triggered, reports: { zh, en, ja, ko } }` |

### Response 格式範例

#### GET /api/dashboard/traffic

```json
{
  "flow": [
    {
      "time": "08:00",
      "路段A_忠孝東路": 850,
      "路段B_中山北路": 720,
      "路段C_信義路": 680,
      "路段D_民權東路": 530,
      "路段E_復興南路": 480
    }
  ],
  "saturation": [
    {
      "id": "R001",
      "name": "忠孝東路四段",
      "saturation": 0.92,
      "status": "critical"
    }
  ]
}
```

#### POST /api/incidents/process

Request:
```json
{ "type": "road_collapse", "location": "忠孝東路四段", "description": "路面塌陷" }
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

```json
// Request
{ "message": "如果忠孝東路塌陷，替代路線有哪些？" }

// Response
{ "reply": "根據 SOP 第 2 條，建議路徑：\n1. 仁愛路四段（ETE 12 分）\n2. 市民大道（ETE 15 分）\n\n已自動調整沿線號誌。" }
```

#### WebSocket 推播

每次推送一筆：
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

### 後端需要的檔案

```
backend/
├── main.py                ← FastAPI（含 CORS）
├── requirements.txt       ← 依賴
├── Dockerfile             ← 容器化
├── .env                   ← 環境變數
├── routers/
│   ├── dashboard.py       ← GET /traffic, /alerts, WS /ws
│   ├── incidents.py       ← POST /process, /report
│   └── chat.py            ← POST /
├── services/
│   ├── traffic_analyzer.py
│   ├── sop_engine.py
│   ├── route_planner.py
│   ├── multilang_generator.py
│   └── bedrock_client.py  ← Bedrock RAG 呼叫
├── data/                  ← 5 個官方資料檔
└── tests/
```

---

## 六、AWS 部署方法

### Step 1：前端部署到 S3 + CloudFront（5 分鐘）

```bash
# 建置
cd frontend
npm run build

# 建立 S3 bucket
aws s3 mb s3://cht-hackathon-frontend-2026

# 上傳
aws s3 sync dist/ s3://cht-hackathon-frontend-2026 --delete

# 設定靜態網站
aws s3 website s3://cht-hackathon-frontend-2026 \
  --index-document index.html \
  --error-document index.html
```

CloudFront 設定：
- Origin：S3 bucket
- Default root object：`index.html`
- Error pages：403/404 → `/index.html`（SPA 路由）
- `/api/*` 行為：轉發到後端 ALB origin

### Step 2：後端部署到 ECS Fargate（15 分鐘）

```bash
# Docker build
cd backend
docker build -t cht-backend .

# ECR push
aws ecr create-repository --repository-name cht-backend
aws ecr get-login-password | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.REGION.amazonaws.com
docker tag cht-backend:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/cht-backend:latest
docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/cht-backend:latest

# ECS Service（在 Console 建立）
# Task Definition → Container: cht-backend:latest, Port: 8000
# Service → ALB target group → health check: /health
```

### Step 3：Bedrock RAG（10 分鐘）

1. 上傳 `emergency_traffic_sop.txt` 到 S3 bucket
2. Bedrock Console → Knowledge Bases → Create
3. Data source = S3 → 選擇 SOP 檔案
4. Embedding model = Amazon Titan
5. 同步 → 取得 KB ID → 填入後端 `.env`

### Step 4：CloudFront 路由設定

| 路徑模式 | Origin | 說明 |
|---------|--------|------|
| `/api/*` | ALB（後端） | API 請求轉發到後端 |
| `/*`（預設） | S3（前端） | 靜態檔案 |

### Step 5：WebSocket

- API Gateway → WebSocket API
- Route：`$connect`, `$disconnect`, `$default`
- 整合：Lambda function
- 部署後取得 `wss://` URL → 前端 api.js 使用

---

## 七、風險評估與對策

### 高風險

| 風險 | 影響 | 機率 | 對策 |
|------|------|------|------|
| **CloudFront `/api` 路由設定錯誤** | 前後端無法通訊 | 高 | 先在本地用 `vite proxy` 測試 → 確認 API 格式正確後再上 CloudFront |
| **CORS 被擋** | 所有 API 呼叫 403 | 高 | 後端加 `CORSMiddleware(allow_origins=["*"])` |
| **Bedrock 權限不足** | Chat 無法回答 | 中 | IAM Role 需有 `bedrock:InvokeModel` + `bedrock:Retrieve` |
| **S3 前端路由 404** | 重新整理頁面白屏 | 高 | CloudFront Error Pages：403/404 → `/index.html`, 200 |

### 中風險

| 風險 | 影響 | 機率 | 對策 |
|------|------|------|------|
| **WebSocket idle timeout** | 10 分鐘無活動斷線 | 中 | 前端加 ping interval 或 auto-reconnect |
| **Lambda cold start** | Chat 首次回答慢 3-5 秒 | 中 | 用 Provisioned Concurrency 或改 ECS |
| **Open-Meteo API 掛了** | 天氣模組無資料 | 低 | 前端已有 error 處理 + 重試按鈕 |
| **GPS 定位被使用者拒絕** | 無法自動定位 | 中 | 已有 fallback（手動點選地圖） |

### 低風險

| 風險 | 影響 | 機率 | 對策 |
|------|------|------|------|
| **Esri 衛星圖磚被擋** | 地圖底圖空白 | 低 | 改用 OSM `https://{s}.tile.openstreetmap.org` |
| **Web Speech API 不支援** | 語音播報無聲 | 低 | 前端已有「不支援」提示 |
| **手機瀏覽器相容** | 部分動畫異常 | 低 | Tailwind 已處理前綴 |

### Demo 當天的 Plan B

| 如果... | 備案 |
|---------|------|
| 後端來不及部署 | 前端 `USE_MOCK = true` 可獨立 Demo |
| Bedrock 沒設好 | Chat 回 mock 回覆，其他功能不影響 |
| 網路斷線 | 所有 mock 資料離線可跑，地圖用快取 |
| WebSocket 連不上 | Mock 模式有 setInterval 模擬推播 |

---

## 八、團隊協作分工

### 工作坊當天

| 角色 | 負責 | 預估時間 |
|------|------|---------|
| **A 前端（你）** | `npm run build` → 上傳 S3 → 設定 CloudFront error pages → 確認 `/api` 轉發 | 15 分鐘 |
| **B 後端演算法** | 實作 5 個 API endpoint → 讀取 5 個資料檔 → SOP 邏輯引擎 | 2 小時 |
| **C AI/LLM** | 設定 Bedrock KB → 上傳 SOP → 調整 prompt → 測試 Chat | 1 小時 |
| **D 整合** | AWS 帳號 → IAM → ECS → ALB → CloudFront → 域名 → 串接測試 | 2 小時 |

### 對接 Checklist

**前端（A）完成後交給後端的東西：**

- [x] 本文件（API 格式規格）
- [x] `src/services/api.js`（所有端點定義）
- [x] `src/services/mockData.js`（預期的資料格式範例）
- [x] `docs/` 完整文件

**後端完成後前端要做的事：**

- [ ] 修改 `USE_MOCK = false`
- [ ] 設定 `.env.production` 的 `VITE_API_BASE`
- [ ] 重新 `npm run build` → 上傳 S3
- [ ] 測試所有 API 呼叫正常
- [ ] WebSocket 連線測試

---

## 附錄：快速指令

```bash
# 本地開發
cd C:\Users\劉炤輝\Downloads\CHT_Hackathon\frontend
npm run dev

# 建置 production
npm run build

# 上傳到 S3
aws s3 sync dist/ s3://BUCKET_NAME --delete

# 清除 CloudFront 快取
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"
```

---

*本文件由前端 A 組產出，供團隊 B/C/D 對接使用。*
