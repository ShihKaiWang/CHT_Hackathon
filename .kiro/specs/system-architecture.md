# 系統架構規格

## 前後端架構

```
使用者（瀏覽器）
    │ HTTPS
    ▼
CloudFront（CDN + SSL）
    ├── /* → S3（前端靜態檔）
    └── /api/* → ALB → ECS Fargate（FastAPI 後端）
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
          Bedrock      DynamoDB    API Gateway
         (LLM/RAG)    (資料庫)     (WebSocket)
```

## API 端點

| Method | Path | 用途 |
|--------|------|------|
| GET | /api/dashboard/traffic | 車流時序 |
| GET | /api/dashboard/alerts | 告警列表 |
| GET | /api/dashboard/crowd-density | 人流信令 |
| GET | /api/dashboard/multilang-report | 多語通報 |
| GET | /api/dashboard/agent-patrol | AI Agent 巡邏 |
| WS | /api/dashboard/ws | 即時推播 |
| POST | /api/incidents/process | 事件處理 |
| POST | /api/incidents/report | 建議書生成 |
| POST | /api/chat/ | RAG 對話 |

## 模擬時鐘機制

前端維護 SimClock，依真實資料時間點（17:00~23:15）逐步推進。
事件在 22:10/22:20/22:30 觸發。所有元件根據時鐘決定顯示內容。

## 資安架構

- 角色分級：指揮官 / 民眾
- 通報發送：PIN + 5 秒倒數雙重確認
- 完整 Audit Log
- AI 決策需人類批准（HumanOverride）
