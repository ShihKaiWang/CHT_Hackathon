# 資料流程規格

## 資料處理流程

```
官方 CSV/JSON 資料
       │
       ▼
backend/data/（5 個檔案）
       │
       ▼
data_loader.py（讀取 + 快取 + 格式轉換）
       │
       ├── get_traffic_timeseries() → 前端車流圖
       ├── get_alerts() → 前端告警列表
       ├── get_multilang_report() → 多語通報
       └── get_latest_traffic() → SOP 引擎計算
              │
              ▼
sop_engine.py（7 條 SOP 規則）
       │
       ├── classify_event() → A/B 級判定
       ├── get_evacuation_plan() → 替代路線
       ├── calculate_ete() → ETE 計算
       └── check_multilang_trigger() → 多語觸發
              │
              ▼
route_planner.py（組裝應變方案）
       │
       ▼
前端顯示
```

## ETE 計算公式（SOP 第 7 條）

```
ETE_minutes = base_clearance + congestion_penalty
  - base_clearance：Critical=60, High=40, Medium=20
  - congestion_penalty = (平均 Saturation - 0.5) × 60
```

## 多語通報觸發（SOP 第 6 條）

```
觸發條件：任一基地台 Roaming_User_Pct >= 30%
未觸發：僅中文
觸發時：中/英/日/韓 四語同步
```
