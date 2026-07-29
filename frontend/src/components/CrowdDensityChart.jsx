import { useState, useEffect, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useCountUp } from '../hooks/useCountUp'

// 模擬 signaling_crowd_density.csv — 基地台人流信令
const STATIONS = [
  { id: 'BL17', name: '大巨蛋站', color: '#f59e0b' },
  { id: 'BL12', name: '忠孝復興站', color: '#3b82f6' },
  { id: 'BR09', name: '市府轉運站', color: '#8b5cf6' },
  { id: 'R03', name: '信義商圈', color: '#06b6d4' },
  { id: 'G12', name: '台北101站', color: '#10b981' },
]

// 產生模擬時序資料
function generateCrowdData() {
  return Array.from({ length: 24 }, (_, hour) => {
    const base = {
      time: `${String(hour).padStart(2, '0')}:00`,
    }
    STATIONS.forEach((s) => {
      const peak = (hour >= 17 && hour <= 21) ? 1.8 : (hour >= 7 && hour <= 9) ? 1.3 : 1
      const eventBoost = s.id === 'BL17' && hour >= 18 && hour <= 21 ? 15000 : 0
      base[s.name] = Math.floor((8000 + Math.random() * 5000) * peak + eventBoost)
    })
    // 漫遊率（模擬）
    base.roaming_BL17 = hour >= 18 ? 0.3 + Math.random() * 0.1 : 0.12 + Math.random() * 0.08
    base.roaming_R03 = hour >= 14 ? 0.25 + Math.random() * 0.1 : 0.1 + Math.random() * 0.05
    return base
  })
}

function AnimatedStat({ value, suffix = '', className = '' }) {
  const { formattedValue } = useCountUp(value, { duration: 1000 })
  return <span className={className}>{formattedValue}{suffix}</span>
}

const MEDAL = ['🥇', '🥈', '🥉', '4', '5']

const STATION_COLORS = {}
STATIONS.forEach((s) => { STATION_COLORS[s.name] = s.color })

function CrowdRanking({ data }) {
  if (!data) return null

  // 取出站點人流並排名
  const ranked = STATIONS
    .map((s) => ({ name: s.name, value: data[s.name] || 0, color: s.color }))
    .sort((a, b) => b.value - a.value)

  const maxVal = ranked[0]?.value || 1

  return (
    <div className="space-y-2">
      {ranked.map((station, i) => (
        <div key={station.name} className="flex items-center gap-2">
          <span className="w-6 text-center text-sm">
            {i < 3 ? MEDAL[i] : <span className="text-xs text-slate-500">{i + 1}</span>}
          </span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-white font-medium">{station.name}</span>
              <span className="text-xs font-mono font-bold" style={{ color: station.color }}>
                {station.value.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${(station.value / maxVal) * 100}%`,
                  backgroundColor: station.color,
                }}
              ></div>
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500 text-right mt-1">單位：電信用戶數</p>
    </div>
  )
}

function CrowdDensityChart() {
  const [data, setData] = useState([])
  const [currentHour, setCurrentHour] = useState(18) // 預設晚間高峰
  const [liveMode, setLiveMode] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    setData(generateCrowdData())
  }, [])

  // LIVE 模式每 4 秒推進
  useEffect(() => {
    if (liveMode && data.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentHour((prev) => (prev + 1) % data.length)
      }, 4000)
    }
    return () => clearInterval(intervalRef.current)
  }, [liveMode, data])

  if (data.length === 0) return null

  const visibleData = data.slice(0, currentHour + 1)
  const currentData = data[currentHour] || {}
  const totalUsers = STATIONS.reduce((sum, s) => sum + (currentData[s.name] || 0), 0)
  const maxRoaming = Math.max(currentData.roaming_BL17 || 0, currentData.roaming_R03 || 0)
  const roamingTriggered = maxRoaming >= 0.3

  return (
    <div className="space-y-4">
      {/* 信令統計卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-glass rounded-lg p-3">
          <p className="text-xs text-slate-400">監測站點</p>
          <AnimatedStat value={STATIONS.length} className="text-xl font-bold text-white" />
          <p className="text-xs text-slate-500">基地台</p>
        </div>
        <div className="card-glass rounded-lg p-3">
          <p className="text-xs text-slate-400">當前總人流</p>
          <AnimatedStat value={totalUsers} className="text-xl font-bold text-cyan-400" />
          <p className="text-xs text-slate-500">電信用戶</p>
        </div>
        <div className={`card-glass rounded-lg p-3 ${roamingTriggered ? 'glow-amber' : ''}`}>
          <p className="text-xs text-slate-400">最高漫遊率</p>
          <AnimatedStat value={Math.round(maxRoaming * 100)} suffix="%" className={`text-xl font-bold ${roamingTriggered ? 'text-amber-400' : 'text-green-400'}`} />
          <p className={`text-xs ${roamingTriggered ? 'text-amber-400' : 'text-slate-500'}`}>
            {roamingTriggered ? '⚠️ 已觸發多語通報' : '正常範圍'}
          </p>
        </div>
        <div className="card-glass rounded-lg p-3">
          <p className="text-xs text-slate-400">時段</p>
          <span className="text-xl font-bold text-white font-mono">{currentData.time || '--:--'}</span>
          <p className="text-xs text-slate-500">
            {liveMode && <span className="text-green-400">● LIVE</span>}
          </p>
        </div>
      </div>

      {/* 人流時序面積圖 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">👥 基地台人流信令密度</h2>
          <div className="flex items-center gap-3">
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
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={visibleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value) => [value.toLocaleString(), '用戶數']}
                />
                <Legend />
                {STATIONS.map((s) => (
                  <Area
                    key={s.id}
                    type="monotone"
                    dataKey={s.name}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    animationDuration={500}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 即時人流排名 */}
          <div className="flex flex-col justify-center">
            <h3 className="text-sm font-medium text-slate-300 mb-3">🏆 即時人流 TOP 5</h3>
            <CrowdRanking data={currentData} />
          </div>
        </div>
      </div>

      {/* 漫遊率即時監測 */}
      <div className="card-glass rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">📡 漫遊率即時監測</h2>
        <div className="space-y-3">
          {[
            { name: '大巨蛋站 (BL17)', rate: currentData.roaming_BL17 || 0 },
            { name: '信義商圈 (R03)', rate: currentData.roaming_R03 || 0 },
          ].map((station) => {
            const triggered = station.rate >= 0.3
            return (
              <div key={station.name} className={`p-3 rounded-lg border ${
                triggered ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700 bg-slate-700/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">{station.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold font-mono ${triggered ? 'text-amber-400' : 'text-green-400'}`}>
                      {(station.rate * 100).toFixed(1)}%
                    </span>
                    {triggered && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded animate-pulse">
                        ≥30%
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      triggered ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(station.rate * 100 * 2, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-slate-500">
                  <span>0%</span>
                  <span className="text-amber-400">閾值 30%</span>
                  <span>50%</span>
                </div>
              </div>
            )
          })}
        </div>
        {roamingTriggered && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-300 font-medium">
              ⚠️ SOP 第 6 條已觸發：任一站點漫遊率 ≥ 30%，系統自動產出多語告警
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CrowdDensityChart
