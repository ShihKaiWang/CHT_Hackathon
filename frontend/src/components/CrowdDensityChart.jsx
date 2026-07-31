import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useCountUp } from '../hooks/useCountUp'
import { useSimClock } from '../hooks/useSimClock.jsx'

function AnimatedStat({ value, suffix = '', className = '' }) {
  const { formattedValue } = useCountUp(value, { duration: 1000 })
  return <span className={className}>{formattedValue}{suffix}</span>
}

const MEDAL = ['🥇', '🥈', '🥉', '4', '5']

function CrowdRanking({ data, stations }) {
  if (!data || !stations) return null

  const ranked = stations
    .map((s) => ({ name: s.name, value: data[s.name] || 0, color: s.color }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

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
              <span className="text-xs text-white font-medium truncate">{station.name}</span>
              <span className="text-xs font-mono font-bold" style={{ color: station.color }}>
                {station.value.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(station.value / maxVal) * 100}%`, backgroundColor: station.color }}
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
  const [crowdData, setCrowdData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { currentTime, currentIndex } = useSimClock()

  useEffect(() => {
    fetchCrowdData()
  }, [])

  async function fetchCrowdData() {
    try {
      const res = await fetch('/api/dashboard/crowd-density')
      const data = await res.json()
      setCrowdData(data)
    } catch (err) {
      console.error('載入人流資料失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !crowdData) {
    return (
      <div className="card-glass rounded-lg p-6 animate-pulse">
        <div className="h-48 bg-slate-700 rounded"></div>
      </div>
    )
  }

  const { flow, roaming, stations } = crowdData

  // 依模擬時鐘決定顯示到哪
  const visibleFlow = flow.filter((f) => f.time <= currentTime)
  const currentData = visibleFlow[visibleFlow.length - 1] || {}

  // 計算統計
  const totalUsers = stations.reduce((sum, s) => sum + (currentData[s.name] || 0), 0)

  // 漫遊率：取當前時間點最大值
  const currentRoaming = roaming.filter((r) => r.time <= currentTime)
  const latestRoaming = currentRoaming[currentRoaming.length - 1] || {}
  const roamingValues = stations.map((s) => latestRoaming[s.name] || 0).filter((v) => v > 0)
  const maxRoaming = roamingValues.length > 0 ? Math.max(...roamingValues) : 0
  const roamingTriggered = maxRoaming >= 0.30

  return (
    <div className="space-y-4">
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-glass rounded-lg p-3">
          <p className="text-xs text-slate-400">監測站點</p>
          <AnimatedStat value={stations.length} className="text-xl font-bold text-white" />
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
          <span className="text-xl font-bold text-white font-mono">{currentTime}</span>
          <p className="text-xs text-slate-500">模擬時鐘</p>
        </div>
      </div>

      {/* 人流時序面積圖 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">👥 基地台人流信令密度</h2>
          <span className="text-xs text-slate-500 font-mono">{currentTime}</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={visibleFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value) => [value?.toLocaleString() || '0', '用戶數']}
                />
                <Legend />
                {stations.map((s) => (
                  <Area
                    key={s.id}
                    type="monotone"
                    dataKey={s.name}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    animationDuration={500}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 即時人流排名 */}
          <div className="flex flex-col justify-center">
            <h3 className="text-sm font-medium text-slate-300 mb-3">🏆 即時人流 TOP 5</h3>
            <CrowdRanking data={currentData} stations={stations} />
          </div>
        </div>
      </div>

      {/* 漫遊率監測 */}
      <div className="card-glass rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">📡 漫遊率即時監測</h2>
        <div className="space-y-3">
          {stations.filter((s) => (latestRoaming[s.name] || 0) > 0).slice(0, 4).map((station) => {
            const rate = latestRoaming[station.name] || 0
            const triggered = rate >= 0.3
            return (
              <div key={station.name} className={`p-3 rounded-lg border ${
                triggered ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700 bg-slate-700/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">{station.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold font-mono ${triggered ? 'text-amber-400' : 'text-green-400'}`}>
                      {(rate * 100).toFixed(0)}%
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
                    className={`h-full rounded-full transition-all duration-500 ${triggered ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(rate * 100 * 2, 100)}%` }}
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
              ⚠️ SOP 第 6 條已觸發：漫遊率 {(maxRoaming * 100).toFixed(0)}% ≥ 30%，系統自動產出多語告警
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CrowdDensityChart
