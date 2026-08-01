import { useState, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts'
import { fetchTrafficData } from '../services/api'
import { useCountUp } from '../hooks/useCountUp'
import { useSimClock } from '../hooks/useSimClock.jsx'
import { useToast } from './ToastProvider'

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
  '路段A_忠孝東路四段': '#3b82f6',
  '路段B_光復南路': '#8b5cf6',
  '路段C_基隆路一段': '#06b6d4',
  '路段D_敦化南路一段': '#f59e0b',
  '路段E_市民大道四段': '#10b981',
}

const ROAD_LABELS = {
  '路段A_忠孝東路四段': '忠孝東路四段',
  '路段B_光復南路': '光復南路',
  '路段C_基隆路一段': '基隆路一段',
  '路段D_敦化南路一段': '敦化南路一段',
  '路段E_市民大道四段': '市民大道四段',
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
  const { currentTime, currentIndex } = useSimClock()

  useEffect(() => {
    loadData()
  }, [])

  const { addToast } = useToast()

  // Auto alert when saturation >= 85%
  useEffect(() => {
    if (saturationData.length > 0) {
      const criticals = saturationData.filter(d => d.saturation >= 0.95)
      const warnings = saturationData.filter(d => d.saturation >= 0.85 && d.saturation < 0.95)
      if (criticals.length > 0) {
        addToast(`⚠️ ${criticals.length} 路段飽和度超過 95%（A 級癱瘓）— SOP 第 1 條觸發`, 'critical')
      } else if (warnings.length > 0) {
        addToast(`⚡ ${warnings.length} 路段飽和度超過 85%（B 級壅擠）— SOP 第 1 條預警`, 'critical')
      }
    }
  }, [saturationData])

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

  // 依模擬時鐘決定顯示到哪個時間點
  const visibleFlowData = flowData.slice(0, currentIndex + 1)
  const criticalCount = saturationData.filter((d) => d.saturation >= 0.95).length
  const warningCount = saturationData.filter((d) => d.saturation >= 0.85 && d.saturation < 0.95).length
  const maxSaturation = saturationData.length > 0 ? Math.max(...saturationData.map((d) => d.saturation)) : 0

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
          <span className="text-xs text-slate-500 font-mono">{currentTime}</span>
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
                <Line type="monotone" dataKey="路段A_忠孝東路四段" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={500} />
                <Line type="monotone" dataKey="路段B_光復南路" stroke="#8b5cf6" strokeWidth={2} dot={false} animationDuration={500} />
                <Line type="monotone" dataKey="路段C_基隆路一段" stroke="#06b6d4" strokeWidth={2} dot={false} animationDuration={500} />
                <Line type="monotone" dataKey="路段D_敦化南路一段" stroke="#f59e0b" strokeWidth={1.5} dot={false} animationDuration={500} />
                <Line type="monotone" dataKey="路段E_市民大道四段" stroke="#10b981" strokeWidth={1.5} dot={false} animationDuration={500} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 即時車流排名（佔 1/3） */}
          <div className="flex flex-col justify-center">
            <h3 className="text-sm font-medium text-slate-300 mb-3">🏆 即時車流 TOP 5</h3>
            <FlowRanking data={flowData[currentIndex]} />
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
