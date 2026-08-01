import { useState } from 'react'
import { callSmartApp } from '../services/api'

// 預設地點選項
const LOCATIONS = [
  '忠孝復興站', '台北101', '台北車站', '市政府站', '大巨蛋',
  '信義商圈', '國父紀念館', '南港展覽館', '松山機場', '公館站',
]

// 目前事件影響
const ACTIVE_INCIDENTS = [
  { type: 'road_closure', road: '忠孝東路四段', impact: '封閉' },
  { type: 'bus_reroute', route: '212、232', impact: '改道仁愛路（+8 分鐘）' },
]

// 天氣狀態（與天氣模組連動概念）
const CURRENT_WEATHER = { condition: 'rain', label: '小雨', icon: '🌦️' }

// 路線方案產生器
function generateRoutes(from, to) {
  // 模擬不同起終點產出不同方案
  const routes = [
    {
      id: 'mrt',
      icon: '🚇',
      type: '捷運',
      label: '捷運板南線',
      description: `${from} → 板南線 → ${to}`,
      steps: [
        { mode: '步行', detail: '走到捷運站', time: 3 },
        { mode: '捷運', detail: '板南線 3 站', time: 12 },
        { mode: '步行', detail: '出站步行到終點', time: 3 },
      ],
      time: 18,
      cost: 25,
      carbon: 20,
      comfort: 4,
      walkDistance: 400,
      affected: false,
      crowdLevel: 'medium',
      frequency: '每 3 分鐘一班',
    },
    {
      id: 'bus_mrt',
      icon: '🚌',
      type: '公車+捷運',
      label: '公車 212 → 轉捷運',
      description: `${from} → 公車 212 → 轉乘捷運 → ${to}`,
      steps: [
        { mode: '步行', detail: '走到公車站', time: 2 },
        { mode: '公車', detail: '212 路（已改道仁愛路）', time: 12 },
        { mode: '轉乘', detail: '轉乘捷運', time: 3 },
        { mode: '捷運', detail: '1 站', time: 3 },
        { mode: '步行', detail: '步行到終點', time: 2 },
      ],
      time: 22,
      cost: 30,
      carbon: 35,
      comfort: 3,
      walkDistance: 200,
      affected: true,
      affectedReason: '公車 212 因忠孝東路封閉改道仁愛路（+8 分鐘）',
      originalTime: 14,
      crowdLevel: 'low',
      frequency: '每 8 分鐘一班',
    },
    {
      id: 'bike_mrt',
      icon: '🚲',
      type: 'YouBike+捷運',
      label: 'YouBike → 捷運',
      description: `${from} → YouBike 騎到捷運站 → ${to}`,
      steps: [
        { mode: 'YouBike', detail: '騎行至捷運站', time: 6 },
        { mode: '捷運', detail: '板南線 2 站', time: 7 },
        { mode: '步行', detail: '步行到終點', time: 2 },
      ],
      time: 15,
      cost: 15,
      carbon: 5,
      comfort: 3,
      walkDistance: 100,
      bikeDistance: 1200,
      affected: false,
      weatherWarning: CURRENT_WEATHER.condition === 'rain',
      weatherNote: '目前下雨，騎車注意安全',
      crowdLevel: 'none',
      frequency: '隨時可借',
      availableBikes: 12,
    },
    {
      id: 'taxi',
      icon: '🚕',
      type: '計程車',
      label: '計程車（繞道）',
      description: `${from} → 計程車繞行仁愛路 → ${to}`,
      steps: [
        { mode: '計程車', detail: '繞行仁愛路（避開忠孝東路封閉）', time: 14 },
      ],
      time: 14,
      cost: 210,
      carbon: 320,
      comfort: 5,
      walkDistance: 0,
      affected: true,
      affectedReason: '需繞行仁愛路（原路線封閉），費用較高',
      originalTime: 8,
      originalCost: 150,
      crowdLevel: 'none',
      frequency: '即時叫車',
    },
    {
      id: 'walk',
      icon: '🚶',
      type: '步行',
      label: '全程步行',
      description: `${from} → 沿仁愛路步行 → ${to}`,
      steps: [
        { mode: '步行', detail: '沿仁愛路騎樓步行（有遮蔽）', time: 25 },
      ],
      time: 25,
      cost: 0,
      carbon: 0,
      comfort: 2,
      walkDistance: 1800,
      affected: false,
      crowdLevel: 'none',
      frequency: '隨時',
      sheltered: true,
    },
  ]

  return routes
}

// 排序選項
const SORT_OPTIONS = [
  { id: 'fastest', label: '最快', icon: '⚡', key: 'time' },
  { id: 'cheapest', label: '最便宜', icon: '💰', key: 'cost' },
  { id: 'greenest', label: '最低碳', icon: '🌱', key: 'carbon' },
  { id: 'comfort', label: '最舒適', icon: '✨', key: 'comfort', reverse: true },
]

