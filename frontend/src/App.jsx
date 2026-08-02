import { useState, useEffect, useRef } from 'react'
import TrafficDashboard from './components/TrafficDashboard'
import AlertList from './components/AlertList'
import CrowdDensityChart from './components/CrowdDensityChart'
import TrafficMap from './components/TrafficMap'
import IncidentPanel from './components/IncidentPanel'
import ETECalculation from './components/ETECalculation'
import ReportDocument from './components/ReportDocument'
import MultiLangReport from './components/MultiLangReport'
import DemoController from './components/DemoController'
import StatusBar from './components/StatusBar'
import ChatDrawer from './components/ChatDrawer'
import PublicView from './components/PublicView'
import EventSimulator from './components/EventSimulator'
import MaaSPlanner from './components/MaaSPlanner'
import WeatherModule from './components/WeatherModule'
import ProactiveAlert from './components/ProactiveAlert'
import PublicReport from './components/PublicReport'
import CitizenSMS from './components/CitizenSMS'
import NotificationDispatch from './components/NotificationDispatch'
import SecurityModule from './components/SecurityModule'
import HumanOverride from './components/HumanOverride'
import SimClockBar from './components/SimClockBar'
import { useSimClock } from './hooks/useSimClock.jsx'
import { useToast } from './components/ToastProvider'

// 5 大主頁面
const TABS = [
  { id: 'overview', label: '📡 即時態勢', desc: '地圖 · 車流 · 人流 · 預警' },
  { id: 'response', label: '🚨 事件應變', desc: '注入 · 決策 · 審核 · 建議書' },
  { id: 'notify', label: '📢 通報發佈', desc: '多語 · 管道 · 民眾簡訊' },
  { id: 'extend', label: '🧩 智慧應用', desc: '出行 · 調度 · 模擬 · 天氣 · 回報' },
  { id: 'system', label: '⚙️ 系統管理', desc: '資安 · Demo' },
]

// 智慧應用子分類
const EXTEND_SUBTABS = [
  { id: 'maas', label: '🚌 智慧出行' },
  { id: 'simulator', label: '🏟️ 活動模擬' },
  { id: 'weather', label: '🌧️ 天氣連動' },
  { id: 'crowdreport', label: '📢 公眾回報' },
]

// 系統管理子分類
const SYSTEM_SUBTABS = [
  { id: 'security', label: '🔐 資安控管' },
  { id: 'demo', label: '🎬 Demo 模式' },
]

