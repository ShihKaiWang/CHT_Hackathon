import { useState } from 'react'

const ZONES = [
  {
    id: 'zone1',
    name: '忠孝東路四段',
    status: 'closed',
    baseTowers: 3,
    population: 4200,
    coords: { x: 55, y: 35 },
  },
  {
    id: 'zone2',
    name: '忠孝東路五段',
    status: 'affected',
    baseTowers: 2,
    population: 2800,
    coords: { x: 72, y: 32 },
  },
  {
    id: 'zone3',
    name: '大安路一段',
    status: 'affected',
    baseTowers: 2,
    population: 1900,
    coords: { x: 48, y: 50 },
  },
  {
    id: 'zone4',
    name: '仁愛路四段',
    status: 'alternative',
    baseTowers: 2,
    population: 1500,
    coords: { x: 50, y: 62 },
  },
  {
    id: 'zone5',
    name: '市民大道四段',
    status: 'alternative',
    baseTowers: 3,
    population: 2100,
    coords: { x: 55, y: 18 },
  },
]

const STATUS_CONFIG = {
  closed: { color: 'bg-red-500', border: 'border-red-400', label: '封閉路段', textColor: 'text-red-400' },
  affected: { color: 'bg-amber-500', border: 'border-amber-400', label: '受影響區域', textColor: 'text-amber-400' },
  alternative: { color: 'bg-green-500', border: 'border-green-400', label: '替代路線', textColor: 'text-green-400' },
}

function AffectedAreaMap() {
  const [hoveredZone, setHoveredZone] = useState(null)

  const totalPopulation = ZONES.reduce((sum, z) => sum + z.population, 0)
  const totalTowers = ZONES.reduce((sum, z) => sum + z.baseTowers, 0)

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-2">🗺️ 受影響範圍</h2>
      <p className="text-xs text-slate-400 mb-4">基地台覆蓋範圍與通知推播區域</p>

      {/* 模擬地圖區域 */}
      <div className="relative w-full h-64 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden mb-4">
        {/* 格線背景 */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* 路網示意線 */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* 忠孝東路（主要道路 - 封閉） */}
          <line x1="20" y1="35" x2="90" y2="35" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="2,1" />
          <text x="25" y="33" fill="#ef4444" fontSize="2.5">忠孝東路 ✕ 封閉</text>

          {/* 仁愛路（替代路線） */}
          <line x1="20" y1="62" x2="90" y2="62" stroke="#22c55e" strokeWidth="0.6" />
          <text x="25" y="60" fill="#22c55e" fontSize="2.5">仁愛路 → 替代路線</text>

          {/* 市民大道（替代路線） */}
          <line x1="20" y1="18" x2="90" y2="18" stroke="#22c55e" strokeWidth="0.6" />
          <text x="25" y="16" fill="#22c55e" fontSize="2.5">市民大道 → 替代路線</text>

          {/* 復興南路（南北向） */}
          <line x1="45" y1="5" x2="45" y2="95" stroke="#94a3b8" strokeWidth="0.4" />
          {/* 大安路（南北向） */}
          <line x1="60" y1="5" x2="60" y2="95" stroke="#94a3b8" strokeWidth="0.4" />
        </svg>

        {/* 基地台覆蓋範圍圓圈 */}
        {ZONES.map((zone) => {
          const config = STATUS_CONFIG[zone.status]
          return (
            <div
              key={zone.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${zone.coords.x}%`, top: `${zone.coords.y}%` }}
              onMouseEnter={() => setHoveredZone(zone)}
              onMouseLeave={() => setHoveredZone(null)}
            >
              {/* 覆蓋範圍光暈 */}
              <div className={`w-16 h-16 rounded-full ${config.color} opacity-15 animate-ping`}
                style={{ animationDuration: '3s' }}
              />
              <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full ${config.color} opacity-20`} />
              {/* 中心點 */}
              <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${config.color} border-2 border-white shadow-lg`} />
            </div>
          )
        })}

        {/* 事件標記 */}
        <div className="absolute top-[35%] left-[55%] transform -translate-x-1/2 -translate-y-1/2">
          <span className="text-2xl animate-bounce">⚠️</span>
        </div>

        {/* Hover 提示 */}
        {hoveredZone && (
          <div className="absolute top-2 right-2 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl z-10">
            <p className="text-sm font-medium text-white">{hoveredZone.name}</p>
            <p className={`text-xs ${STATUS_CONFIG[hoveredZone.status].textColor}`}>
              {STATUS_CONFIG[hoveredZone.status].label}
            </p>
            <div className="text-xs text-slate-400 mt-1 space-y-0.5">
              <p>📡 基地台：{hoveredZone.baseTowers} 座</p>
              <p>👥 影響人數：~{hoveredZone.population.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* 圖例 */}
      <div className="flex flex-wrap gap-4 mb-4">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
            <span className="text-xs text-slate-300">{config.label}</span>
          </div>
        ))}
      </div>

      {/* 統計摘要 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-white">{totalTowers}</p>
          <p className="text-xs text-slate-400">涵蓋基地台</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-amber-400">~{totalPopulation.toLocaleString()}</p>
          <p className="text-xs text-slate-400">影響人數</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-red-400">1</p>
          <p className="text-xs text-slate-400">封閉路段</p>
        </div>
      </div>
    </div>
  )
}

export default AffectedAreaMap
