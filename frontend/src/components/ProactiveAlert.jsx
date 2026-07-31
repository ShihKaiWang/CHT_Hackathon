import { useState, useEffect, useRef } from 'react'
import { useSimClock } from '../hooks/useSimClock.jsx'

// AI 巡邏思考 log
const AI_THOUGHTS = [
  { type: 'scan', msg: '掃描 15 路段即時車流數據...' },
  { type: 'scan', msg: '掃描 5 基地台信令密度...' },
  { type: 'analyze', msg: '分析忠孝東路四段：飽和度 88% → 趨勢上升中 (+3%/5min)' },
  { type: 'predict', msg: '⚡ 預測：忠孝東路四段將在 8 分鐘後突破 90% 閾值' },
  { type: 'scan', msg: '掃描南京東路四段：飽和度 85% 穩定' },
  { type: 'analyze', msg: '分析大巨蛋基地台：用戶數 28,000 → 漫遊率 32%' },
  { type: 'trigger', msg: '🚨 觸發 SOP 第 6 條：大巨蛋漫遊率 ≥ 30%，啟動多語通報' },
  { type: 'scan', msg: '掃描天氣 API：預報 30 分鐘後降雨機率 75%' },
  { type: 'predict', msg: '⚡ 預測：降雨將使路網容量下降 15%，3 路段可能超標' },
  { type: 'action', msg: '✅ 已自動生成預防性號誌調整建議（3 路口）' },
  { type: 'scan', msg: '掃描 YouBike 站點：大巨蛋站剩 3 輛，需求趨勢上升' },
  { type: 'predict', msg: '⚡ 預測：大巨蛋站將在 12 分鐘內車輛歸零' },
  { type: 'action', msg: '✅ 已發送 YouBike 調度建議：從仁愛圓環調 15 輛' },
  { type: 'scan', msg: '掃描 live_incidents 事件流...' },
  { type: 'analyze', msg: '分析路網拓撲：忠孝東路若封閉 → 影響 3 條替代路線' },
  { type: 'predict', msg: '⚡ 連鎖預測：忠孝東路超標 → 仁愛路負載+25% → 大安路+15%' },
  { type: 'action', msg: '✅ 已預排替代路線號誌配時方案（待觸發）' },
  { type: 'scan', msg: '掃描完成。系統正常。下一輪 30 秒後啟動。' },
]

// 預測性告警
const PREDICTIVE_ALERTS = [
  {
    id: 'PA01',
    time: '14:28',
    severity: 'warning',
    title: '忠孝東路四段飽和度趨勢異常',
    prediction: '預計 8 分鐘後突破 90% 閾值',
    currentValue: '88%',
    trend: '+3%/5min',
    basis: '過去 15 分鐘連續上升，速率加快',
    suggestedAction: '建議提前啟動仁愛路分流',
    affectedRoads: null,
    countdown: 8,
    confidence: 92,
  },
  {
    id: 'PA02',
    time: '14:25',
    severity: 'critical',
    title: '連鎖壅塞風險',
    prediction: '忠孝東路超標將連鎖影響 3 路段',
    currentValue: '88% → 觸發中',
    trend: '連鎖擴散',
    basis: '路網拓撲分析：上游車流無處分散',
    suggestedAction: '建議同時調整 3 路口號誌',
    affectedRoads: ['仁愛路四段 (+25%)', '大安路一段 (+15%)', '光復南路 (+20%)'],
    countdown: 12,
    confidence: 87,
  },
  {
    id: 'PA03',
    time: '14:22',
    severity: 'info',
    title: '降雨預警 — 容量下修預判',
    prediction: '30 分鐘後降雨，路網容量預計 -15%',
    currentValue: '降雨機率 75%',
    trend: '氣象資料',
    basis: '中央氣象署雷達回波 + 風向推算',
    suggestedAction: '建議預調號誌補償車速下降',
    affectedRoads: null,
    countdown: 30,
    confidence: 75,
  },
  {
    id: 'PA04',
    time: '14:20',
    severity: 'warning',
    title: '大巨蛋人潮預警',
    prediction: '活動結束前 15 分鐘人流開始湧出',
    currentValue: '用戶數 28,000',
    trend: '+500 人/分鐘',
    basis: '歷史模式匹配：演唱會散場前行為',
    suggestedAction: '建議啟動散場預案（號誌+接駁）',
    affectedRoads: null,
    countdown: 15,
    confidence: 95,
  },
]