function App() {
  // URL 參數自動分流：?mode=public 直接進民眾模式
  const urlParams = new URLSearchParams(window.location.search)
  const autoPublic = urlParams.get('mode') === 'public'

  const [activeTab, setActiveTab] = useState('overview')
  const [extendSub, setExtendSub] = useState('maas')
  const [systemSub, setSystemSub] = useState('security')
  const [fullscreen, setFullscreen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [incidentResult, setIncidentResult] = useState(null) // 當前事件（最新的）
  const [incidentHistory, setIncidentHistory] = useState([]) // 事件歷史（所有已處理的）
  const [publicMode, setPublicMode] = useState(autoPublic)
  const [loggedIn, setLoggedIn] = useState(autoPublic)
  const [userRole, setUserRole] = useState(autoPublic ? 'public' : '')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [weatherEnabled, setWeatherEnabled] = useState(false)
  const { addToast } = useToast()
  const { setOnEvent, currentTime } = useSimClock()
  const [pendingDecision, setPendingDecision] = useState(null)

  // 事件觸發時間點 → 顯示待審核通知
  const DECISION_TRIGGERS = {
    '22:10': '🚨 AI 產出 2 項決策待審核：路線封閉 + 號誌調整',
    '22:20': '🚨 AI 產出 2 項決策待審核：跨系統聯動 + 多語通報',
    '22:30': '🚨 AI 產出 1 項決策待審核：人工指揮派遣',
  }

  // 監聽時鐘，觸發待審核提示
  useEffect(() => {
    if (DECISION_TRIGGERS[currentTime] && activeTab !== 'response') {
      setPendingDecision(DECISION_TRIGGERS[currentTime])
    }
  }, [currentTime])

  function handleGoToDecision() {
    setActiveTab('response')
    setPendingDecision(null)
    // 滾動到頂部讓 HumanOverride 可見
    window.scrollTo(0, 0)
  }

  // 模擬時鐘事件觸發 → 彈 Toast
  // 事件觸發對照（SimClock 到達時間時自動處理）
  const INCIDENT_MAP = {
    'TPE_2026_ACC_001': { type: 'road_collapse', location: '光復南路與忠孝東路口南側', description: '地下管線爆裂導致路面塌陷並引發三車連環追撞，光復南路南下全線封鎖' },
    'TPE_2026_EVT_002': { type: 'crowd_surge', location: '捷運國父紀念館站5號出口', description: '散場人群推擠受傷，救護車佔用單向車道' },
    'TPE_2026_EVT_003': { type: 'signal_failure', location: '信義威秀/ATT4FUN周邊', description: '信義區部分路段號誌失效，需改由人工交通指揮' },
  }

  const autoProcessedRef = useRef(new Set())

  useEffect(() => {
    setOnEvent(async (event) => {
      addToast(`[${event.time}] ${event.message}`, 'critical')

      // 自動觸發 Agent 分析（每個事件只處理一次）
      if (event.eventId && !autoProcessedRef.current.has(event.eventId)) {
        autoProcessedRef.current.add(event.eventId)
        const inc = INCIDENT_MAP[event.eventId]
        if (inc) {
          try {
            const { processIncident } = await import('./services/api')
            const result = await processIncident(inc)
            // 把舊事件推進歷史，新事件取代
            setIncidentHistory((h) => {
              const prev = incidentResult
              return prev ? [prev, ...h] : h
            })
            setIncidentResult(result)
          } catch (err) {
            console.error('Auto process incident failed:', err)
          }
        }
      }
    })
  }, [setOnEvent, addToast])

  const PASSWORDS = { commander: '1234', public: '' }
  const ROLE_INFO = {
    commander: { label: '指揮官', icon: '🎖️', desc: '完整系統權限，可監控、處理事件、發送通報、調整號誌' },
    public: { label: '民眾', icon: '👥', desc: '查看公開路況、路線規劃、提交回報、語音播報' },
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (userRole === 'public') {
      try {
        const { loginAPI } = await import('./services/api')
        await loginAPI('public', '')
      } catch (err) { /* 民眾模式可離線 */ }
      setLoggedIn(true)
      setPublicMode(true)
      return
    }
    // 指揮官：呼叫後端 API 取得 JWT
    try {
      const { loginAPI } = await import('./services/api')
      await loginAPI(userRole, loginPassword)
      setLoggedIn(true)
      setLoginError('')
      setPublicMode(false)
    } catch (err) {
      setLoginError('密碼錯誤，請重新輸入')
    }
  }

  function handleLogout() {
    import('./services/api').then(({ logoutAPI }) => logoutAPI())
    setLoggedIn(false)
    setUserRole('')
    setLoginPassword('')
    setPublicMode(false)
  }

  // 切換 Tab 時滾動到頂部
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    // 也處理 main 元素
    const main = document.querySelector('main')
    if (main) main.scrollTop = 0
  }, [activeTab, extendSub, systemSub])

  // ESC 退出
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (chatOpen) setChatOpen(false)
        else if (fullscreen) setFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreen, chatOpen])

  // 子標籤元件
  function SubTabs({ tabs, active, onChange }) {
    return (
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              active === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex flex-col ${fullscreen ? 'fullscreen-mode' : ''}`}>
      {/* ===== 未登入：登入頁面 ===== */}
      {!loggedIn && (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="text-center mb-8">
              <span className="text-5xl">🚦</span>
              <h1 className="text-2xl font-bold text-white mt-3">城市應變分析 AI Agent</h1>
              <p className="text-sm text-slate-400 mt-1">智慧交通指揮 Dashboard</p>
              <p className="text-xs text-slate-500 mt-0.5">中華電信 2026 AI Hackathon</p>
            </div>

            {/* 角色選擇 */}
            <div className="card-glass rounded-2xl p-6 space-y-5">
              <div>
                <p className="text-sm text-slate-300 mb-3">選擇您的身份：</p>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(ROLE_INFO).map(([role, info]) => (
                    <button
                      key={role}
                      onClick={() => { setUserRole(role); setLoginError('') }}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        userRole === role
                          ? 'border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/30 scale-105'
                          : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-3xl block">{info.icon}</span>
                      <span className="text-sm text-white block mt-2">{info.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 角色說明 */}
              {userRole && (
                <div className="bg-slate-700/30 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-400">
                    <strong className="text-white">{ROLE_INFO[userRole].icon} {ROLE_INFO[userRole].label}</strong>：{ROLE_INFO[userRole].desc}
                  </p>
                  {userRole !== 'public' && (
                    <p className="text-xs text-slate-500 mt-1">Demo 密碼：{PASSWORDS[userRole]}</p>
                  )}
                </div>
              )}

              {/* 密碼輸入 */}
              {userRole && (
                <form onSubmit={handleLogin} className="space-y-3">
                  {userRole !== 'public' && (
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="請輸入密碼"
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-center"
                    />
                  )}
                  {loginError && <p className="text-xs text-red-400 text-center">{loginError}</p>}
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all"
                  >
                    {userRole === 'public' ? '進入民眾模式' : '登入系統'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 已登入：民眾模式 ===== */}
      {loggedIn && publicMode && (
        <div className="min-h-screen bg-slate-900 p-4">
          <div className="max-w-lg mx-auto mb-4 flex items-center justify-between">
            {/* 指揮官預覽民眾視角時才顯示返回按鈕 */}
            {userRole !== 'public' ? (
              <button
                onClick={() => setPublicMode(false)}
                className="text-xs text-slate-400 hover:text-white bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                ← 返回指揮官模式
              </button>
            ) : <div />}
            {/* 民眾透過 ?mode=public 進入時不顯示登出（避免看到指揮官介面） */}
            {!autoPublic && (
              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-white bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                登出
              </button>
            )}
          </div>
          <PublicView incidentResult={incidentResult} />
        </div>
      )}

      {/* ===== 已登入：指揮官/操作員模式 ===== */}
      {loggedIn && !publicMode && (
      <>
      {/* Status Bar */}
      <div className={`status-bar ${fullscreen ? 'hidden' : ''}`}>
        <StatusBar />
      </div>

      {/* 模擬時鐘控制列 */}
      {!fullscreen && <SimClockBar />}

      {/* Header */}
      <header className={`bg-slate-800 border-b border-slate-700 px-6 py-3 transition-all duration-300 ${fullscreen ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-white">
            🚦 城市應變分析 AI Agent — 智慧交通指揮 Dashboard
          </h1>
          <div className="flex items-center gap-2">
            {/* 當前角色 */}
            <span className="text-xs px-2 py-1 bg-slate-700 border border-slate-600 rounded-lg text-slate-300">
              {ROLE_INFO[userRole]?.icon} {ROLE_INFO[userRole]?.label}
            </span>
            <button onClick={() => setPublicMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-xs text-green-400 transition-all">
              📱 民眾模式
            </button>
            <button onClick={() => setChatOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs text-blue-400 transition-all">
              💬 策略諮詢
            </button>
            <button onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen()
                setFullscreen(true)
              } else {
                document.exitFullscreen()
                setFullscreen(false)
              }
            }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs text-slate-300 transition-all" title="ESC 退出">
              🖥️ 全屏
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-xs text-red-400 transition-all">
              登出
            </button>
          </div>
        </div>

        {/* 主導航 — 5 大分組 */}
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-center transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white border border-blue-500/40 shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span className="text-sm font-medium block">{tab.label}</span>
              <span className="text-xs text-slate-500 block mt-0.5">{tab.desc}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* 全屏迷你導航 */}
      {fullscreen && (
        <div className="sticky top-8 z-30 bg-slate-800/90 backdrop-blur-sm border-b border-slate-700/50 px-4 py-2 flex items-center justify-between">
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setChatOpen(true)} className="px-2 py-1 text-xs text-blue-400 bg-blue-600/20 rounded">💬</button>
            <button onClick={() => { document.exitFullscreen(); setFullscreen(false) }} className="px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium">✕ 退出全屏</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 bg-slate-900 transition-all duration-300 ${fullscreen ? 'p-4' : 'p-6'}`}>

        {/* 待審核決策浮動通知 */}
        {pendingDecision && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce">
            <button
              onClick={handleGoToDecision}
              className="flex items-center gap-3 px-5 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-2xl shadow-red-500/40 border border-red-400/30 transition-all max-w-sm"
            >
              <span className="text-2xl">⚠️</span>
              <div className="text-left">
                <p className="text-sm font-bold">{pendingDecision}</p>
                <p className="text-xs text-red-200 mt-0.5">點擊前往審核 →</p>
              </div>
            </button>
          </div>
        )}

        {/* ===== 1. 即時態勢 ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <TrafficMap />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TrafficDashboard />
              </div>
              <div>
                <AlertList />
              </div>
            </div>

            {/* 通報派遣狀態（事件發生後顯示） */}
            {incidentResult?.agent_structured?.dispatch && (
              <div className="card-glass rounded-lg p-6 border border-indigo-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">📞 通報派遣狀態</h2>
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg animate-pulse">即時通報中</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* 通報單位 */}
                  <div className="lg:col-span-2">
                    <p className="text-sm text-slate-400 mb-2">已通報單位：</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {incidentResult.agent_structured.dispatch.agencies?.map((agency, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${agency.priority === 'P0' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{agency.priority}</span>
                          <div>
                            <p className="text-sm text-white font-medium">{agency.name}</p>
                            <p className="text-xs text-slate-400">{agency.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 號誌調整 */}
                  <div>
                    <p className="text-sm text-slate-400 mb-2">號誌調整：</p>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                      <p className="text-sm text-amber-300">{incidentResult.agent_structured.dispatch.signal_adjustment?.action}</p>
                      <p className="text-xs text-slate-400 mt-2">持續時間：{incidentResult.agent_structured.dispatch.signal_adjustment?.duration}</p>
                      <p className="text-xs text-slate-400 mt-1">預估處理：{incidentResult.agent_structured.dispatch.handling_time}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <CrowdDensityChart />
            <ProactiveAlert />
          </div>
        )}

        {/* ===== 2. 事件應變 ===== */}
        {activeTab === 'response' && (
          <div className="space-y-6">
            {/* 指揮官控制權置頂 */}
            <HumanOverride />
            {/* 事件注入 */}
            <IncidentPanel incidentResult={incidentResult} setIncidentResult={setIncidentResult} />
            {/* ETE + 建議書 + 簡訊（事件觸發後才顯示） */}
            {currentTime >= '22:10' && (
              <>
                <ETECalculation key={incidentResult?.event} incidentResult={incidentResult} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ReportDocument incidentResult={incidentResult} />
                  <CitizenSMS incidentResult={incidentResult} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== 3. 通報發佈 ===== */}
        {activeTab === 'notify' && (
          <div className="space-y-6">
            {/* 發送對象篩選 */}
            {incidentResult && (
              <div className="card-glass rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-3">📡 發送對象篩選（地理圍欄）</h2>
                <p className="text-sm text-slate-400 mb-2">系統根據事件位置自動識別影響範圍內的基地台，精準推播至覆蓋區域用戶</p>
                <p className="text-sm text-amber-400 mb-4">📍 目前事件：{incidentResult?.agent_structured?.situation?.description || incidentResult?.event || '交通事件'}</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-cyan-400 mb-3">📶 影響範圍基地台</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-slate-800 rounded p-2">
                        <span className="text-sm text-white">BL17 大巨蛋站</span>
                        <span className="text-xs text-amber-400">28,000 用戶 · 漫遊 35%</span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-800 rounded p-2">
                        <span className="text-sm text-white">BL12 忠孝復興站</span>
                        <span className="text-xs text-slate-400">22,000 用戶 · 漫遊 18%</span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-800 rounded p-2">
                        <span className="text-sm text-white">R03 信義商圈</span>
                        <span className="text-xs text-amber-400">35,000 用戶 · 漫遊 38%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-green-400 mb-3">📊 推播統計</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">總觸及用戶</span>
                        <span className="text-lg font-bold text-white">85,000</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">本國用戶（中文 CBS）</span>
                        <span className="text-sm font-bold text-cyan-400">~59,000</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">漫遊用戶（多語推播）</span>
                        <span className="text-sm font-bold text-amber-400">~26,000</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-600">
                        <span className="text-sm text-slate-300">真實 SMS 發送</span>
                        <span className="text-sm font-bold text-green-400">3 支指揮官手機 ✅</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-sm text-blue-300">💡 正式環境接入中華電信 CBS Gateway 後，可精準推播至基地台覆蓋範圍內所有手機（無需安裝 APP）。Demo 中透過 AWS SNS 真實發送 SMS 至指揮團隊手機展示。</p>
                </div>
              </div>
            )}
            <NotificationDispatch incidentResult={incidentResult} />
            <MultiLangReport incidentResult={incidentResult} />
            {/* 事件產出的民眾通報（從事件應變帶過來） */}
            {incidentResult && incidentResult.llm_guidance && (
              <div className="card-glass rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-3">📋 事件應變產出 — 民眾導引通報</h2>
                <p className="text-xs text-slate-400 mb-3">以下內容由 AI Agent 於事件處理時自動產出，可一鍵發佈：</p>
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">🤖</span>
                    <span className="text-xs text-cyan-400 font-medium">AI Agent 生成</span>
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{incidentResult.llm_guidance}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-xs text-slate-400">
                  <p>• 事件：{incidentResult.event}</p>
                  <p>• 替代路線：{incidentResult.alternative_routes?.map(r => r.path).join('、')}</p>
                  <p>• ETE：{incidentResult.ete?.ete_minutes} 分鐘</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 4. 智慧應用 ===== */}
        {activeTab === 'extend' && (
          <div>
            <SubTabs tabs={EXTEND_SUBTABS} active={extendSub} onChange={setExtendSub} />
            {extendSub === 'maas' && <MaaSPlanner />}
            {extendSub === 'simulator' && <EventSimulator />}
            {extendSub === 'weather' && <WeatherModule weatherEnabled={weatherEnabled} setWeatherEnabled={setWeatherEnabled} />}
            {extendSub === 'crowdreport' && <PublicReport />}
          </div>
        )}

        {/* ===== 5. 系統管理 ===== */}
        {activeTab === 'system' && (
          <div>
            <SubTabs tabs={SYSTEM_SUBTABS} active={systemSub} onChange={setSystemSub} />
            {systemSub === 'security' && <SecurityModule />}
            {systemSub === 'demo' && <DemoController onTabChange={setActiveTab} currentTab={activeTab} />}
          </div>
        )}

      </main>

      {/* Chat Drawer */}
      <ChatDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </>
      )}
    </div>
  )
}

export default App
