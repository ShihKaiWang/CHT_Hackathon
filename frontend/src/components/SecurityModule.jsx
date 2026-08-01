import { useState, useEffect, useRef } from 'react'

const ROLES = {
  commander: { id: 'commander', label: '指揮官', icon: '🎖️', permissions: ['dashboard', 'incidents', 'dispatch', 'chat', 'audit', 'settings'] },
  public: { id: 'public', label: '民眾', icon: '👥', permissions: ['dashboard_public', 'report', 'route'] },
}

const PERMISSION_LABELS = {
  dashboard: '即時監控儀表板',
  incidents: '事件注入與處理',
  dispatch: '通報發送（CBS/SMS）',
  chat: '策略諮詢',
  audit: '操作紀錄查看',
  settings: '系統設定',
  dashboard_public: '公開路況資訊',
  report: '民眾回報',
  route: '路線規劃',
}

const INITIAL_LOGS = []

function SecurityModule() {
  const [auditLogs, setAuditLogs] = useState(INITIAL_LOGS)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinCountdown, setPinCountdown] = useState(0)
  const [dispatchSuccess, setDispatchSuccess] = useState(false)
  const countdownRef = useRef(null)

  function addLog(action, detail, status) {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      user: '王指揮官',
      role: 'commander',
      action, detail, status,
    }
    setAuditLogs((prev) => [newLog, ...prev].slice(0, 50))
  }

  function handleDispatchAttempt() {
    setShowPinModal(true)
    setPinValue('')
    setPinError('')
    setPinCountdown(0)
    setDispatchSuccess(false)
  }

  function handlePinSubmit() {
    if (pinValue !== '0000') {
      setPinError('PIN 碼錯誤，請重新輸入')
      addLog('通報 PIN 驗證', '驗證失敗', 'denied')
      return
    }
    setPinError('')
    setPinCountdown(5)
    addLog('通報 PIN 驗證', '驗證通過，開始倒數', 'success')
    let count = 5
    countdownRef.current = setInterval(() => {
      count--
      setPinCountdown(count)
      if (count <= 0) {
        clearInterval(countdownRef.current)
        setDispatchSuccess(true)
        addLog('通報發送', 'CBS + SMS 已發送（經雙重確認）', 'success')
      }
    }, 1000)
  }

  function handleCancelDispatch() {
    clearInterval(countdownRef.current)
    setShowPinModal(false)
    setPinCountdown(0)
    addLog('取消通報發送', '指揮官手動取消', 'success')
  }

  useEffect(() => { return () => clearInterval(countdownRef.current) }, [])

  return (
    <div className="space-y-6">
      {/* 權限矩陣 */}
      <div className="card-glass rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🛡️ 權限控管矩陣</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 text-slate-400">功能</th>
                {Object.values(ROLES).map((r) => (
                  <th key={r.id} className="text-center py-2 text-slate-400">{r.icon} {r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                <tr key={perm} className="border-b border-slate-700/50">
                  <td className="py-2 text-slate-300">{label}</td>
                  {Object.values(ROLES).map((r) => (
                    <td key={r.id} className="text-center py-2">
                      {r.permissions.includes(perm) ? <span className="text-green-400">✓</span> : <span className="text-red-400/50">✕</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 通報確認閘 */}
      <div className="card-glass rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-2">🔒 通報發送確認閘</h3>
        <p className="text-xs text-slate-400 mb-4">發送 CBS/SMS 通報需經「PIN 驗證 + 5 秒倒數確認」雙重安全機制</p>
        <button onClick={handleDispatchAttempt} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all">
          🚀 模擬發送緊急通報
        </button>
        <p className="text-xs text-slate-500 mt-2">Demo PIN：0000</p>
      </div>

      {/* Audit Log */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">📜 操作稽核紀錄（Audit Log）</h3>
          <span className="text-xs text-slate-400">{auditLogs.length} 筆紀錄</span>
        </div>
        <div className="max-h-72 overflow-y-auto space-y-2">
          {auditLogs.map((log) => (
            <div key={log.id} className={`flex items-center gap-3 p-2.5 rounded-lg text-xs ${
              log.status === 'denied' ? 'bg-red-500/10 border border-red-500/20' : log.role === 'system' ? 'bg-slate-700/30' : 'bg-slate-700/20'
            }`}>
              <span className="text-slate-500 font-mono w-16 flex-shrink-0">{log.time}</span>
              <span className={`w-16 flex-shrink-0 ${log.role === 'commander' ? 'text-red-400' : log.role === 'system' ? 'text-purple-400' : 'text-green-400'}`}>{log.user}</span>
              <span className="text-white flex-shrink-0 w-28">{log.action}</span>
              <span className="text-slate-400 flex-1 truncate">{log.detail}</span>
              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full ${log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {log.status === 'success' ? '✓' : '✕ 拒絕'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 安全架構 */}
      <div className="card-glass rounded-lg p-6 border-gradient">
        <h3 className="text-lg font-bold text-white mb-4">🏗️ 系統資安架構</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-slate-700/30 rounded-xl p-4">
            <span className="text-2xl block mb-2">🔑</span>
            <h4 className="text-sm font-medium text-white">身份驗證</h4>
            <p className="text-xs text-slate-400 mt-1">JWT Token + 角色分級（指揮官 / 民眾）</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <span className="text-2xl block mb-2">🚧</span>
            <h4 className="text-sm font-medium text-white">雙重確認閘</h4>
            <p className="text-xs text-slate-400 mt-1">關鍵操作需 PIN + 倒數確認，防止誤發</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <span className="text-2xl block mb-2">📝</span>
            <h4 className="text-sm font-medium text-white">完整稽核</h4>
            <p className="text-xs text-slate-400 mt-1">所有操作紀錄可追溯，含時間、操作者、結果</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <span className="text-2xl block mb-2">🔒</span>
            <h4 className="text-sm font-medium text-white">傳輸加密</h4>
            <p className="text-xs text-slate-400 mt-1">HTTPS + WSS 全程加密</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <span className="text-2xl block mb-2">🛡️</span>
            <h4 className="text-sm font-medium text-white">Rate Limiting</h4>
            <p className="text-xs text-slate-400 mt-1">API 限流防 DDoS</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <span className="text-2xl block mb-2">🤖</span>
            <h4 className="text-sm font-medium text-white">AI 防注入</h4>
            <p className="text-xs text-slate-400 mt-1">RAG 輸入過濾 + Prompt 角色邊界</p>
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancelDispatch} />
          <div className="relative bg-slate-800 border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            {!dispatchSuccess ? (
              <>
                <div className="text-center mb-4">
                  <span className="text-3xl">🔐</span>
                  <h3 className="text-lg font-bold text-white mt-2">通報發送確認</h3>
                  <p className="text-xs text-slate-400 mt-1">請輸入 4 位 PIN 碼</p>
                  <p className="text-xs text-slate-500">Demo PIN：0000</p>
                </div>
                {pinCountdown === 0 && (
                  <div className="space-y-3">
                    <input type="password" maxLength={4} value={pinValue} onChange={(e) => setPinValue(e.target.value)}
                      placeholder="PIN" className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-red-500" />
                    {pinError && <p className="text-xs text-red-400 text-center">{pinError}</p>}
                    <button onClick={handlePinSubmit} disabled={pinValue.length < 4}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white font-bold rounded-lg">確認發送</button>
                  </div>
                )}
                {pinCountdown > 0 && (
                  <div className="text-center space-y-4">
                    <div className="text-5xl font-bold text-red-400 animate-pulse">{pinCountdown}</div>
                    <p className="text-sm text-slate-300">通報將在 {pinCountdown} 秒後發送</p>
                    <button onClick={handleCancelDispatch} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg">⏹ 取消發送</button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center space-y-3">
                <span className="text-4xl">✅</span>
                <h3 className="text-lg font-bold text-green-400">通報已成功發送</h3>
                <p className="text-xs text-slate-400">已記錄至 Audit Log</p>
                <button onClick={() => setShowPinModal(false)} className="w-full py-2 bg-green-600 text-white rounded-lg mt-3">確認</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityModule
