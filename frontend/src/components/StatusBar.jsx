import { useState, useEffect } from 'react'
import { useCountUp } from '../hooks/useCountUp'

function StatItem({ icon, label, value, suffix = '', color = 'text-white', pulse = false }) {
  const { formattedValue } = useCountUp(value, { duration: 1000, decimals: suffix === '%' ? 0 : 0 })
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="text-sm">{icon}</span>
      <span className="text-xs text-slate-400 hidden sm:inline">{label}</span>
      <span className={`text-sm font-bold font-mono ${color} ${pulse ? 'animate-pulse' : ''}`}>
        {formattedValue}{suffix}
      </span>
    </div>
  )
}

function StatusBar() {
  const [stats, setStats] = useState({
    activeIncidents: 2,
    maxSaturation: 92,
    monitoredRoads: 15,
    roamingRate: 35,
    alertCount: 5,
    uptime: 0,
  })

  // 模擬 uptime 每秒 +1
  useEffect(() => {
    const timer = setInterval(() => {
      setStats((prev) => ({ ...prev, uptime: prev.uptime + 1 }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 模擬數據微幅變動（每 8 秒）
  useEffect(() => {
    const timer = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        maxSaturation: Math.min(99, Math.max(80, prev.maxSaturation + Math.floor((Math.random() - 0.4) * 3))),
        roamingRate: Math.min(50, Math.max(25, prev.roamingRate + Math.floor((Math.random() - 0.5) * 2))),
      }))
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  function formatUptime(sec) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 px-4">
      <div className="flex items-center justify-between h-8 overflow-hidden">
        {/* 左側狀態 */}
        <div className="flex items-center divide-x divide-slate-700">
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-xs text-green-400 font-medium">ONLINE</span>
          </div>
          <StatItem icon="🚦" label="監測" value={stats.monitoredRoads} suffix=" 路段" />
          <StatItem
            icon="⚠️"
            label="事件"
            value={stats.activeIncidents}
            color="text-amber-400"
            pulse={stats.activeIncidents > 0}
          />
          <StatItem
            icon="📈"
            label="峰值"
            value={stats.maxSaturation}
            suffix="%"
            color={stats.maxSaturation > 90 ? 'text-red-400' : 'text-amber-400'}
            pulse={stats.maxSaturation > 90}
          />
          <StatItem
            icon="📡"
            label="漫遊"
            value={stats.roamingRate}
            suffix="%"
            color={stats.roamingRate >= 30 ? 'text-amber-400' : 'text-green-400'}
          />
          <StatItem icon="🔔" label="告警" value={stats.alertCount} color="text-blue-400" />
        </div>

        {/* 右側系統時間 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>運行時間</span>
            <span className="font-mono text-slate-300">{formatUptime(stats.uptime)}</span>
          </div>
          <div className="text-xs font-mono text-slate-500">
            {new Date().toLocaleString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusBar
