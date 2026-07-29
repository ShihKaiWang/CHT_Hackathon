import { useState, useEffect } from 'react'

const CHANNEL_INFO = {
  cbs: { name: 'Cell Broadcast', icon: '📡' },
  sms: { name: 'SMS 簡訊', icon: '💬' },
  signboard: { name: '電子看板', icon: '🖥️' },
  app: { name: 'APP 推播', icon: '📱' },
  navigation: { name: '導航平台', icon: '🗺️' },
  social: { name: '社群廣播', icon: '📢' },
}

function DispatchStatus({ dispatchedChannels = [] }) {
  const [statuses, setStatuses] = useState([])

  useEffect(() => {
    if (dispatchedChannels.length === 0) {
      setStatuses([])
      return
    }

    // 模擬逐步送達的動畫
    const initialStatuses = dispatchedChannels.map((id) => ({
      id,
      ...CHANNEL_INFO[id],
      phase: 'sending', // sending → delivered → read
      sent: 0,
      delivered: 0,
      read: 0,
      total: getChannelTotal(id),
    }))
    setStatuses(initialStatuses)

    // 模擬 phase 1: sending → delivered
    const timer1 = setTimeout(() => {
      setStatuses((prev) =>
        prev.map((s) => ({
          ...s,
          phase: 'delivered',
          sent: s.total,
          delivered: Math.floor(s.total * (0.85 + Math.random() * 0.13)),
        }))
      )
    }, 1500)

    // 模擬 phase 2: delivered → read
    const timer2 = setTimeout(() => {
      setStatuses((prev) =>
        prev.map((s) => ({
          ...s,
          phase: 'read',
          read: Math.floor(s.delivered * (0.4 + Math.random() * 0.35)),
        }))
      )
    }, 3500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [dispatchedChannels])

  function getChannelTotal(id) {
    const totals = {
      cbs: 4200,
      sms: 3100,
      signboard: 12,
      app: 15000,
      navigation: 8500,
      social: 80000,
    }
    return totals[id] || 1000
  }

  function getPhaseColor(phase) {
    switch (phase) {
      case 'sending': return 'text-blue-400'
      case 'delivered': return 'text-amber-400'
      case 'read': return 'text-green-400'
      default: return 'text-slate-400'
    }
  }

  function getPhaseLabel(phase) {
    switch (phase) {
      case 'sending': return '發送中...'
      case 'delivered': return '已送達'
      case 'read': return '已確認'
      default: return '等待中'
    }
  }

  function getProgressPercent(status) {
    if (status.phase === 'sending') return 30
    if (status.phase === 'delivered') return 70
    return 100
  }

  if (statuses.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-2">📊 發送狀態追蹤</h2>
        <div className="flex items-center justify-center h-40 text-slate-500">
          <p className="text-sm">發送通報後將即時顯示各管道送達狀態</p>
        </div>
      </div>
    )
  }

  // 計算總統計
  const totalSent = statuses.reduce((sum, s) => sum + s.sent, 0)
  const totalDelivered = statuses.reduce((sum, s) => sum + s.delivered, 0)
  const totalRead = statuses.reduce((sum, s) => sum + s.read, 0)

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4">📊 發送狀態追蹤</h2>

      {/* 總覽統計 */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-blue-400">{totalSent.toLocaleString()}</p>
          <p className="text-xs text-slate-400">已送出</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{totalDelivered.toLocaleString()}</p>
          <p className="text-xs text-slate-400">已送達</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-green-400">{totalRead.toLocaleString()}</p>
          <p className="text-xs text-slate-400">已確認</p>
        </div>
      </div>

      {/* 各管道狀態 */}
      <div className="space-y-3">
        {statuses.map((status) => (
          <div key={status.id} className="bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span>{status.icon}</span>
                <span className="text-sm font-medium text-white">{status.name}</span>
              </div>
              <span className={`text-xs font-medium ${getPhaseColor(status.phase)}`}>
                {status.phase === 'sending' && (
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-1"></span>
                )}
                {getPhaseLabel(status.phase)}
              </span>
            </div>

            {/* 進度條 */}
            <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  status.phase === 'sending'
                    ? 'bg-blue-500'
                    : status.phase === 'delivered'
                    ? 'bg-amber-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${getProgressPercent(status)}%` }}
              ></div>
            </div>

            {/* 詳細數據 */}
            <div className="flex gap-4 text-xs text-slate-400">
              <span>送出：{status.sent.toLocaleString()}/{status.total.toLocaleString()}</span>
              <span>送達：{status.delivered.toLocaleString()}</span>
              <span>確認：{status.read.toLocaleString()}</span>
              {status.total > 100 && status.delivered > 0 && (
                <span className="text-green-400">
                  送達率：{((status.delivered / status.total) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 時間戳 */}
      <div className="mt-4 text-xs text-slate-500 text-right">
        最後更新：{new Date().toLocaleTimeString('zh-TW')}
      </div>
    </div>
  )
}

export default DispatchStatus
