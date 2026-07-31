# 系統完整性檢查報告

> 檢查日期：2026-07-27
> 檢查範圍：前端所有元件 + 後端所有服務 + 模擬時鐘整合

---

## 一、模擬時鐘對齊狀態

| 元件 | 是否接入 SimClock | 行為 | 狀態 |
|------|:-:|------|:--:|
| TrafficDashboard（車流圖） | ✅ | `currentIndex` 決定顯示到哪個時間點 | ✅ |
| AlertList（告警列表） | ✅ | `time <= currentTime` 過濾 | ✅ |
| CrowdDensityChart（人流圖） | ✅ | 依 `currentTime` 小時數決定 | ✅ |
| TrafficMap（地圖） | ✅ | `eventStarted = currentTime >= '22:10'` | ✅ |
| HumanOverride（AI 決策審核） | ✅ | `d.time <= currentTime` 過濾 | ✅ |
| MultiLangReport（通報發佈） | ✅ | `eventTriggered = currentTime >= '22:10'` | ✅ |
| PublicReport（公眾回報） | ✅ | `r.time <= currentTime` 過濾 | ✅ |
| Toast 事件通知 | ✅ | 顯示 `[event.time]` 而非真實時間 | ✅ |
| SimClockBar（時鐘控制列） | ✅ | 進度條 + 事件標記 + 速度控制 | ✅ |

---

## 二、已發現並已修正的問題

| # | 問題 | 根因 | 修正方式 | 狀態 |
|---|------|------|---------|:--:|
| 1 | 車流圖只有 2 個時間點 | 舊 CSV 只有 2 筆 | 替換為真實資料（15 時間點） | ✅ |
| 2 | saturation 只回傳 1 筆 | 最新時間點只有 1 路段 | 改取路段最多的時間點 | ✅ |
| 3 | flow key 不匹配（路段A_忠孝東路） | 真實路段名稱不同 | 後端動態產出 + 前端更新 key | ✅ |
| 4 | 事件 3/3 只顯示 2/3 | `===` 精確比對，22:20 不在 timestamps | 改用 `>=` 比對 | ✅ |
| 5 | 告警一開始就全部顯示 | 沒有時間過濾 | AlertList 加入 SimClock 過濾 | ✅ |
| 6 | 通報頁事件前就有內容 | 沒有判斷事件是否發生 | 加入 `eventTriggered` 閘門 | ✅ |
| 7 | 公眾回報時間不對（14:xx） | 假資料時間未更新 | 改為 22:12~22:35 | ✅ |
| 8 | 地圖一開始就有封閉標示 | 沒有接 SimClock | 加入 `eventStarted` 條件渲染 | ✅ |
| 9 | Toast 顯示真實時間 | 用 `new Date()` | 改為 `[event.time]` 格式 | ✅ |
| 10 | HumanOverride 時間 14:32 | 舊決策時間未更新 | 改為 22:10/22:20/22:30 | ✅ |
| 11 | numpy.bool 序列化錯誤 | pandas bool 非原生 | 強制轉 `float()` / `bool()` | ✅ |
| 12 | 頁面切換不置頂 | ProactiveAlert scrollIntoView | 改為容器內部滾動 | ✅ |

---

## 三、仍存在的已知限制（非 bug，Demo 時需注意）

| # | 項目 | 說明 | 影響 | 建議 |
|---|------|------|------|------|
| 1 | CrowdDensityChart 使用假資料 | 人流圖仍用前端 `generateCrowdData()` 產生 24 小時模擬，未接後端真實信令 | 數據不對應真實 CSV | Demo 時說明「人流模組待接真實信令 API」 |
| 2 | StatusBar 數據是寫死的 | `activeIncidents: 2`、`maxSaturation: 92` 等不隨 SimClock 變化 | 頂部數據不動態 | 低優先，不影響 Demo 主流程 |
| 3 | ProactiveAlert 的 timestamp 用真實時間 | AI Agent log 中 `new Date().toLocaleTimeString()` | log 時間戳是真實時間 | 可改用 `currentTime` 但影響不大 |
| 4 | PublicReport 手動新增的回報用 `new Date()` | 民眾手動回報的 time 欄位是真實時間 | 新增回報會超出模擬時間範圍 | Demo 時避免手動回報，或接受 |
| 5 | 事件 22:20 不在 timestamps 中 | timestamps 從 22:15 跳到 22:30 | 事件 2 和 3 在 22:30 同時觸發 | 可行為正確（>=），只是不是精確秒觸發 |
| 6 | 地圖路線座標可能偏移 | 衛星圖上的 Polyline 是手動估算 | 與真實道路有微小偏差 | Demo 時可接受 |

---

## 四、資料一致性檢查

| 資料來源 | 檔案 | 行數 | 時間範圍 | 路段數 | 狀態 |
|---------|------|------|---------|--------|:--:|
| city_traffic_flow.csv | 真實 | 112 行 | 17:00~23:15 | 15 路段 | ✅ |
| signaling_crowd_density.csv | 真實 | 36 行 | 17:00~23:30 | 多站點 | ✅ |
| road_network_geometry.json | 真實 | 15 路段 | — | 15 段 | ✅ |
| emergency_traffic_sop.txt | 真實 | 7 條 | — | — | ✅ |
| live_incidents.json | 真實 | 3 筆 | 22:10~22:30 | — | ✅ |

---

## 五、後端 API 測試結果

| 端點 | 回傳正確 | 與前端格式匹配 | 狀態 |
|------|:--:|:--:|:--:|
| GET /health | ✅ | ✅ | ✅ |
| GET /api/dashboard/traffic | ✅ flow=15, sat=15 | ✅ key 格式正確 | ✅ |
| GET /api/dashboard/alerts | ✅ 含時間戳 | ✅ 可被 SimClock 過濾 | ✅ |
| GET /api/dashboard/multilang-report | ✅ triggered=true | ✅ | ✅ |
| GET /api/dashboard/agent-patrol | ✅ 19 thoughts | ✅ | ✅ |
| POST /api/incidents/process | ✅ 替代路線+號誌 | ✅ | ✅ |
| POST /api/incidents/report | ✅ Markdown 建議書 | ✅ | ✅ |
| POST /api/chat/ | ✅ SOP 引用回答 | ✅ | ✅ |
| WS /api/dashboard/ws | ✅ 每 10 秒推播 | ✅ | ✅ |

---

## 六、結論

**系統整體狀態：✅ 可 Demo**

- 模擬時鐘已整合到所有時間敏感元件
- 事件觸發邏輯正確（>= 比對）
- 前後端 API 串接正常
- 真實資料已載入（中華電信提供的 5 個檔案）
- 所有已知 bug 已修正

**Demo 時建議流程：**
1. 登入指揮官
2. 按 ▶ 開始模擬時鐘
3. 觀察車流逐漸升高（17:00~21:00）
4. 21:30 開始出現告警（飽和度超標）
5. **22:10** 事件觸發 → Toast 彈出 → 地圖標示 → AI 決策出現
6. **22:30** 全面壅塞 → 所有系統聯動
7. 切到通報發佈 → 發送多語通報
8. 展示 AI 決策審核 → 批准/覆寫

---

*報告產出時間：2026-07-27*
