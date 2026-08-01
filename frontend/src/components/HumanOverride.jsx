import { useState, useEffect } from 'react'
import { useSimClock } from '../hooks/useSimClock.jsx'

// AI 產出的決策（事件 22:10 發生後由 AI 產出）
const AI_DECISIONS = [
  {
    id: 'DEC-001',
    time: '22:10',
    category: '路線規劃',
    aiSuggestion: '封閉光復南路南下全線，啟動市民大道/仁愛路分流',
    reasoning: 'SOP 第 2 條：光復南路塌陷 Saturation 1.00，完全阻斷',
    confidence: 95,
    impact: '影響約 1,800 輛車/時',
    urgency: 'high',
    status: 'pending',
  },
  {
    id: 'DEC-002',
    time: '22:10',
    category: '號誌調整',
    aiSuggestion: '市民大道/光復南路口綠燈配時 +25%',
    reasoning: 'SOP 第 1 條：替代道路綠燈延長，疏散上游車流',
    confidence: 90,
    impact: '東西向等待時間增加 8 秒',
    urgency: 'high',
    status: 'pending',
  },
  {
    id: 'DEC-003',
    time: '22:20',
    category: '跨系統聯動',
    aiSuggestion: '通知北捷過站不停，調度接駁專車至 BL18',
    reasoning: 'SOP 第 3 條：BL17 Growth_Rate > 0.30，User_Count > 25,000',
    confidence: 92,
    impact: '捷運站人流需立即疏散',
    urgency: 'high',
    status: 'pending',
  },
  {
    id: 'DEC-004',
    time: '22:20',
    category: '通報發送',
    aiSuggestion: '發送多語緊急通報（台北101廣場漫遊率 40%）',
    reasoning: 'SOP 第 6 條：Roaming_User_Pct 40% ≥ 30%，觸發多語通報',
    confidence: 99,
    impact: '約 9,500 人收到警報',
    urgency: 'high',
    status: 'pending',
  },
  {
    id: 'DEC-005',
    time: '22:30',
    category: '號誌調整',
    aiSuggestion: '信義威秀周邊派遣人工指揮（每路口 2 人）',
    reasoning: 'SOP 第 5 條：號誌故障，需改由人工交通指揮',
    confidence: 88,
    impact: '影響 3 個路口',
    urgency: 'medium',
    status: 'pending',
  },
]

const CATEGORY_ICONS = {
  '路線規劃': '🛤️',
  '號誌調整': '🚦',
  '通報發送': '📡',
  '跨系統聯動': '🔗',
}

// 用模組層級變數持久化決策狀態（避免 tab 切換時重置）
let persistedDecisions = null

function HumanOverride() {
  const [decisions, setDecisions] = useState(() => {
    if (persistedDecisions) return persistedDecisions
    return AI_DECISIONS
  })
  const [overrideModal, setOverrideModal] = useState(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideAction, setOverrideAction] = useState('')
  const [mode, setMode] = useState('review')
  const { currentTime } = useSimClock()

  // 同步到模組層級快取
  useEffect(() => {
    persistedDecisions = decisions
  }, [decisions])

  // 依模擬時鐘過濾：只顯示 time <= currentTime 的決策
  const visibleDecisions = decisions.filter((d) => d.time <= currentTime)

  function handleApprove(id) {
    setDecisions((prev) =>
      prev.map((d) => d.id === id ? { ...d, status: 'approved', approvedAt: now() } : d)
    )
  }

  function handleApproveAll() {
    setDecisions((prev) =>
      prev.map((d) => d.status === 'pending' ? { ...d, status: 'approved', approvedAt: now() } : d)
    )
  }

  function handleReject(id) {
    setDecisions((prev) =>
      prev.map((d) => d.id === id ? { ...d, status: 'rejected', rejectedAt: now() } : d)
    )
  }

  function handleOverrideOpen(decision) {
    setOverrideModal(decision)
    setOverrideReason('')
    setOverrideAction('')
  }

  function handleOverrideSubmit() {
    if (!overrideReason || !overrideAction) return
    setDecisions((prev) =>
      prev.map((d) => d.id === overrideModal.id ? {
        ...d,
        status: 'overridden',
        overriddenAt: now(),
        overrideReason,
        overrideAction,
      } : d)
    )
    setOverrideModal(null)
  }

  function now() {
    return new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const pending = visibleDecisions.filter((d) => d.status === 'pending')
  const approved = visibleDecisions.filter((d) => d.status === 'approved')
  const overridden = visibleDecisions.filter((d) => d.status === 'overridden')
  const rejected = visibleDecisions.filter((d) => d.status === 'rejected')

  return (
    <div className="space-y-6">
      {/* 標題 + 模式切換 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">🎖️ 指揮官最終控制權</h2>
            <p className="text-sm text-slate-400 mt-1">AI 提供建議，人類做最終決定。所有 AI 決策需經指揮官審核後才會執行。</p>
          </div>
          {/* 模式切換 */}
          <div className="flex items-center gap-2 bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setMode('review')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                mode === 'review' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🔍 逐一審核
            </button>
            <button
              onClick={() => setMode('auto')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                mode === 'auto' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚡ 自動執行
            </button>
          </div>
        </div>

        {mode === 'review' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-sm text-amber-300">
              🔍 <strong>審核模式</strong>：AI 產出的所有決策需經您逐一批准才會執行。您可以批准、駁回或覆寫任何建議。
            </p>
          </div>
        )}
        {mode === 'auto' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-sm text-green-300">
              ⚡ <strong>自動模式</strong>：信心度 ≥ 90% 的決策自動執行，其餘仍需人工審核。指揮官隨時可介入覆寫。
            </p>
          </div>
        )}

        {/* 統計 */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-amber-400">{pending.length}</p>
            <p className="text-xs text-slate-400">待審核</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-green-400">{approved.length}</p>
            <p className="text-xs text-slate-400">已批准</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-blue-400">{overridden.length}</p>
            <p className="text-xs text-slate-400">已覆寫</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-red-400">{rejected.length}</p>
            <p className="text-xs text-slate-400">已駁回</p>
          </div>
        </div>
      </div>

      {/* 待審核決策 */}
      {pending.length > 0 && (
        <div className="card-glass rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">⏳ 待審核 AI 決策（{pending.length}）</h3>
            <button
              onClick={handleApproveAll}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
            >
              ✓ 全部批准
            </button>
          </div>

          <div className="space-y-3">
            {pending.map((decision) => (
              <div key={decision.id} className="bg-slate-700/30 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{CATEGORY_ICONS[decision.category]}</span>
                      <span className="text-xs text-slate-400">{decision.category}</span>
                      <span className="text-xs text-slate-500">{decision.time}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        decision.urgency === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {decision.urgency === 'high' ? '緊急' : '一般'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white">{decision.aiSuggestion}</p>
                    <p className="text-xs text-slate-400 mt-1">依據：{decision.reasoning}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-slate-400">影響：<span className="text-white">{decision.impact}</span></span>
                      <span className="text-slate-400">信心度：
                        <span className={decision.confidence >= 90 ? 'text-green-400' : 'text-amber-400'}>
                          {decision.confidence}%
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
                  <button
                    onClick={() => handleApprove(decision.id)}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    ✓ 批准執行
                  </button>
                  <button
                    onClick={() => handleOverrideOpen(decision)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    ✏️ 覆寫修改
                  </button>
                  <button
                    onClick={() => handleReject(decision.id)}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    ✕ 駁回
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 已處理決策 */}
      {(approved.length > 0 || overridden.length > 0 || rejected.length > 0) && (
        <div className="card-glass rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📋 決策處理紀錄</h3>
          <div className="space-y-2">
            {visibleDecisions.filter((d) => d.status !== 'pending').map((decision) => (
              <div key={decision.id} className={`p-3 rounded-lg border ${
                decision.status === 'approved' ? 'border-green-500/20 bg-green-500/5' :
                decision.status === 'overridden' ? 'border-blue-500/20 bg-blue-500/5' :
                'border-red-500/20 bg-red-500/5'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{CATEGORY_ICONS[decision.category]}</span>
                    <span className="text-sm text-white">{decision.aiSuggestion}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    decision.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    decision.status === 'overridden' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {decision.status === 'approved' ? '✓ 已批准' :
                     decision.status === 'overridden' ? '✏️ 已覆寫' : '✕ 已駁回'}
                  </span>
                </div>
                {decision.status === 'overridden' && (
                  <div className="mt-2 p-2 bg-blue-500/10 rounded text-xs">
                    <p className="text-blue-300">覆寫原因：{decision.overrideReason}</p>
                    <p className="text-blue-300">替代指令：{decision.overrideAction}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 人機協作說明 */}
      <div className="card-glass rounded-lg p-6 border-gradient">
        <h3 className="text-lg font-bold text-white mb-4">🤝 人機協作安全機制</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-slate-700/30 rounded-xl p-4">
            <span className="text-2xl block mb-2">🤖→🎖️</span>
            <h4 className="text-sm font-medium text-white">AI 建議，人類決定</h4>
            <p className="text-xs text-slate-400 mt-1">AI 產出建議方案，但<strong className="text-amber-400">不會自動執行</strong>任何影響現實的操作</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <span className="text-2xl block mb-2">✏️</span>
            <h4 className="text-sm font-medium text-white">隨時可覆寫</h4>
            <p className="text-xs text-slate-400 mt-1">指揮官可修改 AI 建議的任何細節，<strong className="text-blue-400">替換為自己的判斷</strong></p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <span className="text-2xl block mb-2">📝</span>
            <h4 className="text-sm font-medium text-white">完整留痕</h4>
            <p className="text-xs text-slate-400 mt-1">批准/覆寫/駁回全部記錄，<strong className="text-green-400">事後可回溯問責</strong></p>
          </div>
        </div>
      </div>

      {/* 覆寫彈窗 */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOverrideModal(null)} />
          <div className="relative bg-slate-800 border border-blue-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">✏️ 覆寫 AI 決策</h3>
            <p className="text-xs text-slate-400 mb-4">
              AI 建議：<span className="text-white">{overrideModal.aiSuggestion}</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">覆寫原因 *</label>
                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">選擇原因</option>
                  <option value="現場狀況與數據不符">現場狀況與數據不符</option>
                  <option value="AI 未考慮到特殊因素">AI 未考慮到特殊因素</option>
                  <option value="有更好的替代方案">有更好的替代方案</option>
                  <option value="時機不對，需延後">時機不對，需延後</option>
                  <option value="涉及政治/外交敏感">涉及政治/外交敏感</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">替代指令 *</label>
                <textarea
                  value={overrideAction}
                  onChange={(e) => setOverrideAction(e.target.value)}
                  placeholder="輸入您的替代決策..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleOverrideSubmit}
                  disabled={!overrideReason || !overrideAction}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                >
                  確認覆寫
                </button>
                <button
                  onClick={() => setOverrideModal(null)}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HumanOverride
