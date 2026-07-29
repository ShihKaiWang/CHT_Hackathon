# AWS 部署準備清單

## 工作坊前需要準備的程式碼

### 1. 前端（你已完成）

```
frontend/
├── src/           ← 全部完成
├── package.json   ← 依賴定義
├── vite.config.js ← Build + Proxy 設定
└── dist/          ← npm run build 產出
```

工作坊時只需：
```bash
npm run build
aws s3 sync dist/ s3://bucket-name
```

---

### 2. 後端需要準備的檔案結構

```
backend/
├── main.py                    ← FastAPI 主程式
├── requirements.txt           ← Python 依賴
├── Dockerfile                 ← 容器化
├── .env.example               ← 環境變數範本
├── routers/
│   ├── dashboard.py           ← /api/dashboard/* 路由
│   ├── incidents.py           ← /api/incidents/* 路由
│   └── chat.py                ← /api/chat/ 路由
├── services/
│   ├── traffic_analyzer.py    ← 車流分析邏輯
│   ├── sop_engine.py          ← SOP 7 條規則引擎
│   ├── route_planner.py       ← 替代路線計算
│   ├── multilang_generator.py ← 多語通報生成
│   └── bedrock_client.py      ← Bedrock LLM 呼叫
├── models/
│   └── schemas.py             ← Pydantic 資料模型
├── data/
│   ├── city_traffic_flow.csv
│   ├── signaling_crowd_density.csv
│   ├── road_network_geometry.json
│   ├── emergency_traffic_sop.txt
│   └── live_incidents.json
└── tests/
    └── ...                    ← pytest 測試
```

---

### 3. 關鍵程式碼範本

#### main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import dashboard, incidents, chat

app = FastAPI(title="城市應變分析 AI Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api/dashboard")
app.include_router(incidents.router, prefix="/api/incidents")
app.include_router(chat.router, prefix="/api/chat")

@app.get("/health")
def health():
    return {"status": "ok"}
```

#### routers/dashboard.py

```python
from fastapi import APIRouter, WebSocket
import pandas as pd

router = APIRouter()

@router.get("/traffic")
def get_traffic():
    df = pd.read_csv("data/city_traffic_flow.csv")
    # 轉換為前端需要的格式
    return {"flow": [...], "saturation": [...]}

@router.get("/alerts")
def get_alerts():
    # 分析飽和度超標的路段產出告警
    return [...]

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # 每 10 秒推送更新
    while True:
        data = get_latest_data()
        await websocket.send_json(data)
        await asyncio.sleep(10)
```

#### routers/chat.py

```python
from fastapi import APIRouter
from services.bedrock_client import query_rag

router = APIRouter()

@router.post("/")
def chat(request: dict):
    message = request.get("message", "")
    reply = query_rag(message)
    return {"reply": reply}
```

#### services/bedrock_client.py

```python
import boto3
import json

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
bedrock_agent = boto3.client("bedrock-agent-runtime", region_name="us-east-1")

KNOWLEDGE_BASE_ID = "your-kb-id"
MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0"

def query_rag(question: str) -> str:
    # RAG 檢索
    response = bedrock_agent.retrieve_and_generate(
        input={"text": question},
        retrieveAndGenerateConfiguration={
            "type": "KNOWLEDGE_BASE",
            "knowledgeBaseConfiguration": {
                "knowledgeBaseId": KNOWLEDGE_BASE_ID,
                "modelArn": f"arn:aws:bedrock:us-east-1::foundation-model/{MODEL_ID}",
            }
        }
    )
    return response["output"]["text"]
```

#### Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### 4. AWS 工作坊當天操作步驟

#### Step 1：前端部署（5 分鐘）

```bash
# 在 frontend/ 目錄
npm run build

# 上傳到 S3
aws s3 mb s3://cht-hackathon-2026
aws s3 sync dist/ s3://cht-hackathon-2026 --delete

# 設定公開存取（或用 CloudFront）
aws s3 website s3://cht-hackathon-2026 \
  --index-document index.html \
  --error-document index.html
```

#### Step 2：後端部署（15 分鐘）

```bash
# 在 backend/ 目錄

# 方案 A：ECS Fargate
docker build -t cht-backend .
aws ecr create-repository --repository-name cht-backend
docker tag cht-backend:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/cht-backend:latest
docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/cht-backend:latest
# 然後在 Console 建立 ECS Service

# 方案 B：Lambda（更快）
pip install mangum
# main.py 加入：
# from mangum import Mangum
# handler = Mangum(app)
# 打包上傳到 Lambda
```

#### Step 3：Bedrock RAG 設定（10 分鐘）

1. 上傳 `emergency_traffic_sop.txt` 到 S3
2. 在 Bedrock Console 建立 Knowledge Base
3. 選擇 Data Source = S3
4. 選擇 Embedding Model = Titan
5. 同步資料
6. 取得 Knowledge Base ID → 填入後端 `.env`

#### Step 4：連接前後端

修改前端 `src/services/api.js`：
```javascript
const USE_MOCK = false
```

或設定 CloudFront 的 `/api/*` 轉發到後端 ALB/Lambda。

---

### 5. 團隊協作分工

| 角色 | 工作坊當天要做 |
|------|---------------|
| A 前端 | 部署到 S3、切換 USE_MOCK、處理 CORS |
| B 後端 | 啟動 FastAPI、實作 5 端點、接資料 |
| C AI/LLM | 設定 Bedrock KB、調整 prompt、測試 RAG |
| D 整合 | AWS 帳號設定、網路串接、域名、Demo 排練 |

---

### 6. 可能踩到的坑

| 問題 | 解法 |
|------|------|
| CORS 被擋 | 後端加 `CORSMiddleware(allow_origins=["*"])` |
| S3 403 | 設定 Bucket Policy 或用 CloudFront OAI |
| Bedrock 權限 | IAM Role 需有 `bedrock:InvokeModel` |
| WebSocket 斷線 | API Gateway 有 10 分鐘 idle timeout |
| Lambda cold start | 設定 Provisioned Concurrency 或改用 ECS |
| 前端路由 404 | S3 error document 設為 index.html |

---

*準備完成後，工作坊當天只需要「部署+串接+測試」，程式碼都已就緒。*
