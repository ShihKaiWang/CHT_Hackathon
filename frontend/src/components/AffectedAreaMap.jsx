import { useState } from 'react'

const STATUS_CONFIG = {
  closed: { color: 'bg-red-500', border: 'border-red-400', label: '封閉路段', textColor: 'text-red-400' },
  alternative: { color: 'bg-green-500', border: 'border-green-400', label: '替代路線', textColor: 'text-green-400' },
}

function AffectedAreaMap({ incidentResult }) {
  const [hoveredZone, setHoveredZone] = useState(null)

  const s = incidentResult?.agent_structured || {}
  const situation = s.situation || {}
  const alternatives = s.alternatives || incidentResult?.alternative_routes || []
  const classification = s.classification || {}

  const zones = []

  if (situation.location || incidentResult?.event) {
    zones.push({
      id: 'closed-main',
      name: situation.location || incidentResult?.affected_roads?.[0] || '事件路段',
      status: 'closed',
      detail: situation.affected_scope || '全線封閉',
      coords: { x: 50, y: 40 },
    })
  }

  alternatives.forEach((alt, i) => {
    const positions = [{ x: 50, y: 15 }, { x: 50, y: 68 }, { x: 20, y: 40 }, { x: 80, y: 40 }]
    zones.push({
      id: `alt-${i}`,
      name: alt.name || alt.path || `替代路線 ${i + 1}`,
      status: 'alternative',
      detail: `飽和度 ${alt.saturation ? (alt.saturation * 100).toFixed(0) + '%' : 'N/A'}，容量 ${alt.capacity || 'N/A'} vph`,
      coords: positions[i % positions.length],
    })
  })

  if (zones.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <span className="text-3xl block mb-2">🗺️</span>
          <p className="text-sm text-slate-400">注入事件後將顯示受影響範圍</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-2">🗺️ 受影響範圍</h2>
      <p className="text-xs text-slate-400 mb-4">根據 AI Agent 分析結果動態產生</p>

      <div className="relative w-full h-80 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden mb-4">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)', backgroundSize: '25px 25px' }} />

        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="12" y1="40" x2="88" y2="40" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2" />
          <text x="15" y="36" fill="#ef4444" fontSize="3.5" fontWeight="bold">
            {situation.location || '封閉路段'} ✕
          </text>

          {alternatives[0] && (
            <>
              <line x1="12" y1="15" x2="88" y2="15" stroke="#22c55e" strokeWidth="1" />
              <text x="15" y="12" fill="#22c55e" fontSize="3" fontWeight="bold">{alternatives[0].name || '替代 1'} →</text>
            </>
          )}
          {alternatives[1] && (
            <>
              <line x1="12" y1="68" x2="88" y2="68" stroke="#22c55e" strokeWidth="1" />
              <text x="15" y="65" fill="#22c55e" fontSize="3" fontWeight="bold">{alternatives[1].name || '替代 2'} →</text>
            </>
          )}
          {alternatives[2] && (
            <>
              <line x1="20" y1="5" x2="20" y2="95" stroke="#22c55e" strokeWidth="0.8" />
              <text x="22" y="92" fill="#22c55e" fontSize="2.5">{alternatives[2].name || '替代 3'}</text>
            </>
          )}
          {alternatives[3] && (
            <>
              <line x1="80" y1="5" x2="80" y2="95" stroke="#22c55e" strokeWidth="0.8" />
              <text x="64" y="92" fill="#22c55e" fontSize="2.5">{alternatives[3].name || '替代 4'}</text>
            </>
          )}
        </svg>

        {zones.map((zone) => {
          const config = STATUS_CONFIG[zone.status]
          return (
            <div
              key={zone.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${zone.coords.x}%`, top: `${zone.coords.y}%` }}
              onMouseEnter={() => setHoveredZone(zone)}
              onMouseLeave={() => setHoveredZone(null)}
            >
              <div className={`w-12 h-12 rounded-full ${config.color} opacity-15 animate-ping`} style={{ animationDuration: '3s' }} />
              <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${config.color} border-2 border-white shadow-lg`} />
            </div>
          )
        })}

        <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2">
          <span className="text-2xl animate-bounce">⚠️</span>
        </div>

        {hoveredZone && (
          <div className="absolute top-2 right-2 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl z-10">
            <p className="text-sm font-medium text-white">{hoveredZone.name}</p>
            <p className={`text-xs ${STATUS_CONFIG[hoveredZone.status].textColor}`}>{STATUS_CONFIG[hoveredZone.status].label}</p>
            <p className="text-xs text-slate-400 mt-1">{hoveredZone.detail}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
            <span className="text-xs text-slate-300">{config.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-red-400">1</p>
          <p className="text-xs text-slate-400">封閉路段</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-400">{alternatives.length}</p>
          <p className="text-xs text-slate-400">替代路線</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-amber-400">{classification.level || incidentResult?.level || '-'}</p>
          <p className="text-xs text-slate-400">事件級別</p>
        </div>
      </div>
    </div>
  )
}

export default AffectedAreaMap
