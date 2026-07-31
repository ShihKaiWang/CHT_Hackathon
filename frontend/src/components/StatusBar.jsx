import { useState, useEffect } from 'react'
import { useCountUp } from '../hooks/useCountUp'
import { useSimClock } from '../hooks/useSimClock.jsx'
import { fetchTrafficData, fetchAlerts } from '../services/api'

function StatItem({ icon, label, value, suffix = '', color = 'text-white', pulse = false }) {
  const { formattedValue } = useCountUp(value, { duration: 1000, decimals: 0 })
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
  const { currentTime, triggeredEvents, isRunning } = useSimClock()
  const [saturationData, setSaturationData] = useState([])
  const [allAlerts, setAllAlerts] = useState([])
  const [uptime, setUptime] = useState(0)

  // 載入真實資料
  useEffect(() => {
    async function load() {
      try {
        const traffic = await fetchTrafficData()
        setSaturationData(traffic.saturation || [])
        const alerts = await fetchAlerts()
        setAllAlerts(alerts)
      } catch (err) {
        // 靜默失敗
      }
    }
    load()
  }, [])

  // 運行時間
  useEffect(() => {
    const timer = setInterval(() => setUptime((prev) => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // 依模擬時鐘計算即時數據
  const visibleAlerts = allAlerts.filter((a) => a.time <= currentTime)
  const maxSaturation = saturationData.length > 0
    ? Math.round(Math.max(...saturationData.map((d) => d.saturation)) * 100)
    : 0
  const criticalCount = saturationData.filter((d) => d.saturation >= 0.95).length
  const monitoredRoads = saturationData.length
  const activeIncidents = triggeredEvents.length

  // 飽和度依時鐘漸進（事件前用較低值）
  const displaySaturation = currentTime >= '22:00'
    ? maxSaturation
    : currentTime >= '21:00'
    ? Math.min(maxSaturation, 93)
    : currentTime >= '18:00'
    ? Math.min(maxSaturation, 80)
    : 58

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
            <span className={`w-2 h-2 rounded-full animate-pulse ${isRunning ? 'bg-green-400' : 'bg-slate-500'}`}></span>
            <span className={`text-xs font-medium ${isRunning ? 'text-green-400' : 'text-slate-500'}`}>
              {isRunning ? 'LIVE' : 'PAUSED'}
            </span>
          </div>
          <StatItem icon="🚦" label="監測" value={monitoredRoads} suffix=" 路段" />
          <StatItem
            icon="⚠️"
            label="事件"
            value={activeIncidents}
            color={activeIncidents > 0 ? 'text-red-400' : 'text-slate-400'}
            pulse={activeIncidents > 0}
          />
          <StatItem
            icon="📈"
            label="峰值"
            value={displaySaturation}
            suffix="%"
            color={displaySaturation >= 95 ? 'text-red-400' : displaySaturation >= 85 ? 'text-amber-400' : 'text-green-400'}
            pulse={displaySaturation >= 95}
          />
          <StatItem
            icon="🔔"
            label="告警"
            value={visibleAlerts.length}
            color={visibleAlerts.length > 0 ? 'text-amber-400' : 'text-slate-400'}
          />
        </div>

        {/* 右側 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>運行</span>
            <span className="font-mono text-slate-300">{formatUptime(uptime)}</span>
          </div>
          <div className="text-xs font-mono text-slate-500">
            {currentTime}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusBar
