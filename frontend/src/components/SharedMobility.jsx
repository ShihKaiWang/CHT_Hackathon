import { useState, useEffect, useRef } from 'react'
import { useCountUp } from '../hooks/useCountUp'

// YouBike 站點資料
const YOUBIKE_STATIONS = [
  { id: 'YB01', name: '忠孝復興站', lat: 25.0415, lng: 121.5437, bikes: 18, slots: 30, demand: 'normal' },
  { id: 'YB02', name: '國父紀念館站', lat: 25.0400, lng: 121.5570, bikes: 5, slots: 25, demand: 'high' },
  { id: 'YB03', name: '市政府站', lat: 25.0408, lng: 121.5630, bikes: 22, slots: 35, demand: 'low' },
  { id: 'YB04', name: '大巨蛋', lat: 25.0428, lng: 121.5525, bikes: 3, slots: 40, demand: 'critical' },
  { id: 'YB05', name: '光復南路口', lat: 25.0395, lng: 121.5511, bikes: 8, slots: 20, demand: 'high' },
  { id: 'YB06', name: '仁愛圓環', lat: 25.0370, lng: 121.5490, bikes: 25, slots: 30, demand: 'low' },
  { id: 'YB07', name: '信義路五段', lat: 25.0330, lng: 121.5650, bikes: 14, slots: 25, demand: 'normal' },
  { id: 'YB08', name: '台北101', lat: 25.0336, lng: 121.5632, bikes: 2, slots: 35, demand: 'critical' },
]

// 共享機車資料
const SHARED_SCOOTERS = [
  { id: 'GS01', brand: 'GoShare', area: '忠孝東路周邊', available: 12, battery_low: 3 },
  { id: 'GS02', brand: 'GoShare', area: '信義計畫區', available: 25, battery_low: 5 },
  { id: 'IR01', brand: 'iRent', area: '大安區', available: 8, battery_low: 2 },
  { id: 'IR02', brand: 'iRent', area: '松山區', available: 15, battery_low: 1 },
]

// AI 調度建議
const DISPATCH_SUGGESTIONS = [
  {
    id: 'D01',
    priority: 'urgent',
    type: 'YouBike',
    action: '調入',
    from: '仁愛圓環（餘 25 輛）',
    to: '大巨蛋站（僅剩 3 輛）',
    quantity: 15,
    reason: '事件導致捷運轉乘需求激增，預測 10 分鐘內需求 +200%',
    eta: '8 分鐘',
  },
  {
    id: 'D02',
    priority: 'urgent',
    type: 'YouBike',
    action: '調入',
    from: '市政府站（餘 22 輛）',
    to: '國父紀念館站（僅剩 5 輛）',
    quantity: 10,
    reason: '忠孝東路封閉，民眾改以 YouBike 繞行',
    eta: '5 分鐘',
  },
  {
    id: 'D03',
    priority: 'high',
    type: 'YouBike',
    action: '調入',
    from: '市政府站（餘 22 輛）',
    to: '台北101站（僅剩 2 輛）',
    quantity: 12,
    reason: '信義商圈漫遊旅客需求，預測 15 分鐘內清空',
    eta: '10 分鐘',
  },
  {
    id: 'D04',
    priority: 'medium',
    type: 'GoShare',
    action: '充電回收',
    from: '忠孝東路周邊',
    to: '充電站',
    quantity: 3,
    reason: '3 輛電量低於 15%，避免使用者租到沒電車',
    eta: '15 分鐘',
  },
]

// 需求預測對比
const DEMAND_FORECAST = [
  { time: '現在', normal: 40, incident: 40 },
  { time: '+5分', normal: 42, incident: 65 },
  { time: '+10分', normal: 45, incident: 95 },
  { time: '+15分', normal: 43, incident: 120 },
  { time: '+20分', normal: 40, incident: 100 },
  { time: '+30分', normal: 38, incident: 70 },
]

const DEMAND_COLORS = {
  critical: { bg: 'bg-red-500', text: 'text-red-400', label: '即將無車', border: 'border-red-500/30' },
  high: { bg: 'bg-amber-500', text: 'text-amber-400', label: '需求偏高', border: 'border-amber-500/30' },
  normal: { bg: 'bg-green-500', text: 'text-green-400', label: '供需平衡', border: 'border-green-500/30' },
  low: { bg: 'bg-blue-500', text: 'text-blue-400', label: '車輛充足', border: 'border-blue-500/30' },
}

