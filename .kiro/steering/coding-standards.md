# 團隊開發規範

## 前端（React + Vite）

- 使用函式元件 + Hooks，不使用 Class Component
- 狀態管理：useState / useEffect，跨元件用 props 傳遞
- 樣式：Tailwind CSS utility-first，避免自訂 CSS（除動畫外）
- 元件命名：PascalCase（如 `TrafficMap.jsx`）
- 服務層統一放 `src/services/`，API 呼叫集中在 `api.js`
- 圖表統一使用 Recharts，地圖使用 react-leaflet
- 模擬時鐘：所有時間相關邏輯透過 `useSimClock` hook 取得

## 後端（FastAPI + Python）

- Python 3.9+ 相容（避免 `dict | None` 語法，使用 `Optional[dict]`）
- 資料層統一使用 `data_loader.py` 的 `DataStore` 單例
- API 路由放 `routers/`，業務邏輯放 `services/`
- SOP 規則引擎集中在 `sop_engine.py`
- 環境變數：`USE_BEDROCK`, `JWT_SECRET`, `DISPATCH_PIN`
- 安全中介層：Rate Limiting 60 req/min，Prompt Injection 過濾

## Git 規範

- Branch：`feat/frontend-ui`（主開發分支）
- Commit message 格式：`<type>: <description>`
  - feat: 新功能
  - fix: 修復
  - docs: 文件
  - refactor: 重構
- 不 commit `.env`、`nohup.out`、`node_modules/`

## 部署

- 前端：`npm run build` → S3 sync → CloudFront invalidation
- 後端：EC2 上 `git pull` → `pkill -f uvicorn` → `nohup uvicorn ...`
- 環境分離：本機開發用 mock，線上用真實 API
