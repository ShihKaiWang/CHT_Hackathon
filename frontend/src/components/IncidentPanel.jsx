import { useState, useEffect, useRef } from 'react'
import { processIncident } from '../services/api'
import { incidentTemplates } from '../services/mockData'

const SOP_MAPPING = {
  road_collapse: { clause: '第 2 條', label: '主疏散規則', color: 'red' },
  collapse: { clause: '第 2 條', label: '主疏散規則', color: 'red' },
  crowd_surge: { clause: '第 3 條', label: '跨系統聯動', color: 'amber' },
  crowd: { clause: '第 3 條', label: '跨系統聯動', color: 'amber' },
  signal_failure: { clause: '第 5 條', label: '號誌異常處置', color: 'purple' },
  accident: { clause: '第 2 條', label: '主疏散規則', color: 'red' },
  construction: { clause: '第 2 條', label: '主疏散規則', color: 'red' },
  weather: { clause: '第 5 條', label: '異常處置', color: 'purple' },
}

function IncidentPanel() {
  const [selectedType, setSelectedType] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [result, setResult] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [countdownActive, setCountdownActive] = useState(false)
  const [jsonImported, setJsonImported] = useState(null)
  const [sopMatch, setSopMatch] = useState(null)
  const countdownRef = useRef(null)
  const fileInputRef = useRef(null)

  // 60 秒倒數計時
  useEffect(() => {
    if (countdownActive) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(countdownRef.current)
  }, [countdownActive])

  function handleJsonImport(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result)
        // 支援陣列或單一事件
        const events = Array.isArray(json) ? json : [json]
        const firstEvent = events[0]

        setJsonImported({
          raw: events,
          count: events.length,
          first: firstEvent,
        })

        // 自動填入
        const eventType = firstEvent.event_type || firstEvent.type || 'collapse'
        setSelectedType(eventType)
        setLocation(firstEvent.location || firstEvent.road || '未指定地點')
        setDescription(firstEvent.description || firstEvent.detail || '')

        // SOP 匹配
        const match = SOP_MAPPING[eventType] || { clause: '第 2 條', label: '主疏散規則', color: 'blue' }
        setSopMatch(match)
      } catch (err) {
        alert('JSON 格式錯誤，請確認檔案內容。')
      }
    }
    reader.readAsText(file)
  }

  // 模擬預設 JSON 載入
  function handleLoadSample() {
    const sampleEvents = [
      {
        event_id: 'EVT-001',
        event_type: 'road_collapse',
        location: '忠孝東路四段（延吉街至光復南路段）',
        description: '路面塌陷約 3×5 公尺，雙向車道完全阻斷',
        severity: 'A',
        timestamp: '2026-07-24T14:32:05+08:00',
      },
    ]
    setJsonImported({ raw: sampleEvents, count: 1, first: sampleEvents[0] })
    setSelectedType('road_collapse')
    setLocation(sampleEvents[0].location)
    setDescription(sampleEvents[0].description)
    setSopMatch(SOP_MAPPING['road_collapse'])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedType || !location) return

    setProcessing(true)
    setResult(null)
    setCountdown(0)
    setCountdownActive(true)

    try {
      const response = await processIncident({
        type: selectedType,
        location,
        description,
      })
      setResult(response)
    } catch (err) {
      console.error('事件處理失敗:', err)
    } finally {
      setProcessing(false)
      setCountdownActive(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 事件注入表單 */}
      <div className="space-y-4">
        {/* JSON 匯入區 */}
        <div className="card-glass rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-3">📂 事件 JSON 匯入</h2>
          <p className="text-xs text-slate-400 mb-4">
            載入 live_incidents.json 自動解析事件並匹配 SOP 條款
          </p>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 border-dashed rounded-lg text-sm text-slate-300 transition-colors"
            >
              📁 選擇 JSON 檔案
            </button>
            <button
              onClick={handleLoadSample}
              className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-sm text-blue-400 transition-colors"
            >
              載入範例
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleJsonImport}
            className="hidden"
          />

          {/* JSON 匯入結果 */}
          {jsonImported && (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-400">✅ 已載入 {jsonImported.count} 筆事件</span>
                <span className="text-xs text-slate-500 font-mono">
                  {jsonImported.first.event_id || 'N/A'}
                </span>
              </div>
              <div className="text-xs text-slate-300">
                <p>類型：{jsonImported.first.event_type || jsonImported.first.type}</p>
                <p>地點：{jsonImported.first.location || jsonImported.first.road}</p>
              </div>
              {/* SOP 匹配 */}
              {sopMatch && (
                <div className={`mt-2 p-2 rounded border ${
                  sopMatch.color === 'red' ? 'border-red-500/30 bg-red-500/10' :
                  sopMatch.color === 'amber' ? 'border-amber-500/30 bg-amber-500/10' :
                  'border-purple-500/30 bg-purple-500/10'
                }`}>
                  <p className={`text-xs font-medium ${
                    sopMatch.color === 'red' ? 'text-red-400' :
                    sopMatch.color === 'amber' ? 'text-amber-400' :
                    'text-purple-400'
                  }`}>
                    🔗 已匹配 SOP {sopMatch.clause}（{sopMatch.label}）
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 手動事件表單 */}
        <div className="card-glass rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">🚨 突發事件注入</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 事件類型選擇 */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">事件類型</label>
              <div className="grid grid-cols-2 gap-2">
                {incidentTemplates.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(t.type)
                      setSopMatch(SOP_MAPPING[t.type] || null)
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedType === t.type
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-lg">{t.icon}</span>
                    <span className="ml-2 text-sm">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* SOP 匹配顯示 */}
            {sopMatch && !jsonImported && (
              <div className={`p-2 rounded border ${
                sopMatch.color === 'red' ? 'border-red-500/30 bg-red-500/10' :
                sopMatch.color === 'amber' ? 'border-amber-500/30 bg-amber-500/10' :
                'border-purple-500/30 bg-purple-500/10'
              }`}>
                <p className={`text-xs font-medium ${
                  sopMatch.color === 'red' ? 'text-red-400' :
                  sopMatch.color === 'amber' ? 'text-amber-400' :
                  'text-purple-400'
                }`}>
                  🔗 將觸發 SOP {sopMatch.clause}（{sopMatch.label}）
                </p>
              </div>
            )}

            {/* 地點 */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">事件地點</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例：忠孝東路四段/復興南路口"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">事件描述（選填）</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="補充事件細節..."
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedType || !location || processing}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {processing ? '⏳ AI 分析處理中...' : '送出事件 → 啟動應變'}
            </button>
          </form>
        </div>
      </div>

      {/* 處理結果 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">📋 應變方案</h2>
          {/* 60 秒倒數 */}
          {(countdownActive || (result && countdown > 0)) && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              result ? 'bg-green-500/20 border border-green-500/30' : 'bg-blue-500/20 border border-blue-500/30'
            }`}>
              {countdownActive && <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>}
              <span className={`text-sm font-mono font-bold ${result ? 'text-green-400' : 'text-blue-400'}`}>
                {countdown}s
              </span>
              {result && <span className="text-xs text-green-400">✓ 完成</span>}
            </div>
          )}
        </div>

        {/* 60 秒進度條 */}
        {(countdownActive || result) && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>0s</span>
              <span className={countdown <= 60 ? 'text-green-400' : 'text-red-400'}>目標 60 秒</span>
              <span>60s</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  result ? 'bg-green-500' : countdown > 50 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((countdown / 60) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {!result && !processing && (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="text-center">
              <p className="text-4xl mb-3">🎯</p>
              <p>送出事件後將顯示 AI 分析結果</p>
              <p className="text-xs mt-1">或匯入 live_incidents.json 自動處理</p>
            </div>
          </div>
        )}
        {processing && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-slate-400">AI 正在計算最優替代路徑...</p>
            <p className="text-xs text-slate-500 mt-1">目標：60 秒內完成路網重規劃</p>
          </div>
        )}
        {result && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm font-medium text-red-400">事件：{result.event}</p>
              <p className="text-xs text-slate-400 mt-1">
                影響路段：{result.affected_roads.join('、')}
              </p>
              {sopMatch && (
                <p className="text-xs text-amber-400 mt-1">
                  觸發 SOP {sopMatch.clause}（{sopMatch.label}）
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">🛤️ 替代路線</h3>
              {result.alternative_routes.map((route, i) => (
                <div key={i} className="bg-slate-700 rounded-lg p-3 mb-2">
                  <p className="text-sm text-white">{route.path}</p>
                  <div className="flex gap-3 mt-1 text-xs text-slate-400">
                    <span>⏱️ ETE: {route.ete}</span>
                    <span>🚗 壅塞度: {route.congestion}</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">🚦 號誌調整</h3>
              {result.signal_adjustments.map((adj, i) => (
                <div key={i} className="text-sm text-slate-300 mb-1">
                  <span className="text-slate-400">{adj.intersection}：</span>
                  {adj.action}
                </div>
              ))}
            </div>

            <div className="text-xs text-green-400 mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              ✅ 處理完成（耗時 {countdown} 秒 {countdown <= 60 ? '— 目標達成！' : ''}）
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IncidentPanel