function AnimatedStat({ value, suffix = '', className = '' }) {
  const { formattedValue } = useCountUp(value, { duration: 800 })
  return <span className={className}>{formattedValue}{suffix}</span>
}

function SharedMobility() {
  const [stations, setStations] = useState(YOUBIKE_STATIONS)
  const [liveMode, setLiveMode] = useState(true)
  const [dispatchAccepted, setDispatchAccepted] = useState(new Set())
  const intervalRef = useRef(null)

  // 模擬即時資料變動
  useEffect(() => {
    if (!liveMode) return
    intervalRef.current = setInterval(() => {
      setStations((prev) =>
        prev.map((s) => {
          const change = Math.floor((Math.random() - 0.6) * 3) // 偏向減少（事件中需求高）
          const newBikes = Math.max(0, Math.min(s.slots, s.bikes + change))
          let demand = 'normal'
          const ratio = newBikes / s.slots
          if (ratio < 0.1) demand = 'critical'
          else if (ratio < 0.3) demand = 'high'
          else if (ratio > 0.7) demand = 'low'
          return { ...s, bikes: newBikes, demand }
        })
      )
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [liveMode])

  function handleAcceptDispatch(id) {
    setDispatchAccepted((prev) => new Set([...prev, id]))
  }

  const totalBikes = stations.reduce((sum, s) => sum + s.bikes, 0)
  const totalSlots = stations.reduce((sum, s) => sum + s.slots, 0)
  const criticalStations = stations.filter((s) => s.demand === 'critical').length
  const totalScooters = SHARED_SCOOTERS.reduce((sum, s) => sum + s.available, 0)
  const batteryLow = SHARED_SCOOTERS.reduce((sum, s) => sum + s.battery_low, 0)

  return (
    <div className="space-y-6">
      {/* 總覽統計 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">🚲 共享運具即時調度</h2>
          <button
            onClick={() => setLiveMode(!liveMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
              liveMode
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-slate-700 text-slate-400 border border-slate-600'
            }`}
          >
            {liveMode && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>}
            {liveMode ? 'LIVE' : '暫停'}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400">YouBike 總車輛</p>
            <AnimatedStat value={totalBikes} className="text-xl font-bold text-white" />
            <p className="text-xs text-slate-500">/ {totalSlots} 車位</p>
          </div>
          <div className={`bg-slate-700/50 rounded-lg p-3 text-center ${criticalStations > 0 ? 'glow-red' : ''}`}>
            <p className="text-xs text-slate-400">緊急站點</p>
            <AnimatedStat value={criticalStations} className="text-xl font-bold text-red-400" />
            <p className="text-xs text-red-400/70">即將無車</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400">共享機車</p>
            <AnimatedStat value={totalScooters} className="text-xl font-bold text-cyan-400" />
            <p className="text-xs text-slate-500">可租用</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400">電量不足</p>
            <AnimatedStat value={batteryLow} className="text-xl font-bold text-amber-400" />
            <p className="text-xs text-amber-400/70">需充電回收</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400">調度建議</p>
            <AnimatedStat value={DISPATCH_SUGGESTIONS.length} className="text-xl font-bold text-blue-400" />
            <p className="text-xs text-blue-400/70">待執行</p>
          </div>
        </div>
      </div>

      {/* YouBike 站點狀態 */}
      <div className="card-glass rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🚲 YouBike 站點即時狀態</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {stations.map((station) => {
            const style = DEMAND_COLORS[station.demand]
            const ratio = station.bikes / station.slots

            return (
              <div key={station.id} className={`p-3 rounded-lg border bg-slate-700/20 ${style.border} ${
                station.demand === 'critical' ? 'animate-pulse' : ''
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.bg}`}></span>
                    <span className="text-sm font-medium text-white">{station.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg}/20 ${style.text}`}>
                    {style.label}
                  </span>
                </div>

                {/* 車輛 / 空位 */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>🚲 {station.bikes} 輛可借</span>
                      <span>🅿️ {station.slots - station.bikes} 空位</span>
                    </div>
                    <div className="w-full h-3 bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          ratio < 0.1 ? 'bg-red-500' :
                          ratio < 0.3 ? 'bg-amber-500' :
                          ratio > 0.8 ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${ratio * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-lg font-bold font-mono text-white w-8 text-right">
                    {station.bikes}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 共享機車狀態 */}
      <div className="card-glass rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🛵 共享機車分布</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {SHARED_SCOOTERS.map((scooter) => (
            <div key={scooter.id} className="bg-slate-700/30 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{scooter.brand}</span>
                  <span className="text-xs text-slate-400">· {scooter.area}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-green-400 text-sm">🛵</span>
                  <span className="text-sm text-white font-bold">{scooter.available}</span>
                  <span className="text-xs text-slate-400">可租</span>
                </div>
                {scooter.battery_low > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400 text-sm">🔋</span>
                    <span className="text-sm text-amber-400 font-bold">{scooter.battery_low}</span>
                    <span className="text-xs text-slate-400">電量低</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 需求預測對比 */}
      <div className="card-glass rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-2">📈 事件前後需求預測對比</h3>
        <p className="text-xs text-slate-400 mb-4">大巨蛋站 + 國父紀念館站 合計 YouBike 需求（輛次/10分鐘）</p>

        <div className="space-y-2">
          {DEMAND_FORECAST.map((point, i) => {
            const maxVal = Math.max(...DEMAND_FORECAST.map((p) => Math.max(p.normal, p.incident)))
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-12 text-right">{point.time}</span>
                <div className="flex-1 space-y-1">
                  {/* 正常需求 */}
                  <div className="flex items-center gap-2">
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500/50 rounded-full"
                        style={{ width: `${(point.normal / maxVal) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-blue-400 w-8">{point.normal}</span>
                  </div>
                  {/* 事件需求 */}
                  <div className="flex items-center gap-2">
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          point.incident > 90 ? 'bg-red-500' : point.incident > 60 ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(point.incident / maxVal) * 100}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs w-8 ${point.incident > 90 ? 'text-red-400' : 'text-amber-400'}`}>
                      {point.incident}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500/50 rounded"></span> 正常日需求</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-amber-500 rounded"></span> 事件後需求（預測）</span>
        </div>
      </div>

      {/* AI 調度建議 */}
      <div className="card-glass rounded-lg p-6 border-gradient">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">🤖 AI 調度建議</h3>
          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg">
            即時計算
          </span>
        </div>

        <div className="space-y-3">
          {DISPATCH_SUGGESTIONS.map((suggestion) => {
            const isAccepted = dispatchAccepted.has(suggestion.id)
            return (
              <div
                key={suggestion.id}
                className={`p-4 rounded-lg border transition-all ${
                  isAccepted
                    ? 'border-green-500/30 bg-green-500/5'
                    : suggestion.priority === 'urgent'
                    ? 'border-red-500/30 bg-red-500/5 animate-pulse'
                    : suggestion.priority === 'high'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-slate-700 bg-slate-700/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isAccepted ? 'bg-green-500/20 text-green-400' :
                        suggestion.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                        suggestion.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {isAccepted ? '✓ 已派遣' : suggestion.priority === 'urgent' ? '🚨 緊急' : suggestion.priority === 'high' ? '⚠️ 優先' : 'ℹ️ 建議'}
                      </span>
                      <span className="text-xs text-slate-400">{suggestion.type}</span>
                    </div>

                    <p className="text-sm text-white font-medium">
                      {suggestion.action} {suggestion.quantity} 輛：{suggestion.from} → {suggestion.to}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{suggestion.reason}</p>

                    <div className="flex gap-3 mt-2 text-xs text-slate-500">
                      <span>⏱️ 預計 {suggestion.eta}</span>
                      <span>🚲 {suggestion.quantity} 輛</span>
                    </div>
                  </div>

                  {!isAccepted && (
                    <button
                      onClick={() => handleAcceptDispatch(suggestion.id)}
                      className={`ml-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        suggestion.priority === 'urgent'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      執行調度
                    </button>
                  )}
                  {isAccepted && (
                    <span className="ml-3 text-green-400 text-sm">✅</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 全部執行 */}
        {dispatchAccepted.size < DISPATCH_SUGGESTIONS.length && (
          <button
            onClick={() => setDispatchAccepted(new Set(DISPATCH_SUGGESTIONS.map((s) => s.id)))}
            className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all"
          >
            🚀 一鍵執行全部調度建議
          </button>
        )}
        {dispatchAccepted.size === DISPATCH_SUGGESTIONS.length && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
            <p className="text-sm text-green-400 font-medium">✅ 全部調度已派遣，預計 15 分鐘內完成重新平衡</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SharedMobility
