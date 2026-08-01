# 城市應變分析 AI Agent — 專案上下文

## 命題
中華電信 2026 AI Hackathon — 智慧城市決策中樞（Team 9）

## 系統目標
建構具「自動感知」與「互動決策」能力的智慧交通指揮系統，能隨時間推移自動偵測異常，接收突發事件後於 60 秒內產出專業指揮建議與多語民眾通報。

## 技術棧
- 前端：React 18 / Vite 6 / Tailwind CSS 4 / Recharts / Leaflet
- 後端：Python 3.9 / FastAPI / Pandas / Uvicorn
- AI：Amazon Bedrock (Claude) / RAG Knowledge Base（USE_BEDROCK flag 切換）
- 部署：AWS S3 + CloudFront（前端）+ EC2 t3.small（後端）

## 線上環境

| 服務 | URL / 資源 |
|------|------------|
| 前端 | https://d29bomxt4wi5pg.cloudfront.net |
| 後端 Health | http://54.227.111.3:8000/health |
| S3 Bucket | cht-hackathon-team9-frontend (us-west-2) |
| CloudFront | E1C0VMCEW4CF5A（/api/* → EC2, /* → S3） |
| EC2 | i-03f233116f396a695 (us-east-1, t3.small) |
| GitHub | https://github.com/ShihKaiWang/CHT_Hackathon (branch: feat/frontend-ui) |

## 部署流程

### 前端更新
```bash
cd frontend && npm run build
aws s3 sync dist/ s3://cht-hackathon-team9-frontend/ --delete --region us-west-2
aws cloudfront create-invalidation --distribution-id E1C0VMCEW4CF5A --paths "/*"
```

### 後端更新（EC2 Instance Connect）
```bash
cd /home/ec2-user/CHT_Hackathon && git pull
pkill -f uvicorn && cd backend
export USE_BEDROCK=false JWT_SECRET=$(python3 -c "import secrets;print(secrets.token_hex(32))") DISPATCH_PIN=0000
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
```

## 五大功能模組
1. 📡 即時態勢 — 路網地圖 · 車流圖 · 人流信令 · AI 巡邏預警
2. 🚨 事件應變 — 事件注入 · SOP 分級 · ETE 計算 · 建議書
3. 📢 通報發佈 — 多語通報 · 6 管道預覽 · PIN 雙重確認
4. 🧩 智慧應用 — MaaS 出行 · 共享運具 · 活動模擬 · 天氣連動
5. ⚙️ 系統管理 — 資安控管 · Demo 模式

## 資料來源（中華電信官方資料集）
- `city_traffic_flow.csv` — 15 路段車流（含 Saturation_Score）
- `signaling_crowd_density.csv` — 基地台信令（含 Roaming_User_Pct）
- `road_network_geometry.json` — 路網拓撲 + 替代路線
- `emergency_traffic_sop.txt` — SOP 7 條規則
- `live_incidents.json` — 動態事件流

## SOP 分級規則
- A 級（癱瘓）：Saturation_Score >= 0.95
- B 級（壅擠）：0.85 <= Saturation_Score < 0.95
- 多語通報觸發：任一基地台 Roaming_User_Pct >= 30%
- ETE 公式：base_clearance + (avg_saturation - 0.5) × 60

## 模擬時鐘
前端 SimClock 從 17:00 跑到 23:15，事件在 22:10/22:20/22:30 依序觸發。
所有元件根據 `currentTime` 決定顯示內容，實現完整情境演繹。

## 安全架構
- 角色：指揮官 / 民眾（密碼透過環境變數 DISPATCH_PIN 設定）
- JWT 認證 + Rate Limiting（60 req/min）+ IP 黑名單
- Prompt Injection 過濾 + 降級模式
- 通報發送：PIN 碼 + 5 秒倒數雙重確認
- Human-in-the-Loop：AI 建議需指揮官批准

## 比賽資訊
- 日期：2026/8/1 - 8/2，繳交截止 8/2 14:00
- 格式：6 分鐘簡報 + 4 分鐘 Q&A
- 繳交物：Live Demo URL + 錄影 + GitHub + 簡報
