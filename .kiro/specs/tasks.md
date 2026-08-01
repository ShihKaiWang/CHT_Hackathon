# 實作任務分解 — 城市應變分析 AI Agent

## Phase 1：基礎架構 ✅

| # | 任務 | 狀態 | 關聯需求 |
|---|------|------|----------|
| 1.1 | 建立 React + Vite + Tailwind 前端專案 | ✅ 完成 | - |
| 1.2 | 建立 FastAPI 後端骨架（main.py + routers） | ✅ 完成 | - |
| 1.3 | 整合中華電信 5 個官方資料檔案 | ✅ 完成 | - |
| 1.4 | 建立 DataStore 單例資料層 | ✅ 完成 | - |
| 1.5 | 設定 CORS + Security Middleware | ✅ 完成 | - |

## Phase 2：前端 UI 元件 ✅

| # | 任務 | 狀態 | 關聯需求 |
|---|------|------|----------|
| 2.1 | SimClock 模擬時鐘機制（17:00-23:15） | ✅ 完成 | US-1 |
| 2.2 | TrafficMap 即時路網地圖（Leaflet 衛星圖） | ✅ 完成 | US-1 |
| 2.3 | TrafficDashboard 車流折線圖 + 飽和度 | ✅ 完成 | US-1 |
| 2.4 | CrowdDensityChart 人流信令圖 | ✅ 完成 | US-2 |
| 2.5 | AlertList 即時告警列表 | ✅ 完成 | US-1 |
| 2.6 | IncidentPanel 事件注入面板 | ✅ 完成 | US-3 |
| 2.7 | ETECalculation ETE 計算展示 | ✅ 完成 | US-3 |
| 2.8 | ProactiveAlert AI Agent 巡邏 | ✅ 完成 | US-4 |
| 2.9 | MultiLangReport 多語通報 | ✅ 完成 | US-5 |
| 2.10 | ChatDrawer 策略諮詢對話 | ✅ 完成 | US-6 |
| 2.11 | PublicView 民眾模式 | ✅ 完成 | US-7 |
| 2.12 | MaaSPlanner + SharedMobility 智慧出行 | ✅ 完成 | US-8 |
| 2.13 | HumanOverride 人類審核機制 | ✅ 完成 | US-5 |
| 2.14 | SecurityModule 資安管控面板 | ✅ 完成 | - |
| 2.15 | WeatherModule 天氣連動 | ✅ 完成 | US-4 |

## Phase 3：後端 API + 業務邏輯 ✅

| # | 任務 | 狀態 | 關聯需求 |
|---|------|------|----------|
| 3.1 | GET /dashboard/traffic — 車流時序 + 前值填充 | ✅ 完成 | US-1 |
| 3.2 | GET /dashboard/alerts — 告警產出 | ✅ 完成 | US-1 |
| 3.3 | GET /dashboard/crowd-density — 人流信令 + 前值填充 | ✅ 完成 | US-2 |
| 3.4 | GET /dashboard/multilang-report — 多語通報 | ✅ 完成 | US-5 |
| 3.5 | GET /dashboard/agent-patrol — AI 巡邏 | ✅ 完成 | US-4 |
| 3.6 | POST /incidents/process — SOP 引擎處理 | ✅ 完成 | US-3 |
| 3.7 | POST /incidents/report — 建議書生成 | ✅ 完成 | US-3 |
| 3.8 | POST /chat/ — 對話服務（規則 + RAG） | ✅ 完成 | US-6 |
| 3.9 | SOP Engine 7 條規則實作 | ✅ 完成 | US-3 |
| 3.10 | Route Planner 替代路線計算 | ✅ 完成 | US-3 |
| 3.11 | Security Middleware V2（JWT + Rate Limit + Audit） | ✅ 完成 | - |

## Phase 4：AWS 部署 ✅

| # | 任務 | 狀態 | 關聯需求 |
|---|------|------|----------|
| 4.1 | S3 Bucket 建立（私有，OAC） | ✅ 完成 | - |
| 4.2 | CloudFront Distribution + SSL | ✅ 完成 | - |
| 4.3 | CloudFront /api/* 行為 → EC2 | ✅ 完成 | - |
| 4.4 | EC2 Instance 建立 + Security Group | ✅ 完成 | - |
| 4.5 | 後端部署（pip install + uvicorn） | ✅ 完成 | - |
| 4.6 | Python 3.9 相容性修復 | ✅ 完成 | - |

## Phase 5：AI 整合（進行中）

| # | 任務 | 狀態 | 關聯需求 |
|---|------|------|----------|
| 5.1 | Bedrock Knowledge Base 設定 | 🔲 待做 | US-6 |
| 5.2 | SOP 文件上傳至 S3 建立 RAG | 🔲 待做 | US-6 |
| 5.3 | USE_BEDROCK=true 模式測試 | 🔲 待做 | US-6 |
| 5.4 | Guardrails 安全防護 | 🔲 待做 | - |

## Phase 6：優化與 Demo 準備

| # | 任務 | 狀態 | 關聯需求 |
|---|------|------|----------|
| 6.1 | 前端 UI 細節調整 | 🔄 進行中 | - |
| 6.2 | Demo 流程腳本撰寫 | 🔲 待做 | - |
| 6.3 | 錄製 Demo 影片 | 🔲 待做 | - |
| 6.4 | 簡報製作（6 分鐘） | 🔲 待做 | - |
| 6.5 | GitHub README 完善 | 🔲 待做 | - |
