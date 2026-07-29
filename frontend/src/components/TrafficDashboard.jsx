import { useState, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts'
import { fetchTrafficData } from '../services/api'
import { useCountUp } from '../hooks/useCountUp'

const SATURATION_COLORS = {
  critical: '#ef4444',
  warning: '#f59e0b',
  normal: '#22c55e',
}

const THRESHOLD = 0.85

function AnimatedNumber({ value, suffix = '', decimals = 0, className = '' }) {
  const { formattedValue } = useCountUp(value, { duration: 1200, decimals })
  return <span className={className}>{formattedValue}{suffix}</span>
}

const ROAD_COLORS = {
  '路段A_忠孝東路': '#3b82f6',
  '路段B_中山北路': '#8b5cf6',
  '路段C_信義路': '#06b6d4',
  '路段D_民權東路': '#f59e0b',
  '路段E_復興南路': '#10b981',
}

const ROAD_LABELS = {
  '路段A_忠孝東路': '忠孝東路',
  '路段B_中山北路': '中山北路',
  '路段C_信義路': '信義路',
  '路段D_民權東路': '民權東路',
  '路段E_復興南路': '復興南路',
}

const MEDAL = ['🥇', '🥈', '🥉', '4', '5']

function FlowRanking({ data }) {
  if (!data) return null

  // 取出路段車流量並排名
  const roads = Object.entries(data)
    .filter(([key]) => key.startsWith('路段'))
    .map(([key, value]) => ({ key, label: ROAD_LABELS[key] || key, value, color: ROAD_COLORS[key] || '#94a3b8' }))
    .sort((a, b) => b.value - a.value)

  const maxFlow = roads[0]?.value || 1

  return (
    <div className="space-y-2">
      {roads.map((road, i) => (
        <div key={road.key} className="flex items-center gap-2">
          {/* 排名 */}
          <span className="w-6 text-center text-sm">
            {i < 3 ? MEDAL[i] : <span className="text-xs text-slate-500">{i + 1}</span>}
          </span>
          {/* 路段名+數字 */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-white font-medium">{road.label}</span>
              <span className="text-xs font-mono font-bold" style={{ color: road.color }}>
                {road.value.toLocaleString()}
              </span>
            </div>
            {/* 進度條 */}
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${(road.value / maxFlow) * 100}%`,
                  backgroundColor: road.color,
                }}
              ></div>
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500 text-right mt-1">單位：車/時</p>
    </div>
  )
}

function TrafficDashboard() {
  const [flowData, setFlowData] = useState([])
  const [saturationData, setSaturationData] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentHour, setCurrentHour] = useState(0)
  const [liveMode, setLiveMode] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  // 即時模式：每 3 秒推進一個小時的數據
  useEffect(() => {
    if (liveMode && flowData.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentHour((prev) => (prev + 1) % flowData.length)
        // 模擬飽和度微幅變動
        setSaturationData((prev) =>
          prev.map((item) => ({
            ...item,
            saturation: Math.min(1, Math.max(0.3, item.saturation + (Math.random() - 0.48) * 0.03)),
            status:
              item.saturation + (Math.random() - 0.48) * 0.03 > 0.9
                ? 'critical'
                : item.saturation + (Math.random() - 0.48) * 0.03 > 0.85
                ? 'warning'
                : 'normal',
          }))
        )
      }, 3000)
    }
    return () => clearInterval(intervalRef.current)
  }, [liveMode, flowData])

  async function loadData() {
    try {
      const data = await fetchTrafficData()
      setFlowData(data.flow)
      setSaturationData(data.saturation)
    } catch (err) {
      console.error('載入車流資料失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card-glass rounded-lg p-6 animate-pulse">
        <div className="h-64 bg-slate-700 rounded"></div>
      </div>
    )
  }

  // 顯示到 currentHour 為止的資料（模擬即時推進）
  const visibleFlowData = flowData.slice(0, currentHour + 1)
  const criticalCount = saturationData.filter((d) => d.saturation > 0.9).length
  const warningCount = saturationData.filter((d) => d.saturation > 0.85 && d.saturation <= 0.9).length
  const maxSaturation = Math.max(...saturationData.map((d) => d.saturation))

  return (
    <div className="space-y-6">
      {/* 統計卡片列 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-glass rounded-lg p-4">
          <p className="text-xs text-slate-400">監測路段</p>
          <AnimatedNumber value={saturationData.length} className="text-2xl font-bold text-white" />
          <p className="text-xs text-slate-500 mt-1">即時監控中</p>
        </div>
        <div className={`card-glass rounded-lg p-4 ${criticalCount > 0 ? 'glow-red' : ''}`}>
          <p className="text-xs text-slate-400">危險路段</p>
          <AnimatedNumber value={criticalCount} className="text-2xl font-bold text-red-400" />
          <p className="text-xs text-red-400/70 mt-1">飽和度 &gt; 90%</p>
        </div>
        <div className={`card-glass rounded-lg p-4 ${warningCount > 0 ? 'glow-amber' : ''}`}>
          <p className="text-xs text-slate-400">警告路段</p>
          <AnimatedNumber value={warningCount} className="text-2xl font-bold text-amber-400" />
          <p className="text-xs text-amber-400/70 mt-1">飽和度 &gt; 85%</p>
        </div>
        <div className="card-glass rounded-lg p-4">
          <p className="text-xs text-slate-400">最高飽和度</p>
          <AnimatedNumber value={maxSaturation * 100} suffix="%" decimals={0} className="text-2xl font-bold text-white" />
          <p className="text-xs text-slate-500 mt-1">即時峰值</p>
        </div>
      </div>

      {/* 車流時序圖 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">📊 車流量時序監測</h2>
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
            <span className="text-xs text-slate-500">
              {flowData[currentHour]?.time || '--:--'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 折線圖（佔 2/3） */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={visibleFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Line type="monotone" dataKey="路段A_忠孝東路" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={500} />
                <Line type="monotone" dataKey="路段B_中山北路" stroke="#8b5cf6" strokeWidth={2} dot={false} animationDuration={500} />
                <Line type="monotone" dataKey="路段C_信義路" stroke="#06b6d4" strokeWidth={2} dot={false} animationDuration={500} />
                <Line type="monotone" dataKey="路段D_民權東路" stroke="#f59e0b" strokeWidth={1.5} dot={false} animationDuration={500} />
                <Line type="monotone" dataKey="路段E_復興南路" stroke="#10b981" strokeWidth={1.5} dot={false} animationDuration={500} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 即時車流排名（佔 1/3） */}
          <div className="flex flex-col justify-center">
            <h3 className="text-sm font-medium text-slate-300 mb-3">🏆 即時車流 TOP 5</h3>
            <FlowRanking data={flowData[currentHour]} />
          </div>
        </div>
      </div>

      {/* 飽和度狀態 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">🚦 路段飽和度</h2>
          {criticalCount > 0 && (
            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg animate-pulse">
              {criticalCount} 路段超標
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={saturationData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" domain={[0, 1]} stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={100} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              formatter={(value) => [`${(value * 100).toFixed(1)}%`, '飽和度']}
            />
            <ReferenceLine x={THRESHOLD} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '閾值 85%', fill: '#f59e0b', fontSize: 10 }} />
            <Bar dataKey="saturation" radius={[0, 4, 4, 0]} animationDuration={800}>
              {saturationData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={SATURATION_COLORS[entry.status]}
                  className={entry.status === 'critical' ? 'animate-pulse' : ''}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* 圖例 */}
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 shadow-lg shadow-red-500/50"></span> 危險 (&gt;90%)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 shadow-lg shadow-amber-500/50"></span> 警告 (&gt;85%)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> 正常</span>
        </div>
      </div>
    </div>
  )
}

export default TrafficDashboard
