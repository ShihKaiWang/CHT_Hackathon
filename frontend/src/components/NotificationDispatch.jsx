import { useState, useEffect } from 'react'

// All possible government agencies
const ALL_AGENCIES = [
  { id: 'police_traffic', name: '警察局交通大隊', icon: '🚔', desc: '事故處理、交通疏導、封路管制' },
  { id: 'police', name: '警察局', icon: '👮', desc: '現場封鎖、維安、事故調查' },
  { id: 'fire_rescue', name: '消防局救護車', icon: '🚑', desc: '傷患救助、緊急送醫' },
  { id: 'fire_hazmat', name: '消防局 HAZMAT', icon: '☢️', desc: '危險物質處理、除污作業' },
  { id: 'traffic_bureau', name: '交通局號誌維修組', icon: '🚦', desc: '號誌搶修、時制調整' },
  { id: 'public_works', name: '工務局搶修組', icon: '🏗️', desc: '路面修復、管線檢查' },
  { id: 'water_company', name: '自來水公司', icon: '💧', desc: '水管破裂搶修、確認管線' },
  { id: 'gas_company', name: '瓦斯公司', icon: '🔥', desc: '瓦斯管線安全確認' },
  { id: 'epa_parks', name: '環保局公園處', icon: '🌳', desc: '路樹移除、清運作業' },
  { id: 'epa', name: '環保局', icon: '♻️', desc: '環境清淤、污染監測' },
  { id: 'water_resources', name: '水利處', icon: '🌊', desc: '抽水作業、排水系統' },
  { id: 'taipower', name: '台電', icon: '⚡', desc: '斷電搶修、電纜修復' },
  { id: 'mrt', name: '台北捷運公司', icon: '🚇', desc: '加開班次、站務人員增派' },
  { id: 'bus', name: '公車處', icon: '🚌', desc: '接駁車調度、路線改道' },
  { id: 'forensics', name: '鑑識組', icon: '🔍', desc: '事故重建、證據採集' },
]

function NotificationDispatch({ incidentResult }) {
  // Agent 推薦的單位（從 incidentResult.agent_structured.dispatch.agencies 取得）
  const agentRecommended = incidentResult?.agent_structured?.dispatch?.agencies || []
  const recommendedIds = agentRecommended.map(a => {
    // 從名稱匹配到 ID
    const match = ALL_AGENCIES.find(ag => a.name.includes(ag.name) || ag.name.includes(a.name))
    return match?.id || ''
  }).filter(Boolean)

  const [selectedAgencies, setSelectedAgencies] = useState([])
  const [dispatching, setDispatching] = useState(false)
  const [dispatched, setDispatched] = useState(false)

  // 當 Agent 推薦更新時，自動勾選
  useEffect(() => {
    if (recommendedIds.length > 0) {
      setSelectedAgencies(recommendedIds)
    }
  }, [incidentResult])

  function toggleAgency(id) {
    setSelectedAgencies(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  function handleDispatch() {
    if (selectedAgencies.length === 0) return
    setDispatching(true)
    setTimeout(() => {
      setDispatching(false)
      setDispatched(true)
    }, 2000)
  }

  const signalAdj = incidentResult?.agent_structured?.dispatch?.signal_adjustment
  const handlingTime = incidentResult?.agent_structured?.dispatch?.handling_time

  return (
    <div className="card-glass rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">📞 公務單位通報派遣</h2>
          <p className="text-sm text-slate-400 mt-1">AI Agent 已根據事故類型自動判定應通報單位，請確認後送出</p>
        </div>
        {dispatched && (
          <span className="text-xs px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg">✅ 已通報</span>
        )}
      </div>

      {/* Agent 推薦提示 */}
      {agentRecommended.length > 0 && !dispatched && (
        <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <p className="text-sm text-cyan-400">🤖 AI Agent 建議通報以下 {agentRecommended.length} 個單位（已自動勾選）</p>
        </div>
      )}

      {/* Agency Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {ALL_AGENCIES.map(agency => {
          const selected = selectedAgencies.includes(agency.id)
          const isRecommended = recommendedIds.includes(agency.id)
          return (
            <button
              key={agency.id}
              onClick={() => toggleAgency(agency.id)}
              disabled={dispatched}
              className={`p-3 rounded-lg border text-left transition-all ${
                selected
                  ? isRecommended
                    ? 'border-cyan-500 bg-cyan-500/15 ring-1 ring-cyan-500/30'
                    : 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500/30'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
              } ${dispatched ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">{agency.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{agency.name}</span>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selected ? 'border-cyan-500 bg-cyan-500' : 'border-slate-500'
                    }`}>
                      {selected && <span className="text-white text-xs">✓</span>}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{agency.desc}</p>
                  {isRecommended && (
                    <span className="text-xs text-cyan-400 mt-1 inline-block">🤖 AI 推薦</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Signal Adjustment */}
      {signalAdj && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <h3 className="text-sm font-medium text-amber-400 mb-2">🚦 號誌調整建議</h3>
          <p className="text-sm text-amber-300">{signalAdj.action}</p>
          <div className="flex gap-4 mt-2 text-xs text-slate-400">
            <span>持續：{signalAdj.duration}</span>
            {handlingTime && <span>預估處理：{handlingTime}</span>}
          </div>
        </div>
      )}

      {/* 通報訊息預覽 */}
      {selectedAgencies.length > 0 && !dispatched && (
        <div className="mb-4 p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white">📝 通報訊息預覽</h3>
            <span className="text-xs text-slate-400">AI Agent 自動生成 · 可編輯</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedAgencies.map(agencyId => {
              const agency = ALL_AGENCIES.find(a => a.id === agencyId)
              if (!agency) return null
              const agentInfo = agentRecommended.find(a => a.name.includes(agency.name) || agency.name.includes(a.name))
              const eventDesc = incidentResult?.agent_structured?.situation?.description || incidentResult?.event || '交通事件'
              const location = incidentResult?.agent_structured?.situation?.location || '台北市'
              const msg = agentInfo
                ? `【緊急通報】${location}發生${eventDesc}。請貴單位執行：${agentInfo.action}。預估處理時間：${handlingTime || 'N/A'}。`
                : `【緊急通報】${location}發生${eventDesc}。請貴單位依權責協助處理。`
              return (
                <div key={agencyId} className="bg-slate-800 rounded p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{agency.icon}</span>
                    <span className="text-xs text-white font-medium">{agency.name}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{msg}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dispatch Button */}
      {!dispatched ? (
        <button
          onClick={handleDispatch}
          disabled={selectedAgencies.length === 0 || dispatching}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold text-lg rounded-lg transition-all shadow-lg shadow-indigo-500/20"
        >
          {dispatching
            ? '⏳ 正在通報各單位...'
            : `🚀 確認通報（${selectedAgencies.length} 個單位）`}
        </button>
      ) : (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
          <p className="text-lg text-green-400 font-medium">✅ 已成功通報 {selectedAgencies.length} 個單位</p>
          <p className="text-sm text-slate-400 mt-1">各單位已收到通知並啟動應變程序</p>
        </div>
      )}
    </div>
  )
}

export default NotificationDispatch