// 趨勢異常偵測
const ANOMALY_DETECTIONS = [
  { road: '忠孝東路四段', metric: '飽和度', current: 88, normal: 72, deviation: '+22%', status: 'anomaly' },
  { road: '南京東路四段', metric: '飽和度', current: 85, normal: 70, deviation: '+21%', status: 'anomaly' },
  { road: '光復南路', metric: '車流量', current: 1350, normal: 1100, deviation: '+23%', status: 'anomaly' },
  { road: '信義路五段', metric: '飽和度', current: 68, normal: 65, deviation: '+5%', status: 'normal' },
  { road: '仁愛路四段', metric: '飽和度', current: 62, normal: 58, deviation: '+7%', status: 'normal' },
]

const TYPE_ICONS = { scan: '🔍', analyze: '🧠', predict: '⚡', trigger: '🚨', action: '✅' }
const TYPE_COLORS = { scan: 'text-slate-400', analyze: 'text-blue-400', predict: 'text-amber-400', trigger: 'text-red-400', action: 'text-green-400' }

function ProactiveAlert() {
  const [agentLogs, setAgentLogs] = useState([])
  const [agentRunning, setAgentRunning] = useState(false)
  const [predictions, setPredictions] = useState(PREDICTIVE_ALERTS)
  const [anomalies, setAnomalies] = useState(ANOMALY_DETECTIONS)
  const [alertExpanded, setAlertExpanded] = useState(null)
  const [actionsTaken, setActionsTaken] = useState(new Set())
  const logEndRef = useRef(null)
  const timerRef = useRef(null)
  const { currentTime } = useSimClock()

  // AI Agent 巡邏 — 從後端取得真實結果
  useEffect(() => {
    if (!agentRunning) return

    // 啟動時立即巡邏一次
    runPatrol()

    // 之後每 30 秒巡邏
    timerRef.current = setInterval(runPatrol, 30000)
    return () => clearInterval(timerRef.current)
  }, [agentRunning])

  async function runPatrol() {
    try {
      const res = await fetch('/api/dashboard/agent-patrol')
      const data = await res.json()

      // 逐步顯示 thoughts（每 2 秒一條）
      if (data.thoughts) {
        data.thoughts.forEach((thought, i) => {
          setTimeout(() => {
            setAgentLogs((prev) => [...prev.slice(-25), {
              ...thought,
              timestamp: currentTime,
              id: Date.now() + i,
            }])
          }, i * 2000)
        })
      }

      // 更新預測和異常
      if (data.predictions?.length) setPredictions(data.predictions)
      if (data.anomalies?.length) setAnomalies(data.anomalies)
    } catch (err) {
      // API 失敗時用本地模擬
      fallbackLocalPatrol()
    }
  }

  function fallbackLocalPatrol() {
    const thought = AI_THOUGHTS[Math.floor(Math.random() * AI_THOUGHTS.length)]
    setAgentLogs((prev) => [...prev.slice(-25), {
      ...thought,
      timestamp: currentTime,
      id: Date.now(),
    }])
  }

  useEffect(() => {
    // 只在 log 容器內部滾動，不影響頁面滾動位置
    const container = logEndRef.current?.parentElement
    if (container) container.scrollTop = container.scrollHeight
  }, [agentLogs])

  function handleTakeAction(alertId) {
    setActionsTaken((prev) => new Set([...prev, alertId]))
  }

  return (
    <div className="space-y-6">
      {/* AI Agent 自動巡邏 Log */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">🤖 AI Agent 自動巡邏</h2>
            {agentRunning && (
              <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/20 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                主動巡視中
              </span>
            )}
          </div>
          <button
            onClick={() => setAgentRunning(!agentRunning)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              agentRunning
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
            }`}
          >
            {agentRunning ? '⏸ 暫停' : '▶ 啟動'}
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-3">
          Agent 每 30 秒自動掃描全部數據源 → 偵測異常趨勢 → 預判風險 → 自動產出對策
        </p>

        {/* Log 終端視窗 */}
        <div className="bg-black/60 border border-slate-700 rounded-lg p-4 h-60 overflow-y-auto font-mono text-xs leading-relaxed">
          {agentLogs.length === 0 && (
            <p className="text-slate-600 text-center py-10">Initializing AI Agent...</p>
          )}
          {agentLogs.map((log) => (
            <div key={log.id} className={`flex gap-2 mb-1 ${TYPE_COLORS[log.type]}`}>
              <span className="text-slate-600 flex-shrink-0">[{log.timestamp}]</span>
              <span className="flex-shrink-0">{TYPE_ICONS[log.type]}</span>
              <span className={log.type === 'predict' || log.type === 'trigger' ? 'font-bold' : ''}>
                {log.msg}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Agent 指標 */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          <div className="bg-slate-700/50 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400">巡邏週期</p>
            <p className="text-sm font-bold text-white">30s</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400">數據源</p>
            <p className="text-sm font-bold text-cyan-400">5 個</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400">偵測異常</p>
            <p className="text-sm font-bold text-amber-400">3</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400">預測產出</p>
            <p className="text-sm font-bold text-purple-400">4</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400">自動處理</p>
            <p className="text-sm font-bold text-green-400">2</p>
          </div>
        </div>
      </div>

      {/* 預測性告警 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">⚡ 預測性告警</h3>
            <p className="text-xs text-slate-400 mt-0.5">AI 主動預判風險，在問題發生<span className="text-amber-400">前</span>提出警告</p>
          </div>
          <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg">
            非被動觸發
          </span>
        </div>

        <div className="space-y-3">
          {predictions.map((alert) => {
            const isExpanded = alertExpanded === alert.id
            const isHandled = actionsTaken.has(alert.id)

            return (
              <div
                key={alert.id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isHandled ? 'border-green-500/30 bg-green-500/5 opacity-70' :
                  alert.severity === 'critical' ? 'border-red-500/40 bg-red-500/5' :
                  alert.severity === 'warning' ? 'border-amber-500/40 bg-amber-500/5' :
                  'border-blue-500/40 bg-blue-500/5'
                }`}
              >
                <div className="p-4 cursor-pointer" onClick={() => setAlertExpanded(isExpanded ? null : alert.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isHandled ? 'bg-green-500/20 text-green-400' :
                          alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                          alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {isHandled ? '✓ 已處理' :
                           alert.severity === 'critical' ? '🚨 高風險預測' :
                           alert.severity === 'warning' ? '⚡ 趨勢預警' : 'ℹ️ 提前通知'}
                        </span>
                        <span className="text-xs text-slate-500">{alert.time}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{alert.title}</h4>
                      <p className="text-xs text-slate-300 mt-1">{alert.prediction}</p>
                    </div>

                    {/* 倒數 + 信心度 */}
                    <div className="text-center ml-4 flex-shrink-0">
                      <div className={`text-2xl font-bold font-mono ${
                        isHandled ? 'text-green-400' :
                        alert.countdown <= 10 ? 'text-red-400 animate-pulse' : 'text-amber-400'
                      }`}>
                        {isHandled ? '✓' : alert.countdown}
                      </div>
                      <p className="text-xs text-slate-500">{isHandled ? '已介入' : '分鐘後'}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <div className="w-10 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${alert.confidence > 90 ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: `${alert.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-500">{alert.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 展開詳情 */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-700/50 space-y-2 pt-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-800 rounded p-2">
                        <span className="text-slate-400">目前數值：</span>
                        <span className="text-white font-medium">{alert.currentValue}</span>
                      </div>
                      <div className="bg-slate-800 rounded p-2">
                        <span className="text-slate-400">趨勢：</span>
                        <span className="text-amber-400 font-medium">{alert.trend}</span>
                      </div>
                    </div>
                    <div className="bg-slate-800 rounded p-2 text-xs">
                      <span className="text-slate-400">判定依據：</span>
                      <span className="text-slate-300">{alert.basis}</span>
                    </div>
                    {alert.affectedRoads && (
                      <div className="bg-slate-800 rounded p-2 text-xs">
                        <span className="text-slate-400">連鎖影響預測：</span>
                        <div className="mt-1 space-y-0.5">
                          {alert.affectedRoads.map((road, i) => (
                            <p key={i} className="text-red-400 font-medium">→ {road}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded p-2">
                      <div className="text-xs">
                        <span className="text-green-400 font-medium">建議動作：</span>
                        <span className="text-green-300">{alert.suggestedAction}</span>
                      </div>
                      {!isHandled && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTakeAction(alert.id) }}
                          className="ml-3 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-all font-medium"
                        >
                          立即執行
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 一鍵全部處理 */}
        {actionsTaken.size < predictions.length && (
          <button
            onClick={() => setActionsTaken(new Set(predictions.map((a) => a.id)))}
            className="mt-4 w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-green-500/20 transition-all"
          >
            🛡️ 一鍵採納所有預防建議
          </button>
        )}
        {actionsTaken.size === predictions.length && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
            <p className="text-sm text-green-400 font-medium">✅ 所有預測性風險已提前介入處理</p>
          </div>
        )}
      </div>

      {/* 趨勢異常偵測 */}
      <div className="card-glass rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-2">📊 趨勢異常偵測</h3>
        <p className="text-xs text-slate-400 mb-4">
          即時比較目前數值與歷史同時段，偏差 &gt;15% 自動標記為異常並啟動追蹤
        </p>

        <div className="space-y-2">
          {ANOMALY_DETECTIONS.map((item, i) => {
            const isAnomaly = item.status === 'anomaly'
            return (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${
                isAnomaly ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-slate-700/20 border border-slate-700'
              }`}>
                <span className={`text-lg ${isAnomaly ? 'animate-pulse' : ''}`}>
                  {isAnomaly ? '⚠️' : '✅'}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium">{item.road}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isAnomaly ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {isAnomaly ? '趨勢異常' : '正常'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>{item.metric}：<span className="text-white">{item.current}</span></span>
                    <span>正常值：{item.normal}</span>
                    <span className={isAnomaly ? 'text-amber-400 font-bold' : 'text-green-400'}>{item.deviation}</span>
                  </div>
                </div>
                <div className="w-20">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isAnomaly ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min((item.current / (item.normal * 1.4)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 主動預警能力摘要 */}
      <div className="card-glass rounded-lg p-6 border-gradient">
        <h3 className="text-lg font-bold text-white mb-4">🛡️ 系統主動預警能力</h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-slate-700/30 rounded-xl p-4 text-center">
            <span className="text-3xl block mb-2">🔮</span>
            <h4 className="text-sm font-medium text-white">預測性</h4>
            <p className="text-xs text-slate-400 mt-1">問題發生<strong className="text-amber-400">前 8-30 分鐘</strong>預警</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4 text-center">
            <span className="text-3xl block mb-2">🔗</span>
            <h4 className="text-sm font-medium text-white">連鎖推演</h4>
            <p className="text-xs text-slate-400 mt-1">預判異常如何<strong className="text-red-400">擴散至周邊</strong></p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4 text-center">
            <span className="text-3xl block mb-2">⚙️</span>
            <h4 className="text-sm font-medium text-white">自主行動</h4>
            <p className="text-xs text-slate-400 mt-1">自動<strong className="text-green-400">產出對策並預排方案</strong></p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4 text-center">
            <span className="text-3xl block mb-2">📊</span>
            <h4 className="text-sm font-medium text-white">持續學習</h4>
            <p className="text-xs text-slate-400 mt-1">比對歷史模式，<strong className="text-cyan-400">越用越準</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProactiveAlert
