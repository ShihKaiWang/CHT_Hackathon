import { useState, useEffect } from 'react'
import VoiceBroadcast from './VoiceBroadcast'
import MapRoutePlanner from './MapRoutePlanner'
import PublicReport from './PublicReport'
import { useSimClock } from '../hooks/useSimClock.jsx'

const CURRENT_INCIDENTS = [
  {
    id: 1,
    title: '光復南路 路面塌陷',
    status: '封閉中',
    severity: 'critical',
    location: '光復南路與忠孝東路口南側',
    since: '22:10',
    ete: '60 分鐘',
    recovery: '23:10',
  },
  {
    id: 2,
    title: '捷運國父紀念館站 人群推擠',
    status: '管制中',
    severity: 'critical',
    location: '5 號出口，救護車佔用車道',
    since: '22:20',
    ete: '40 分鐘',
    recovery: '23:00',
  },
  {
    id: 3,
    title: '信義威秀周邊 號誌故障',
    status: '人工指揮中',
    severity: 'warning',
    location: 'ATT4FUN 周邊路燈號誌',
    since: '22:30',
    ete: '20 分鐘',
    recovery: '22:50',
  },
]

const ALTERNATIVE_ROUTES = [
  {
    id: 1,
    from: '光復南路方向',
    suggestion: '改走市民大道四段',
    extra_time: '+8 分鐘',
    congestion: '壅塞',
    congestion_color: 'amber',
    since: '22:10',
  },
  {
    id: 2,
    from: '光復南路方向',
    suggestion: '改走仁愛路四段',
    extra_time: '+5 分鐘',
    congestion: '順暢',
    congestion_color: 'green',
    since: '22:10',
  },
  {
    id: 3,
    from: '忠孝東路方向',
    suggestion: '改走敦化南路一段',
    extra_time: '+6 分鐘',
    congestion: '順暢',
    congestion_color: 'green',
    since: '22:15',
  },
]

const NEARBY_TRANSIT = [
  { type: '🚇', name: '捷運國父紀念館站（板南線）', distance: '350m', status: '人流管制中', since: '22:20' },
  { type: '🚇', name: '捷運市政府站（板南線）', distance: '600m', status: '正常營運', since: '17:00' },
  { type: '🚌', name: '212 路公車', distance: '路口', status: '臨時改道仁愛路', since: '22:15' },
  { type: '🚌', name: '232 路公車', distance: '路口', status: '臨時改道市民大道', since: '22:15' },
]

