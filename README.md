# 城市應變分析 AI Agent 系統

> 中華電信 2026 AI Hackathon — 智慧交通指揮 Dashboard

具備「自動感知」與「互動決策」能力的交通應變系統。系統能隨時間推移自動偵測異常，接收突發事件後於 60 秒內產出專業指揮建議與多語民眾通報。

## Demo

```bash
# 後端
cd backend && pip install -r requirements.txt && python main.py

# 前端（可獨立運行，含 mock data）
cd frontend && npm install && npm run dev
```

前端：http://localhost:5173 ｜ 後端 API：http://localhost:8000

## 五大功能模組

| # | 模組 | 說明 | SOP |
|---|------|------|-----|
| 1 | 動態時序監測儀表板 | 自動偵測飽和度異常，超標自動彈出預警 | 第 1 條 |
| 2 | 突發事件注入與處置 | 60 秒內完成路網重規劃，計算最優替代路徑 | 第 2 條 |
| 3 | 對話式策略諮詢顧問 | RAG 檢索 SOP，回答 What-if 假設性問題 | 第 3、4 條 |
| 4 | AI 決策推理與解釋鏈 | ETE 計算、交控中心建議書產出 | 第 7 條 |
| 5 | 多語化全通路通報 | 漫遊率 ≥30% 自動觸發中/英/日/韓通報 | 第 6 條 |

## 技術棧

- **後端**：Python 3.12 / FastAPI / Pandas / LangChain
- **前端**：React 18 / Vite 5 / Tailwind CSS / Recharts
- **通訊**：REST API + WebSocket 即時推送
- **測試**：pytest（57 tests, 100% pass）

## 專案結構

```
CHT_Hackathon/
├── data/                      # 比賽官方資料（5 個資料源）
│   ├── city_traffic_flow.csv         # 15 路段即時車流
│   ├── signaling_crowd_density.csv   # 基地台人流信令
│   ├── road_network_geometry.json    # 路網幾何與替代路線
│   ├── emergency_traffic_sop.txt     # SOP 7 條規則
│   └── live_incidents.json           # 動態事件（塌陷/故障/人潮）
├── backend/                   # FastAPI 後端
│   ├── services/              # 核心邏輯（5 個模組）
│   ├── routers/               # API 路由
│   ├── models/schemas.py      # 資料模型
│   ├── tests/                 # pytest 測試（57 tests）
│   └── requirements.txt
├── frontend/                  # React Dashboard
│   ├── src/components/        # 6 個 UI 元件
│   ├── src/services/          # API + Mock Data
│   └── package.json
├── docs/architecture.md       # 系統架構文件
└── CONTRIBUTING.md            # 團隊開發指南
```

## API 端點

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/dashboard/traffic` | 車流時序資料 |
| GET | `/api/dashboard/alerts` | 當前告警列表 |
| WS | `/api/dashboard/ws` | 即時推送 |
| POST | `/api/incidents/process` | 處理事件 → 應變方案 |
| POST | `/api/incidents/report` | 生成交控中心建議書 |
| POST | `/api/chat/` | 對話式 SOP 諮詢 |

## 測試

```bash
cd backend
python3 -m pytest tests/ -v
# 57 passed in 0.49s
```

涵蓋：SOP 邏輯單元測試、API 功能測試、端對端整合測試。

## 團隊分工

詳見 [CONTRIBUTING.md](./CONTRIBUTING.md)

| 角色 | 分支 | 負責 |
|------|------|------|
| A 前端 UI | `feat/frontend-ui` | Dashboard 視覺化 |
| B 後端演算法 | `feat/backend-algo` | SOP 邏輯 + 路網演算法 |
| C AI/LLM | `feat/llm-rag` | RAG 對話 + 多語生成 |
| D 整合 | `feat/integration` | 串接、測試、部署 |

## License

Private — CHT Hackathon 2026
