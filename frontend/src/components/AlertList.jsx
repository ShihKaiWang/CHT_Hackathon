import { useState, useEffect, useRef } from 'react'
import { fetchAlerts, connectWebSocket } from '../services/api'

const LEVEL_STYLES = {
  critical: 'border-red-500 bg-red-500/10 glow-red',
  warning: 'border-amber-500 bg-amber-500/10',
  info: 'border-blue-500 bg-blue-500/10',
}

const LEVEL_BADGE = {
  critical: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-black',
  info: 'bg-blue-500 text-white',
}

const LEVEL_ICON = {
  critical: '🚨',
  warning: '⚠️',
  info: 'ℹ️',
}

function AlertList() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [newAlertIds, setNewAlertIds] = useState(new Set())
  const listRef = useRef(null)

  useEffect(() => {
    loadAlerts()
    const ws = connectWebSocket((newAlert) => {
      setAlerts((prev) => [newAlert, ...prev].slice(0, 20))
      // 標記為新告警（觸發滑入動畫）
      setNewAlertIds((prev) => new Set([...prev, newAlert.id]))
      // 3 秒後移除「新」標記
      setTimeout(() => {
        setNewAlertIds((prev) => {
          const next = new Set(prev)
          next.delete(newAlert.id)
          return next
        })
      }, 3000)
    })
    return () => ws.close()
  }, [])

  async function loadAlerts() {
    try {
      const data = await fetchAlerts()
      setAlerts(data)
    } catch (err) {
      console.error('載入告警失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card-glass rounded-lg p-6 animate-pulse">
        <div className="h-48 bg-slate-700 rounded"></div>
      </div>
    )
  }

  const criticalCount = alerts.filter((a) => a.level === 'critical').length

  return (
    <div className="card-glass rounded-lg p-6 scan-line">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">🔔 即時告警</h2>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded-full text-xs text-red-400 animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
              {criticalCount} 危險
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            共 {alerts.length} 則
          </span>
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        </div>
      </div>

      <div ref={listRef} className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {alerts.map((alert, index) => {
          const isNew = newAlertIds.has(alert.id)
          return (
            <div
              key={alert.id}
              className={`border-l-4 rounded-r-lg p-3 transition-all duration-300 ${LEVEL_STYLES[alert.level]} ${
                isNew ? 'alert-enter' : ''
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{LEVEL_ICON[alert.level]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${LEVEL_BADGE[alert.level]}`}>
                    {alert.level === 'critical' ? '危險' : alert.level === 'warning' ? '警告' : '資訊'}
                  </span>
                  {isNew && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-500/30 text-blue-300 rounded animate-pulse">
                      NEW
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">{alert.time}</span>
              </div>
              <p className="text-sm text-slate-200 mt-1">{alert.message}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-400">📍 {alert.road}</p>
                {alert.level === 'critical' && (
                  <span className="text-xs text-red-400 animate-pulse">● 需立即處理</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 底部統計 */}
      <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <span className="text-red-400">🚨 {alerts.filter((a) => a.level === 'critical').length}</span>
          <span className="text-amber-400">⚠️ {alerts.filter((a) => a.level === 'warning').length}</span>
          <span className="text-blue-400">ℹ️ {alerts.filter((a) => a.level === 'info').length}</span>
        </div>
        <span className="text-xs text-slate-500">每 10 秒自動更新</span>
      </div>
    </div>
  )
}

export default AlertList
