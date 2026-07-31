# 城市應變分析 AI Agent — 專案上下文

## 命題
中華電信 2026 AI Hackathon — 智慧城市決策中樞

## 系統目標
建構具「自動感知」與「互動決策」能力的智慧交通指揮系統，能隨時間推移自動偵測異常，接收突發事件後於 60 秒內產出專業指揮建議與多語民眾通報。

## 技術棧
- 前端：React 18 / Vite 6 / Tailwind CSS 4 / Recharts / Leaflet
- 後端：Python 3.12 / FastAPI / Pandas
- AI：Amazon Bedrock (Claude) / RAG Knowledge Base
- 部署：AWS S3 + CloudFront + ECS Fargate + API Gateway

## 五大功能模組
1. 動態時序監測儀表板
2. 突發事件注入與處置（60 秒內）
3. 對話式策略諮詢顧問（RAG + SOP）
4. AI 決策推理與解釋鏈（ETE 公式）
5. 多語化全通路通報（中/英/日/韓）

## 資料來源
- city_traffic_flow.csv — 15 路段車流
- signaling_crowd_density.csv — 基地台信令
- road_network_geometry.json — 路網拓撲
- emergency_traffic_sop.txt — SOP 7 條
- live_incidents.json — 動態事件

## SOP 分級
- A 級（癱瘓）：Saturation_Score >= 0.95
- B 級（壅擠）：0.85 <= Saturation_Score < 0.95
- 多語通報：任一基地台 Roaming_User_Pct >= 30%
