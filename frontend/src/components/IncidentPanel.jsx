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

function IncidentPanel({ incidentResult, setIncidentResult }) {
  const [selectedType, setSelectedType] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const result = incidentResult
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
    setIncidentResult(null)
    setCountdown(0)
    setCountdownActive(true)

    try {
      const response = await processIncident({
        type: selectedType,
        location,
        description,
      })
      setIncidentResult(response)
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
            {/* 情況分析 */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <h3 className="text-sm font-medium text-red-400 mb-2">📊 情況分析</h3>
              {result.agent_structured?.situation ? (
                <div className="text-xs text-slate-300 space-y-1">
                  <p>事件類型：<span className="text-white">{result.agent_structured.situation.event_type}</span></p>
                  <p>事件位置：<span className="text-white">{result.agent_structured.situation.location}</span></p>
                  <p>事件描述：<span className="text-white">{result.agent_structured.situation.description}</span></p>
                  <p>影響範圍：<span className="text-red-300">{result.agent_structured.situation.affected_scope}</span></p>
                </div>
              ) : (
                <p className="text-sm text-white">{result.event}</p>
              )}
            </div>

            {/* 級別判定 */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <h3 className="text-sm font-medium text-purple-400 mb-2">🚦 級別判定</h3>
              {result.agent_structured?.classification ? (
                <div className="text-xs text-slate-300 space-y-1">
                  <p>判定結果：<span className="text-red-400 font-bold text-base">{result.agent_structured.classification.level} 級</span></p>
                  <p>飽和度：<span className="text-white">{(result.agent_structured.classification.saturation * 100).toFixed(0)}%</span></p>
                  <p>依據：<span className="text-slate-200">{result.agent_structured.classification.basis}</span></p>
                </div>
              ) : (
                <p className="text-xs text-white">{result.level} 級（{result.severity}）</p>
              )}
            </div>

            {/* 替代路線 */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <h3 className="text-sm font-medium text-green-400 mb-2">🛤️ 替代路線</h3>
              {result.agent_structured?.alternatives?.length > 0 ? (
                <div className="space-y-2">
                  {result.agent_structured.alternatives.map((alt, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-800 rounded p-2">
                      <div>
                        <span className="text-sm text-white font-medium">{alt.name}</span>
                        <span className="text-xs text-slate-400 ml-2">{alt.recommendation}</span>
                      </div>
                      <div className="text-xs text-green-400">
                        飽和度 {(alt.saturation * 100).toFixed(0)}% | {alt.capacity} vph
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                result.alternative_routes?.map((route, i) => (
                  <div key={i} className="bg-slate-700 rounded-lg p-2 mb-1 text-sm text-white">
                    {route.path} — ETE {route.ete}
                  </div>
                ))
              )}
            </div>

            {/* ETE */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <h3 className="text-sm font-medium text-amber-400 mb-2">⏱️ ETE 預估</h3>
              {result.agent_structured?.ete ? (
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="text-xl font-bold text-amber-400 font-mono">{result.agent_structured.ete.minutes} 分鐘</p>
                  <p className="font-mono text-slate-400">{result.agent_structured.ete.formula}</p>
                  <p className="text-slate-200 mt-1">{result.agent_structured.ete.explanation}</p>
                </div>
              ) : (
                <p className="text-xl font-bold text-amber-400">{result.ete?.ete_minutes} 分鐘</p>
              )}
            </div>

            {/* 多語通報 */}
            {result.agent_structured?.multilang?.triggered && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <h3 className="text-sm font-medium text-blue-400 mb-2">🌐 多語通報（LLM 生成）</h3>
                <p className="text-xs text-slate-400 mb-2">漫遊率 {(result.agent_structured.multilang.roaming_rate * 100).toFixed(0)}% — 站點：{result.agent_structured.multilang.station}</p>
                <div className="space-y-1.5">
                  {['zh', 'en', 'ja', 'ko'].map((lang) => (
                    result.agent_structured.multilang[lang] && (
                      <div key={lang} className="bg-slate-800 rounded p-2 text-xs">
                        <span className="text-blue-300 font-medium mr-2">{lang.toUpperCase()}</span>
                        <span className="text-slate-300">{result.agent_structured.multilang[lang]}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* 通報派遣（dispatch_to_agency 結果） */}
            {result.agent_structured?.dispatch && (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
                <h3 className="text-sm font-medium text-indigo-400 mb-2">📞 通報派遣</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">通報單位：</p>
                    <div className="space-y-1">
                      {result.agent_structured.dispatch.agencies?.map((agency, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${agency.priority === 'P0' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{agency.priority}</span>
                          <span className="text-white">{agency.name}</span>
                          <span className="text-slate-400">— {agency.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">號誌調整：</p>
                    <div className="bg-slate-800 rounded p-2 text-xs text-slate-300">
                      <p>{result.agent_structured.dispatch.signal_adjustment?.action}</p>
                      <p className="text-amber-400 mt-1">持續：{result.agent_structured.dispatch.signal_adjustment?.duration}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">預估處理時間：<span className="text-white">{result.agent_structured.dispatch.handling_time}</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* SOP 行動方案 */}
            {result.agent_structured?.sop_actions?.length > 0 && (
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                <h3 className="text-sm font-medium text-white mb-2">📋 SOP 行動方案</h3>
                <div className="space-y-1.5">
                  {result.agent_structured.sop_actions.map((action, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${action.priority === 'P0' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {action.priority}
                      </span>
                      <span className="text-white flex-1">{action.action}</span>
                      <span className="text-slate-500">{action.unit}</span>
                      <span className="text-cyan-400">{action.sop_clause}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 民眾導引 */}
            {(result.agent_structured?.guidance_text || result.llm_guidance) && (
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                <h3 className="text-sm font-medium text-cyan-400 mb-1">🤖 民眾導引文字（AI Agent 生成）</h3>
                <p className="text-sm text-slate-300">{result.agent_structured?.guidance_text || result.llm_guidance}</p>
              </div>
            )}

            {/* Agent 推理過程 */}
            {result.agent_tool_calls && result.agent_tool_calls.length > 0 && (
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                <p className="text-xs text-cyan-400 font-medium mb-2">
                  🔗 Agent 推理（{result.agent_iterations} 輪，{result.agent_tool_calls.length} 次工具呼叫）
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.agent_tool_calls.map((tc, j) => (
                    <div key={j} className="text-xs text-slate-400 flex items-start gap-1">
                      <span className="text-green-400 flex-shrink-0">→</span>
                      <span><span className="text-cyan-300">{tc.tool}</span>({Object.values(tc.input || {}).join(', ') || ''})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 完成狀態 + 匯出 */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-green-400 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                ✅ 處理完成（{countdown} 秒 {countdown <= 60 ? '— 目標達成！' : ''}）
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const data = result.agent_structured || result
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `incident-report-${Date.now()}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                >
                  📄 JSON
                </button>
                <button
                  onClick={() => {
                    const s = result.agent_structured || {}
                    let md = `# 交控中心應變報告\n\n`
                    md += `## 情況分析\n- 事件類型：${s.situation?.event_type || result.event || ''}\n- 位置：${s.situation?.location || ''}\n- 描述：${s.situation?.description || ''}\n- 影響範圍：${s.situation?.affected_scope || ''}\n\n`
                    md += `## 級別判定\n- 等級：${s.classification?.level || result.level || ''} 級\n- 飽和度：${s.classification?.saturation ? (s.classification.saturation * 100).toFixed(0) + '%' : ''}\n- 依據：${s.classification?.basis || ''}\n\n`
                    md += `## 替代路線\n`
                    ;(s.alternatives || result.alternative_routes || []).forEach((alt, i) => {
                      md += `${i + 1}. ${alt.name || alt.path}（飽和度 ${alt.saturation ? (alt.saturation * 100).toFixed(0) + '%' : ''}，容量 ${alt.capacity || ''} vph）\n`
                    })
                    md += `\n## ETE 預估\n- 預計恢復：${s.ete?.minutes || result.ete?.ete_minutes || ''} 分鐘\n- 公式：${s.ete?.formula || result.ete?.formula || ''}\n- 解釋：${s.ete?.explanation || ''}\n\n`
                    if (s.multilang?.triggered) {
                      md += `## 多語通報\n- 🇹🇼 ${s.multilang.zh || ''}\n- 🇺🇸 ${s.multilang.en || ''}\n- 🇯🇵 ${s.multilang.ja || ''}\n- 🇰🇷 ${s.multilang.ko || ''}\n\n`
                    }
                    if (s.sop_actions?.length) {
                      md += `## SOP 行動方案\n`
                      s.sop_actions.forEach((a) => { md += `- [${a.priority}] ${a.action}（${a.unit}）— ${a.sop_clause}\n` })
                      md += `\n`
                    }
                    md += `## 民眾導引\n${s.guidance_text || result.llm_guidance || ''}\n`
                    const blob = new Blob([md], { type: 'text/markdown' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `incident-report-${Date.now()}.md`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors"
                >
                  📝 Markdown
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IncidentPanel