function PublicView({ incidentResult }) {
  const [activeSection, setActiveSection] = useState('info') // info | route | report
  const { currentTime } = useSimClock()

  // 從 Agent 結果提取民眾可見資訊（已經指揮官審核）
  const s = incidentResult?.agent_structured || {}
  const hasIncident = !!incidentResult

  // Web Push 瀏覽器通知 — 事件發生時推送
  useEffect(() => {
    if (hasIncident && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const title = s.situation?.event_type || incidentResult?.event || '交通事件通報'
        const body = s.guidance_text || `${s.situation?.location || ''}附近有交通事件，請注意替代路線。`
        new Notification(`⚠️ ${title}`, { body, icon: '🚨' })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission()
      }
    }
  }, [hasIncident])

  // 動態事件列表（從 Agent 結果產生）
  const dynamicIncidents = hasIncident ? [{
    id: 1,
    title: s.situation?.event_type || incidentResult?.event || '交通事件',
    status: '處理中',
    severity: 'critical',
    location: s.situation?.location || '台北市信義區',
    since: currentTime,
    ete: `${s.ete?.minutes || incidentResult?.ete?.ete_minutes || 60} 分鐘`,
    description: s.situation?.description || '',
  }] : []

  // 動態替代路線（從 Agent 結果產生）
  const dynamicRoutes = hasIncident
    ? (s.alternatives || incidentResult?.alternative_routes || []).map((alt, i) => ({
        id: i + 1,
        from: s.situation?.location || '事件路段方向',
        suggestion: `改走${alt.name || alt.path}`,
        congestion: alt.saturation < 0.7 ? '順暢' : '壅塞',
        congestion_color: alt.saturation < 0.7 ? 'green' : 'amber',
        saturation: alt.saturation,
      }))
    : []

  // 民眾導引文字（Agent 生成）
  const guidanceText = s.guidance_text || incidentResult?.llm_guidance || ''

  // 多語通報
  const multilang = s.multilang || {}

  // 沒有事件時用寫死的 fallback（SimClock 到 22:10 才顯示）
  const visibleIncidents = hasIncident ? dynamicIncidents : CURRENT_INCIDENTS.filter((i) => i.since <= currentTime)
  const visibleRoutes = hasIncident ? dynamicRoutes : ALTERNATIVE_ROUTES.filter((r) => r.since <= currentTime)
  const visibleTransit = NEARBY_TRANSIT.filter((t) => t.since <= currentTime)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header — 手機風格 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">🚦 台北即時路況</h1>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {currentTime}
          </span>
        </div>
        <p className="text-sm text-blue-100">信義區 · 大安區 即時交通資訊</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-xs text-blue-200">即時更新中</span>
        </div>
      </div>

      {/* 功能切換 Tab */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('info')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeSection === 'info' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          📍 即時路況
        </button>
        <button
          onClick={() => setActiveSection('route')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeSection === 'route' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          🚌 路線規劃
        </button>
        <button
          onClick={() => setActiveSection('report')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeSection === 'report' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          📢 我要回報
        </button>
      </div>

      {/* 路線規劃 */}
      {activeSection === 'route' && <MapRoutePlanner />}

      {/* 公眾回報 */}
      {activeSection === 'report' && <PublicReport />}

      {/* 即時路況（原本內容） */}
      {activeSection === 'info' && (
      <div className="space-y-4">

      {/* 語音播報 */}
      {visibleIncidents.length > 0 && <VoiceBroadcast />}

      {/* 目前事件 */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white px-1">⚠️ 目前事件</h2>
        {visibleIncidents.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm text-green-400">目前無事件，交通狀況正常</p>
            <p className="text-xs text-slate-500 mt-1">模擬時間：{currentTime}</p>
          </div>
        ) : (
        visibleIncidents.map((incident) => (
          <div
            key={incident.id}
            className={`rounded-xl p-4 border ${
              incident.severity === 'critical'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">{incident.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                incident.severity === 'critical'
                  ? 'bg-red-500 text-white'
                  : 'bg-amber-500 text-black'
              }`}>
                {incident.status}
              </span>
            </div>
            <div className="space-y-1 text-sm text-slate-300">
              <p>📍 {incident.location}</p>
              <p>🕐 發生時間：{incident.since}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
                <span className="text-xs">⏱️ 預計恢復：<strong className="text-white">{incident.recovery}</strong></span>
                <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">
                  剩餘約 {incident.ete}
                </span>
              </div>
            </div>
          </div>
        ))
        )}
      </div>

      {/* 替代路線建議 */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white px-1">🛤️ 建議替代路線</h2>

        {/* AI Agent 導引（指揮官審核後發布） */}
        {hasIncident && guidanceText && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">🤖 AI 導引 · 已由指揮官審核</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{guidanceText}</p>
          </div>
        )}

        {/* 多語通報（如果有） */}
        {hasIncident && multilang.zh && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-xs text-blue-400 font-medium mb-2">🌐 多語通報</p>
            <div className="space-y-1.5 text-xs">
              {multilang.zh && <p className="text-slate-300">🇹🇼 {multilang.zh}</p>}
              {multilang.en && <p className="text-slate-400">🇺🇸 {multilang.en}</p>}
              {multilang.ja && <p className="text-slate-400">🇯🇵 {multilang.ja}</p>}
              {multilang.ko && <p className="text-slate-400">🇰🇷 {multilang.ko}</p>}
            </div>
          </div>
        )}
        {visibleRoutes.map((route) => (
          <div key={route.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">{route.from}</p>
                <p className="text-sm text-white font-medium mt-0.5">👉 {route.suggestion}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-400">{route.extra_time}</p>
                <p className={`text-xs mt-0.5 ${
                  route.congestion_color === 'green' ? 'text-green-400' : 'text-amber-400'
                }`}>
                  ● {route.congestion}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 附近大眾運輸 */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white px-1">🚇 附近大眾運輸</h2>
        <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">
          {visibleTransit.map((transit, i) => (
            <div key={i} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{transit.type}</span>
                <div>
                  <p className="text-sm text-white">{transit.name}</p>
                  <p className="text-xs text-slate-400">{transit.distance}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                transit.status === '正常營運'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {transit.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 安全提醒 */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <h3 className="text-sm font-medium text-blue-400 mb-2">💡 安全提醒</h3>
        <ul className="space-y-1 text-xs text-slate-300">
          <li>• 請遠離塌陷區域，注意施工圍籬</li>
          <li>• 步行者建議使用仁愛路地下道通行</li>
          <li>• 行動不便者可撥打 1999 市民熱線求助</li>
          <li>• 最新資訊請關注台北市交通局官方公告</li>
        </ul>
      </div>

      {/* 底部 */}
      <div className="text-center text-xs text-slate-500 py-4">
        <p>城市應變分析 AI Agent — 中華電信 2026 AI Hackathon</p>
        <p className="mt-1">資料每 30 秒自動更新 · 模擬時間 {currentTime}</p>
      </div>
      </div>
      )}
    </div>
  )
}

export default PublicView
