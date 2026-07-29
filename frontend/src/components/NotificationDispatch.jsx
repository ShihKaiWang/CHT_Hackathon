import { useState } from 'react'
import ChannelPreview from './ChannelPreview'

const CHANNELS = [
  {
    id: 'cbs',
    name: 'Cell Broadcast',
    icon: '📡',
    desc: '細胞廣播（強制推播到該區所有手機）',
    coverage: '基地台範圍 500m',
    speed: '< 30 秒',
  },
  {
    id: 'sms',
    name: 'SMS 簡訊',
    icon: '💬',
    desc: '發送至信令偵測到的用戶手機',
    coverage: '已偵測用戶',
    speed: '< 60 秒',
  },
  {
    id: 'signboard',
    name: '電子看板 / CMS',
    icon: '🖥️',
    desc: '路側電子看板即時更新',
    coverage: '沿線 12 面看板',
    speed: '即時',
  },
  {
    id: 'app',
    name: 'APP 推播',
    icon: '📱',
    desc: 'Firebase / APNs 推播通知',
    coverage: 'APP 用戶 ~15,000',
    speed: '< 10 秒',
  },
  {
    id: 'navigation',
    name: '導航平台',
    icon: '🗺️',
    desc: 'Google Maps / Apple Maps 路況更新',
    coverage: '導航用戶',
    speed: '< 5 分鐘',
  },
  {
    id: 'social',
    name: '社群廣播',
    icon: '📢',
    desc: 'LINE 官方帳號 / X (Twitter)',
    coverage: '追蹤者 ~80,000',
    speed: '< 30 秒',
  },
]

function NotificationDispatch({ onDispatch }) {
  const [selectedChannels, setSelectedChannels] = useState(['cbs', 'sms', 'signboard'])
  const [dispatching, setDispatching] = useState(false)
  const [dispatched, setDispatched] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  function toggleChannel(id) {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  async function handleDispatch() {
    if (selectedChannels.length === 0) return
    setDispatching(true)
    setDispatched(false)

    // 模擬逐步發送
    await new Promise((r) => setTimeout(r, 2000))
    setDispatching(false)
    setDispatched(true)
    setShowPreview(true) // 發送後自動跳出預覽

    if (onDispatch) {
      onDispatch(selectedChannels)
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-2">📤 通知發送管道</h2>
      <p className="text-xs text-slate-400 mb-4">
        選擇要啟用的通知管道，系統將同步發送多語通報至所有選定管道
      </p>

      {/* 管道選擇 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {CHANNELS.map((ch) => {
          const selected = selectedChannels.includes(ch.id)
          return (
            <button
              key={ch.id}
              onClick={() => toggleChannel(ch.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selected
                  ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500/30'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{ch.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{ch.name}</span>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selected ? 'border-blue-500 bg-blue-500' : 'border-slate-500'
                    }`}>
                      {selected && <span className="text-white text-xs">✓</span>}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{ch.desc}</p>
                  <div className="flex gap-3 mt-1 text-xs text-slate-500">
                    <span>覆蓋：{ch.coverage}</span>
                    <span>速度：{ch.speed}</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 發送按鈕 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleDispatch}
          disabled={selectedChannels.length === 0 || dispatching}
          className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20"
        >
          {dispatching
            ? '⏳ 正在發送中...'
            : dispatched
            ? '✅ 重新發送'
            : `🚀 發送通報（${selectedChannels.length} 個管道）`}
        </button>
        <button
          onClick={() => setShowPreview(true)}
          disabled={selectedChannels.length === 0}
          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
          title="預覽各管道呈現方式"
        >
          👁️ 預覽
        </button>
        {dispatched && (
          <span className="text-sm text-green-400 animate-pulse">已成功送出</span>
        )}
      </div>

      {/* 管道預覽 Modal */}
      {showPreview && (
        <ChannelPreview
          selectedChannels={selectedChannels}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* 選取摘要 */}
      {selectedChannels.length > 0 && (
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
          <p className="text-xs text-slate-300">
            <span className="text-slate-400">已選擇管道：</span>
            {selectedChannels.map((id) => {
              const ch = CHANNELS.find((c) => c.id === id)
              return ` ${ch.icon} ${ch.name}`
            }).join('、')}
          </p>
        </div>
      )}
    </div>
  )
}

export default NotificationDispatch
