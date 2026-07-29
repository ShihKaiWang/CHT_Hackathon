import { useState, useEffect, useRef } from 'react'
import { useCountUp } from '../hooks/useCountUp'

const EVENTS = [
  {
    id: 'concert',
    name: '演唱會',
    icon: '🎤',
    venue: '台北大巨蛋',
    capacity: 50000,
    duration: '3 小時',
    exitTime: 15, // 散場所需分鐘
    impactRadius: '1.5 km',
    peakExitRate: 8000, // 人/分鐘（高峰）
  },
  {
    id: 'newyear',
    name: '跨年煙火',
    icon: '🎆',
    venue: '台北 101 廣場',
    capacity: 300000,
    duration: '30 分鐘',
    exitTime: 45,
    impactRadius: '3 km',
    peakExitRate: 25000,
  },
  {
    id: 'baseball',
    name: '棒球賽',
    icon: '⚾',
    venue: '台北大巨蛋',
    capacity: 20000,
    duration: '2.5 小時',
    exitTime: 10,
    impactRadius: '1 km',
    peakExitRate: 4000,
  },
  {
    id: 'expo',
    name: '大型展覽',
    icon: '🎪',
    venue: '南港展覽館',
    capacity: 80000,
    duration: '全天',
    exitTime: 30,
    impactRadius: '2 km',
    peakExitRate: 6000,
  },
]

// 模擬散場階段
const SIMULATION_PHASES = [
  { time: 0, label: '散場開始', crowd: 0, roadImpact: 0 },
  { time: 2, label: '初期湧出', crowd: 15, roadImpact: 20 },
  { time: 4, label: '人潮高峰', crowd: 45, roadImpact: 55 },
  { time: 6, label: '持續湧出', crowd: 70, roadImpact: 80 },
  { time: 8, label: '高峰維持', crowd: 85, roadImpact: 92 },
  { time: 10, label: '逐漸緩解', crowd: 92, roadImpact: 75 },
  { time: 12, label: '回穩中', crowd: 96, roadImpact: 55 },
  { time: 15, label: '大致疏散', crowd: 100, roadImpact: 30 },
]

const AFFECTED_ROADS = [
  { name: '忠孝東路四段', baseLoad: 65, peakLoad: 98 },
  { name: '光復南路', baseLoad: 55, peakLoad: 95 },
  { name: '市民大道四段', baseLoad: 60, peakLoad: 88 },
  { name: '忠孝東路五段', baseLoad: 50, peakLoad: 85 },
  { name: '基隆路一段', baseLoad: 58, peakLoad: 82 },
  { name: '松仁路', baseLoad: 40, peakLoad: 75 },
]

function AnimatedStat({ value, suffix = '', className = '' }) {
  const { formattedValue } = useCountUp(value, { duration: 800 })
  return <span className={className}>{formattedValue}{suffix}</span>
}

function EventSimulator() {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [simRunning, setSimRunning] = useState(false)
  const [simPhase, setSimPhase] = useState(0)
  const [simComplete, setSimComplete] = useState(false)
  const [elapsedMin, setElapsedMin] = useState(0)
  const timerRef = useRef(null)
  const phaseRef = useRef(null)

  function startSimulation() {
    if (!selectedEvent) return
    setSimRunning(true)
    setSimComplete(false)
    setSimPhase(0)
    setElapsedMin(0)

    // 每 2 秒推進一個階段（模擬加速）
    let phase = 0
    phaseRef.current = setInterval(() => {
      phase++
      if (phase >= SIMULATION_PHASES.length) {
        clearInterval(phaseRef.current)
        clearInterval(timerRef.current)
        setSimRunning(false)
        setSimComplete(true)
        return
      }
      setSimPhase(phase)
      setElapsedMin(SIMULATION_PHASES[phase].time)
    }, 2000)

    // 每秒更新分鐘計時
    timerRef.current = setInterval(() => {
      setElapsedMin((prev) => Math.min(prev + 0.5, 15))
    }, 500)
  }

  function resetSimulation() {
    clearInterval(phaseRef.current)
    clearInterval(timerRef.current)
    setSimRunning(false)
    setSimComplete(false)
    setSimPhase(0)
    setElapsedMin(0)
  }

  useEffect(() => {
    return () => {
      clearInterval(phaseRef.current)
      clearInterval(timerRef.current)
    }
  }, [])

  const currentPhase = SIMULATION_PHASES[simPhase] || SIMULATION_PHASES[0]

  return (
    <div className="space-y-6">
      {/* 活動選擇 */}
      <div className="card-glass rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-2">🏟️ 大型活動模擬器</h2>
        <p className="text-sm text-slate-400 mb-5">模擬大型活動散場的交通衝擊，產出事前部署建議</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {EVENTS.map((event) => (
            <button
              key={event.id}
              onClick={() => { setSelectedEvent(event); resetSimulation() }}
              disabled={simRunning}
              className={`p-4 rounded-xl border text-center transition-all ${
                selectedEvent?.id === event.id
                  ? 'border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/30 scale-105'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500 hover:scale-102'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-3xl block mb-2">{event.icon}</span>
              <span className="text-sm font-medium text-white block">{event.name}</span>
              <span className="text-xs text-slate-400 block mt-1">
                {event.capacity.toLocaleString()} 人
              </span>
            </button>
          ))}
        </div>

        {/* 選定活動詳情 */}
        {selectedEvent && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-5">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-400">場館</p>
                <p className="text-sm text-white font-medium">{selectedEvent.venue}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">容量</p>
                <p className="text-sm text-white font-medium">{selectedEvent.capacity.toLocaleString()} 人</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">散場時間</p>
                <p className="text-sm text-white font-medium">{selectedEvent.exitTime} 分鐘</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">尖峰流出</p>
                <p className="text-sm text-amber-400 font-medium">{selectedEvent.peakExitRate.toLocaleString()} 人/分</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">影響範圍</p>
                <p className="text-sm text-red-400 font-medium">{selectedEvent.impactRadius}</p>
              </div>
            </div>
          </div>
        )}

        {/* 控制按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={startSimulation}
            disabled={!selectedEvent || simRunning}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all"
          >
            {simRunning ? '⏳ 模擬進行中...' : simComplete ? '🔄 重新模擬' : '▶ 開始模擬散場'}
          </button>
          {simRunning && (
            <button
              onClick={resetSimulation}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
            >
              ⏹ 停止
            </button>
          )}
        </div>
      </div>

      {/* 模擬動畫區 */}
      {(simRunning || simComplete) && (
        <div className="card-glass rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">📊 散場模擬</h3>
            <div className="flex items-center gap-2">
              {simRunning && <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>}
              <span className="text-sm font-mono text-blue-400">T+{Math.floor(elapsedMin)} min</span>
              {simComplete && <span className="text-xs text-green-400 ml-2">✅ 模擬完成</span>}
            </div>
          </div>

          {/* 階段進度 */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>散場開始</span>
              <span className="text-white font-medium">{currentPhase.label}</span>
              <span>疏散完成</span>
            </div>
            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-500 via-amber-500 to-green-500"
                style={{ width: `${(simPhase / (SIMULATION_PHASES.length - 1)) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* 即時指標 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400">已疏散人數</p>
              <AnimatedStat
                value={Math.floor(selectedEvent.capacity * currentPhase.crowd / 100)}
                className="text-xl font-bold text-cyan-400"
              />
              <p className="text-xs text-slate-500 mt-0.5">
                /{selectedEvent.capacity.toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400">疏散進度</p>
              <AnimatedStat value={currentPhase.crowd} suffix="%" className="text-xl font-bold text-white" />
            </div>
            <div className={`bg-slate-700/50 rounded-lg p-3 text-center ${currentPhase.roadImpact > 80 ? 'glow-red' : currentPhase.roadImpact > 50 ? 'glow-amber' : ''}`}>
              <p className="text-xs text-slate-400">路網衝擊度</p>
              <AnimatedStat
                value={currentPhase.roadImpact}
                suffix="%"
                className={`text-xl font-bold ${
                  currentPhase.roadImpact > 80 ? 'text-red-400' :
                  currentPhase.roadImpact > 50 ? 'text-amber-400' : 'text-green-400'
                }`}
              />
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400">即時流出率</p>
              <AnimatedStat
                value={Math.floor(selectedEvent.peakExitRate * currentPhase.crowd / 100 * (currentPhase.roadImpact / 80))}
                suffix=" 人/分"
                className="text-xl font-bold text-amber-400"
              />
            </div>
          </div>

          {/* 路段衝擊動態 */}
          <h4 className="text-sm font-medium text-slate-300 mb-3">🚦 周邊路段即時負載</h4>
          <div className="space-y-2">
            {AFFECTED_ROADS.map((road) => {
              const currentLoad = Math.floor(
                road.baseLoad + (road.peakLoad - road.baseLoad) * (currentPhase.roadImpact / 100)
              )
              const isOverloaded = currentLoad > 90
              const isWarning = currentLoad > 80
              return (
                <div key={road.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 w-28 truncate">{road.name}</span>
                  <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        isOverloaded ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${currentLoad}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-mono w-10 text-right ${
                    isOverloaded ? 'text-red-400 animate-pulse' : isWarning ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {currentLoad}%
                  </span>
                </div>
              )
            })}
          </div>

          {/* 時間軸小點 */}
          <div className="mt-6 flex items-center justify-between">
            {SIMULATION_PHASES.map((phase, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  i <= simPhase ? 'bg-blue-500 scale-110' : 'bg-slate-600'
                } ${i === simPhase && simRunning ? 'animate-pulse ring-2 ring-blue-500/50' : ''}`}></div>
                <span className="text-xs text-slate-500 mt-1">{phase.time}m</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 事前部署建議 */}
      {simComplete && selectedEvent && (
        <>
          <DeploymentPlan event={selectedEvent} />
          <DeploymentGantt event={selectedEvent} />
        </>
      )}
    </div>
  )
}

// 事前部署建議子元件
function DeploymentPlan({ event }) {
  const plans = getDeploymentPlan(event)

  function handleExport() {
    const md = generateDeploymentMarkdown(event, plans)
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `事前部署計畫書_${event.name}_${event.venue}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card-glass rounded-lg p-6 border-gradient">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">📋 事前部署計畫書</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
          >
            📥 匯出 Markdown
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
          >
            🖨️ 列印
          </button>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs">
            AI 自動產出
          </span>
        </div>
      </div>

      {/* 活動摘要 */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-5">
        <h4 className="text-sm font-medium text-blue-400 mb-2">活動基本資訊</h4>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div><span className="text-slate-400">活動：</span><span className="text-white">{event.icon} {event.name}</span></div>
          <div><span className="text-slate-400">場館：</span><span className="text-white">{event.venue}</span></div>
          <div><span className="text-slate-400">人數：</span><span className="text-white">{event.capacity.toLocaleString()}</span></div>
          <div><span className="text-slate-400">散場時間：</span><span className="text-white">{event.exitTime} 分鐘</span></div>
          <div><span className="text-slate-400">影響範圍：</span><span className="text-white">{event.impactRadius}</span></div>
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-5">
        以下建議應於活動散場前 <strong className="text-amber-400">30 分鐘</strong> 完成部署，各單位請依時間表執行
      </p>

      <div className="space-y-4">
        {plans.map((plan, i) => (
          <div key={i} className="bg-slate-700/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{plan.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-white">{plan.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    plan.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    plan.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {plan.priority === 'high' ? '優先' : plan.priority === 'medium' ? '建議' : '備選'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{plan.description}</p>
                {plan.details && (
                  <div className="mt-2 bg-slate-800 rounded p-2">
                    {plan.details.map((d, j) => (
                      <p key={j} className="text-xs text-slate-400">• {d}</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 mt-2">
                  <span className="text-xs text-slate-500">⏰ 執行時機：{plan.timing}</span>
                  <span className="text-xs text-slate-500">👤 負責：{plan.responsible}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 摘要統計 */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-white">{plans.length}</p>
          <p className="text-xs text-slate-400">部署項目</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-amber-400">30 分鐘</p>
          <p className="text-xs text-slate-400">最早啟動</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-green-400">4 單位</p>
          <p className="text-xs text-slate-400">跨系統聯動</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-cyan-400">{Math.ceil(event.capacity * 0.15 / 45)}</p>
          <p className="text-xs text-slate-400">接駁車次</p>
        </div>
      </div>
    </div>
  )
}

function getDeploymentPlan(event) {
  const base = [
    {
      icon: '🚦',
      title: '號誌預調整',
      description: `散場前 20 分鐘，將場館周邊 6 個路口切換為「疏散模式」：出場方向綠燈時間 +40%，進場方向紅燈延長。`,
      details: [
        '光復南路/忠孝東路口：南向綠燈 40s → 56s',
        '市民大道/光復南路口：東向綠燈 35s → 49s',
        '忠孝東路/基隆路口：東向綠燈 +30%',
      ],
      timing: '散場前 20 分鐘',
      responsible: '交控中心',
      priority: 'high',
    },
    {
      icon: '🚇',
      title: '捷運加開列車',
      description: `通知台北捷運於散場時段加開板南線、文湖線班次，忠孝復興站增派站務人員。`,
      details: [
        '板南線：散場後 30 分鐘內加開 6 班次',
        '國父紀念館站：開放全部閘門出站',
        '忠孝復興站：增派 4 名站務人員引導',
      ],
      timing: '散場前 30 分鐘通知',
      responsible: '台北捷運公司',
      priority: 'high',
    },
    {
      icon: '🚌',
      title: '接駁公車調度',
      description: `於場館南側設置臨時接駁站，發車至市府轉運站、忠孝復興站、台北車站。`,
      details: [
        `預估需求：${Math.ceil(event.capacity * 0.15 / 45)} 車次（45 人/車）`,
        '路線 A：大巨蛋 → 市府轉運站（5 分鐘一班）',
        '路線 B：大巨蛋 → 忠孝復興站（5 分鐘一班）',
      ],
      timing: '散場前 10 分鐘就位',
      responsible: '公車處',
      priority: 'high',
    },
    {
      icon: '👮',
      title: '警力部署',
      description: `場館四周主要路口派駐交通警察手動指揮，優先確保行人安全通過。`,
      details: [
        '光復南路/忠孝路口：2 名警力',
        '國父紀念館前：2 名警力 + 人行管制',
        '光復南路/市民大道口：2 名警力',
      ],
      timing: '散場前 15 分鐘到位',
      responsible: '交通大隊',
      priority: 'medium',
    },
    {
      icon: '📡',
      title: '多語通報預備',
      description: `若漫遊率預期 ≥ 30%，提前生成多語疏散指引，散場時立即推送。`,
      details: [
        '中/英/日/韓四語版本預先生成',
        'CBS 細胞廣播範圍設定：場館 1.5km 內',
        '電子看板切換為疏散模式顯示',
      ],
      timing: '散場前 10 分鐘準備',
      responsible: '通報系統',
      priority: 'medium',
    },
    {
      icon: '🗺️',
      title: '導航平台通報',
      description: `推送活動散場資訊至 Google Maps / Apple Maps，引導車輛避開場館周邊。`,
      details: [
        '推送範圍：場館周邊 2km',
        '建議繞行路線：仁愛路 / 信義路',
        '預估影響時間：散場後 30 分鐘',
      ],
      timing: '散場前 20 分鐘推送',
      responsible: '交通局',
      priority: 'low',
    },
  ]

  // 根據活動規模調整
  if (event.capacity >= 100000) {
    base.push({
      icon: '🚁',
      title: '空中監控啟動',
      description: '啟動無人機即時監控人流動態，回傳畫面至交控中心輔助決策。',
      details: ['部署 2 架監控無人機', '覆蓋範圍：場館周邊 3km', '即時回傳 4K 影像'],
      timing: '散場前 15 分鐘起飛',
      responsible: '警政署',
      priority: 'medium',
    })
  }

  return base
}

// 時間軸甘特圖
function DeploymentGantt({ event }) {
  const timeline = [
    { time: -30, label: 'T-30', items: [{ name: '通知捷運加開', unit: '台北捷運', color: 'blue' }] },
    { time: -20, label: 'T-20', items: [{ name: '號誌切換疏散模式', unit: '交控中心', color: 'green' }, { name: '導航平台推送', unit: '交通局', color: 'cyan' }] },
    { time: -15, label: 'T-15', items: [{ name: '警力到位', unit: '交通大隊', color: 'purple' }, { name: event.capacity >= 100000 ? '無人機起飛' : 'YouBike 調度', unit: event.capacity >= 100000 ? '警政署' : '運具系統', color: 'amber' }] },
    { time: -10, label: 'T-10', items: [{ name: '接駁車就位', unit: '公車處', color: 'green' }, { name: '多語通報預生成', unit: '通報系統', color: 'amber' }] },
    { time: 0, label: '散場', items: [{ name: 'CBS 推播發送', unit: '通報系統', color: 'red' }, { name: '接駁車開始發車', unit: '公車處', color: 'green' }] },
    { time: 5, label: 'T+5', items: [{ name: '人潮高峰處理', unit: '現場', color: 'red' }] },
    { time: 15, label: 'T+15', items: [{ name: '號誌逐步恢復', unit: '交控中心', color: 'green' }] },
    { time: 30, label: 'T+30', items: [{ name: '接駁車收班', unit: '公車處', color: 'slate' }, { name: '警力撤離', unit: '交通大隊', color: 'slate' }] },
  ]

  const COLOR_MAP = {
    red: 'bg-red-500/20 border-red-500/40 text-red-400',
    blue: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
    green: 'bg-green-500/20 border-green-500/40 text-green-400',
    amber: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    purple: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
    cyan: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400',
    slate: 'bg-slate-500/20 border-slate-500/40 text-slate-400',
  }

  return (
    <div className="card-glass rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">⏰ 部署時間軸（甘特圖）</h3>
        <span className="text-xs text-slate-400">以散場時間為基準（T=0）</span>
      </div>

      <div className="relative">
        {/* 時間軸線 */}
        <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-slate-700"></div>
        {/* 散場標記線 */}
        <div className="absolute left-16 top-0 bottom-0 w-0.5" style={{ top: '50%' }}></div>

        <div className="space-y-1">
          {timeline.map((slot, i) => (
            <div key={i} className="flex items-start gap-4">
              {/* 時間標籤 */}
              <div className={`w-14 text-right flex-shrink-0 pt-2 ${
                slot.time === 0 ? 'text-red-400 font-bold' : slot.time < 0 ? 'text-blue-400' : 'text-green-400'
              }`}>
                <span className="text-xs font-mono">
                  {slot.time === 0 ? '🔔' : slot.time > 0 ? `+${slot.time}m` : `${slot.time}m`}
                </span>
              </div>

              {/* 節點 */}
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-2 z-10 ${
                slot.time === 0 ? 'bg-red-500 border-red-400' :
                slot.time < 0 ? 'bg-blue-500 border-blue-400' : 'bg-green-500 border-green-400'
              }`}></div>

              {/* 項目 */}
              <div className="flex-1 pb-3">
                <p className="text-xs text-slate-500 mb-1">
                  {slot.time === 0 ? '── 散場開始 ──' : slot.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {slot.items.map((item, j) => (
                    <div key={j} className={`px-3 py-1.5 rounded-lg border text-xs ${COLOR_MAP[item.color]}`}>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-slate-500 ml-2">({item.unit})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 圖例 */}
      <div className="mt-4 pt-3 border-t border-slate-700 flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 事前準備</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> 散場啟動</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> 事後恢復</span>
      </div>
    </div>
  )
}

// Markdown 匯出
function generateDeploymentMarkdown(event, plans) {
  return `# 事前部署計畫書

## 活動資訊

| 項目 | 內容 |
|------|------|
| 活動名稱 | ${event.icon} ${event.name} |
| 場館 | ${event.venue} |
| 預估人數 | ${event.capacity.toLocaleString()} 人 |
| 散場預估時間 | ${event.exitTime} 分鐘 |
| 尖峰流出率 | ${event.peakExitRate.toLocaleString()} 人/分鐘 |
| 影響範圍 | ${event.impactRadius} |

## 部署時間表

| 時間 | 項目 | 負責單位 | 優先度 |
|------|------|---------|--------|
| T-30 分鐘 | 通知捷運加開 | 台北捷運 | 高 |
| T-20 分鐘 | 號誌切換疏散模式 | 交控中心 | 高 |
| T-20 分鐘 | 導航平台推送避開 | 交通局 | 低 |
| T-15 分鐘 | 警力到位 | 交通大隊 | 中 |
| T-10 分鐘 | 接駁車就位 | 公車處 | 高 |
| T-10 分鐘 | 多語通報預生成 | 通報系統 | 中 |
| T=0 散場 | CBS 推播發送 | 通報系統 | 高 |
| T=0 散場 | 接駁車開始發車 | 公車處 | 高 |
| T+15 分鐘 | 號誌逐步恢復 | 交控中心 | - |
| T+30 分鐘 | 接駁收班、警力撤離 | 各單位 | - |

## 詳細部署項目

${plans.map((p, i) => `### ${i + 1}. ${p.icon} ${p.title}（${p.priority === 'high' ? '優先' : p.priority === 'medium' ? '建議' : '備選'}）

${p.description}

${p.details ? p.details.map((d) => `- ${d}`).join('\n') : ''}

- **執行時機**：${p.timing}
- **負責單位**：${p.responsible}
`).join('\n')}

## 預估資源需求

| 資源 | 數量 | 說明 |
|------|------|------|
| 接駁車 | ${Math.ceil(event.capacity * 0.15 / 45)} 車次 | 5 分鐘一班 |
| 警力 | 6 名 | 3 個主要路口 |
| 捷運加開 | 6 班次 | 散場後 30 分鐘內 |
| 電子看板 | 12 面 | 切換疏散模式 |

---
*本計畫書由城市應變分析 AI Agent 自動產出*
*產出時間：${new Date().toLocaleString('zh-TW')}*
`
}

export default EventSimulator