const COMFORT_LABELS = ['', '★', '★★', '★★★', '★★★★', '★★★★★']
const CROWD_LABELS = { none: '—', low: '🟢 舒適', medium: '🟡 適中', high: '🔴 擁擠' }

function MaaSPlanner() {
  const [origin, setOrigin] = useState('忠孝復興站')
  const [destination, setDestination] = useState('台北101')
  const [routes, setRoutes] = useState([])
  const [sortBy, setSortBy] = useState('fastest')
  const [searched, setSearched] = useState(false)
  const [expandedRoute, setExpandedRoute] = useState(null)
  const [agentResult, setAgentResult] = useState(null)
  const [agentLoading, setAgentLoading] = useState(false)

  function handleSearch() {
    if (!origin || !destination) return
    const results = generateRoutes(origin, destination)
    setRoutes(results)
    setSearched(true)
    setExpandedRoute(null)
    // Call AI Agent for route planning
    callAgent(origin, destination)
  }

  async function callAgent(from, to) {
    setAgentLoading(true)
    setAgentResult(null)
    try {
      const res = await callSmartApp('maas_plan', { from, to })
      if (res && Object.keys(res).length > 0) {
        setAgentResult(res)
      }
    } catch (err) {
      console.error('AI Agent maas_plan error:', err)
    } finally {
      setAgentLoading(false)
    }
  }

  function getSortedRoutes() {
    const option = SORT_OPTIONS.find((o) => o.id === sortBy)
    if (!option) return routes
    return [...routes].sort((a, b) => {
      if (option.reverse) return b[option.key] - a[option.key]
      return a[option.key] - b[option.key]
    })
  }

  const sorted = getSortedRoutes()
  const bestRoute = sorted[0]

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="card-glass rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-2">🚌 MaaS 智慧出行規劃</h2>
        <p className="text-sm text-slate-400">
          整合捷運、公車、YouBike、計程車，考慮即時事件影響，提供最佳路線方案
        </p>

        {/* 事件影響提示 */}
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-400 font-medium mb-1">⚠️ 目前事件影響：</p>
          {ACTIVE_INCIDENTS.map((inc, i) => (
            <p key={i} className="text-xs text-slate-300">
              • {inc.road || inc.route}：{inc.impact}
            </p>
          ))}
        </div>
      </div>

      {/* 起終點輸入 */}
      <div className="card-glass rounded-lg p-6">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 items-end">
          <div className="lg:col-span-3">
            <label className="block text-xs text-slate-400 mb-1">📍 起點</label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-center items-center">
            <span className="text-slate-500 text-xl">→</span>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs text-slate-400 mb-1">📍 終點</label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {LOCATIONS.filter((l) => l !== origin).map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all"
        >
          🔍 搜尋最佳方案
        </button>
      </div>

      {/* 搜尋結果 */}
      {searched && (
        <>
          {/* AI Agent 分析 */}
          {agentLoading && (
            <div className="card-glass rounded-lg p-4 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-cyan-500"></div>
              <span className="text-sm text-cyan-400">AI Agent 路線規劃分析中...</span>
            </div>
          )}
          {agentResult && (
            <div className="mt-4 card-glass rounded-lg p-4 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">🤖</span>
                <span className="text-sm text-cyan-400 font-medium">AI Agent 分析</span>
                {agentResult.iterations && <span className="text-xs text-slate-500">{agentResult.iterations} 輪推理</span>}
              </div>
              {agentResult.routes && (
                <div className="space-y-2">
                  {agentResult.routes.map((r, i) => (
                    <div key={i} className="bg-slate-700/30 rounded p-2 text-xs text-slate-300">
                      <span className="text-white font-medium">{r.mode || r.label}</span>
                      {r.time && <span className="ml-2 text-cyan-400">{r.time}分</span>}
                      {r.description && <p className="text-slate-400 mt-1">{r.description}</p>}
                    </div>
                  ))}
                </div>
              )}
              {agentResult.recommendation && (
                <p className="text-xs text-green-400 mt-2">💡 {agentResult.recommendation}</p>
              )}
              {agentResult.summary && (
                <p className="text-xs text-slate-300 mt-2">{agentResult.summary}</p>
              )}
              {agentResult.tool_calls?.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">推理過程：</p>
                  {agentResult.tool_calls.map((tc, i) => (
                    <div key={i} className="text-xs text-slate-400">→ <span className="text-cyan-300">{tc.tool}</span></div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* 排序選項 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">排序：</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  sortBy === opt.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
            {CURRENT_WEATHER.condition === 'rain' && (
              <span className="ml-auto text-xs text-amber-400 flex items-center gap-1">
                {CURRENT_WEATHER.icon} {CURRENT_WEATHER.label}
              </span>
            )}
          </div>

          {/* 路線卡片 */}
          <div className="space-y-3">
            {sorted.map((route, index) => {
              const isExpanded = expandedRoute === route.id
              const isBest = route.id === bestRoute?.id

              return (
                <div
                  key={route.id}
                  onClick={() => setExpandedRoute(isExpanded ? null : route.id)}
                  className={`card-glass rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.01] ${
                    route.affected ? 'border-amber-500/30' : ''
                  } ${isBest ? 'ring-2 ring-blue-500/40' : ''}`}
                >
                  {/* 主要資訊 */}
                  <div className="flex items-center gap-4">
                    {/* 排名 + Icon */}
                    <div className="flex flex-col items-center w-12">
                      {index === 0 && <span className="text-xs text-blue-400 font-bold mb-0.5">推薦</span>}
                      <span className="text-3xl">{route.icon}</span>
                    </div>

                    {/* 路線資訊 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-white">{route.label}</h3>
                        {route.affected && (
                          <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                            受事件影響
                          </span>
                        )}
                        {route.weatherWarning && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                            🌧️ 注意天氣
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{route.description}</p>
                    </div>

                    {/* 核心指標 */}
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className={`text-lg font-bold ${route.affected ? 'text-amber-400' : 'text-white'}`}>
                          {route.time}<span className="text-xs font-normal text-slate-400">分</span>
                        </p>
                        {route.affected && route.originalTime && (
                          <p className="text-xs text-slate-500 line-through">{route.originalTime}分</p>
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">
                          ${route.cost}
                        </p>
                        {route.affected && route.originalCost && (
                          <p className="text-xs text-slate-500 line-through">${route.originalCost}</p>
                        )}
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${
                          route.carbon === 0 ? 'text-green-400' :
                          route.carbon < 30 ? 'text-green-400' :
                          route.carbon < 100 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {route.carbon}<span className="text-xs font-normal text-slate-400">g</span>
                        </p>
                        <p className="text-xs text-slate-500">CO₂</p>
                      </div>
                      <div>
                        <p className="text-sm text-amber-400">{COMFORT_LABELS[route.comfort]}</p>
                      </div>
                    </div>
                  </div>

                  {/* 展開詳情 */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                      {/* 步驟 */}
                      <div>
                        <p className="text-xs text-slate-400 mb-2">路線步驟：</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {route.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                step.mode === '步行' ? 'bg-slate-600 text-slate-300' :
                                step.mode === '捷運' ? 'bg-blue-500/20 text-blue-400' :
                                step.mode === '公車' ? 'bg-green-500/20 text-green-400' :
                                step.mode === 'YouBike' ? 'bg-amber-500/20 text-amber-400' :
                                step.mode === '計程車' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-slate-600 text-slate-300'
                              }`}>
                                {step.detail} ({step.time}分)
                              </span>
                              {i < route.steps.length - 1 && <span className="text-slate-600">→</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 附加資訊 */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-700/50 rounded p-2">
                          <span className="text-slate-400">步行距離：</span>
                          <span className="text-white">{route.walkDistance}m</span>
                        </div>
                        <div className="bg-slate-700/50 rounded p-2">
                          <span className="text-slate-400">擁擠度：</span>
                          <span className="text-white">{CROWD_LABELS[route.crowdLevel]}</span>
                        </div>
                        <div className="bg-slate-700/50 rounded p-2">
                          <span className="text-slate-400">班次：</span>
                          <span className="text-white">{route.frequency}</span>
                        </div>
                        {route.availableBikes !== undefined && (
                          <div className="bg-slate-700/50 rounded p-2">
                            <span className="text-slate-400">可借車輛：</span>
                            <span className="text-green-400">{route.availableBikes} 輛</span>
                          </div>
                        )}
                        {route.sheltered && (
                          <div className="bg-slate-700/50 rounded p-2">
                            <span className="text-slate-400">遮蔽：</span>
                            <span className="text-green-400">✓ 有騎樓</span>
                          </div>
                        )}
                      </div>

                      {/* 影響說明 */}
                      {route.affectedReason && (
                        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <p className="text-xs text-amber-300">⚠️ {route.affectedReason}</p>
                        </div>
                      )}
                      {route.weatherWarning && (
                        <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-xs text-blue-300">🌧️ {route.weatherNote}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 碳排比較摘要 */}
          <div className="card-glass rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-3">🌱 碳排比較</h3>
            <div className="flex items-end gap-2 h-24">
              {sorted.map((route) => {
                const maxCarbon = Math.max(...sorted.map((r) => r.carbon), 1)
                const height = route.carbon === 0 ? 5 : (route.carbon / maxCarbon) * 100
                return (
                  <div key={route.id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-slate-400">{route.carbon}g</span>
                    <div
                      className={`w-full rounded-t transition-all duration-700 ${
                        route.carbon === 0 ? 'bg-green-500' :
                        route.carbon < 30 ? 'bg-green-400' :
                        route.carbon < 100 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    ></div>
                    <span className="text-xs text-slate-500 truncate w-full text-center">{route.icon}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-slate-500 text-center mt-2">
              選擇 {sorted.find((r) => r.carbon === Math.min(...sorted.map((x) => x.carbon)))?.label} 最環保
              {sorted[0]?.carbon === 0 && '（零碳排 🌿）'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default MaaSPlanner
