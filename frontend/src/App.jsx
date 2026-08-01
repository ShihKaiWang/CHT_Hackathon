import { useState, useEffect } from 'react'
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
import WeatherModule from './components/WeatherModule'
import MaaSPlanner from './components/MaaSPlanner'
import SharedMobility from './components/SharedMobility'
import ProactiveAlert from './components/ProactiveAlert'
import PublicReport from './components/PublicReport'
import CitizenSMS from './components/CitizenSMS'
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
  { id: 'shared', label: '🚲 運具調度' },
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
  useEffect(() => {
    setOnEvent((event) => {
      addToast(`[${event.time}] ${event.message}`, 'critical')
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
          <PublicView />
        </div>
      )}

      {/* ===== 已登入：指揮官/操作員模式 ===== */}
      {loggedIn && !publicMode && (
      <>
      {/* Status Bar */}
      <div className="status-bar">
        <StatusBar />
      </div>

      {/* 模擬時鐘控制列 */}
      <SimClockBar />

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
            <button onClick={() => setFullscreen(!fullscreen)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs text-slate-300 transition-all" title="ESC 退出">
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
            <button onClick={() => setFullscreen(false)} className="px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium">✕ 退出全屏</button>
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
            <IncidentPanel />
            {/* ETE + 建議書 + 簡訊（事件觸發後才顯示） */}
            {currentTime >= '22:10' && (
              <>
                <ETECalculation />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ReportDocument />
                  <CitizenSMS />
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== 3. 通報發佈 ===== */}
        {activeTab === 'notify' && (
          <div className="space-y-6">
            <MultiLangReport />
          </div>
        )}

        {/* ===== 4. 智慧應用 ===== */}
        {activeTab === 'extend' && (
          <div>
            <SubTabs tabs={EXTEND_SUBTABS} active={extendSub} onChange={setExtendSub} />
            {extendSub === 'maas' && <MaaSPlanner />}
            {extendSub === 'shared' && <SharedMobility />}
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
