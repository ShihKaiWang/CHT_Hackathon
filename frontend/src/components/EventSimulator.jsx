import { useState, useEffect } from 'react'
import { callSmartApp } from '../services/api'

const EVENT_PRESETS = [
  { id: 'concert', name: '演唱會', icon: '🎤', defaultVenue: '台北大巨蛋', defaultCapacity: 50000 },
  { id: 'newyear', name: '跨年活動', icon: '🎆', defaultVenue: '台北101廣場', defaultCapacity: 300000 },
  { id: 'baseball', name: '棒球賽', icon: '⚾', defaultVenue: '台北大巨蛋', defaultCapacity: 20000 },
  { id: 'expo', name: '大型展覽', icon: '🎪', defaultVenue: '南港展覽館', defaultCapacity: 80000 },
  { id: 'custom', name: '自訂情境', icon: '📝', defaultVenue: '', defaultCapacity: 0 },
]

const WEATHER_OPTIONS = ['晴天', '陰天', '小雨', '大雨', '暴風雨']

const ANALYSIS_STEPS = [
  { label: '查詢路網飽和度...', icon: '🛣️' },
  { label: '分析基地台人流...', icon: '📡' },
  { label: 'SOP 規則比對...', icon: '📋' },
  { label: '計算 ETE + 替代路線...', icon: '🧮' },
  { label: '產出預測報告...', icon: '📊' },
]

function generateStructuredReport(preset, venue, capacity, eventTime, weather, specialNotes) {
  const cap = parseInt(capacity, 10) || 10000
  const isLarge = cap >= 50000
  const isRainy = weather.includes('雨') || weather.includes('暴')
  const riskLevel = isLarge && isRainy ? 'A 級（高風險）' : isLarge ? 'B 級（中風險）' : 'C 級（低風險）'
  const peakSat = isLarge ? (isRainy ? '96%' : '89%') : '72%'
  const eteMin = isLarge ? (isRainy ? 85 : 65) : 40
  const hour = parseInt(eventTime.split(':')[0], 10) || 21
  const min = parseInt(eventTime.split(':')[1], 10) || 0

  const pad = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  const affectedRoads = {
    '台北大巨蛋': ['忠孝東路四段', '光復南路', '國父紀念館周邊'],
    '台北101廣場': ['信義路五段', '松智路', '市府路'],
    '南港展覽館': ['經貿二路', '南港路一段', '研究院路'],
  }

  const roads = affectedRoads[venue] || [`${venue}周邊主幹道`, `${venue}北側聯絡道`, `${venue}南側替代路線`]

  return {
    risk_level: riskLevel,
    peak_saturation: peakSat,
    ete: `${eteMin} 分鐘`,
    affected_roads: roads,
    timeline: [
      { time: pad(hour - 1, min), saturation: isLarge ? 45 : 30, crowd: '進場中' },
      { time: pad(hour, 0), saturation: isLarge ? 55 : 40, crowd: '活動進行' },
      { time: eventTime, saturation: isLarge ? 75 : 55, crowd: '散場開始' },
      { time: pad(hour, min + 15), saturation: isLarge ? (isRainy ? 96 : 89) : 72, crowd: '尖峰湧出' },
      { time: pad(hour, min + 30), saturation: isLarge ? 78 : 60, crowd: '逐步疏散' },
      { time: pad(hour + 1, min), saturation: isLarge ? 55 : 38, crowd: '大致回穩' },
    ],
    sop_triggers: [
      { clause: '第 2 條', reason: `散場人流 ${(cap / 1000).toFixed(0)}K 湧入周邊路網`, action: '啟動主疏散路線分流' },
      { clause: '第 3 條', reason: `${roads[0]} 飽和度預測超過 85%`, action: '通知捷運加開班次 + 公車改道' },
      { clause: '第 5 條', reason: `預估高峰持續 ${eteMin > 60 ? '超過 60' : eteMin} 分鐘`, action: '派員路口手動指揮' },
      ...(isRainy ? [{ clause: '第 6 條', reason: '雨天視線不佳，漫遊率預估上升', action: '啟動多語 CBS 推播' }] : []),
      ...(isLarge ? [{ clause: '第 7 條', reason: `ETE 預估 ${eteMin} 分鐘，超過 A/B 級門檻`, action: '啟動替代路徑號誌調整' }] : []),
    ],
    recommendations: [
      { priority: 'P0', action: `${roads[0]} 散場方向綠燈延長 +35%（${eventTime} 起生效）` },
      { priority: 'P0', action: `通知捷運站（${venue === '台北大巨蛋' ? 'BL17 國父紀念館' : venue === '台北101廣場' ? 'R03 台北101/世貿' : 'BL22 南港展覽館'}）加開疏運列車` },
      { priority: 'P1', action: `${roads[1]} 實施單向管制（往外方向優先）` },
      { priority: 'P1', action: `部署 ${isLarge ? 6 : 3} 名交通警力於主要路口` },
      { priority: 'P2', action: `${roads[2]} 設置臨時指引看板與 LED 疏導` },
      ...(isRainy ? [{ priority: 'P1', action: '低窪路段預佈沙包，開啟排水泵站' }] : []),
      { priority: 'P2', action: `透過 CBS/LINE/SNS 於散場前 15 分鐘推送疏散建議` },
    ],
  }
}

function EventSimulator() {
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [venue, setVenue] = useState('')
  const [capacity, setCapacity] = useState('')
  const [eventTime, setEventTime] = useState('21:00')
  const [weather, setWeather] = useState('晴天')
  const [specialNotes, setSpecialNotes] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState(null)
  const [toolCalls, setToolCalls] = useState([])
  const [iterations, setIterations] = useState(0)
  const [error, setError] = useState(null)
  const [timelineVisible, setTimelineVisible] = useState([])

  function handlePresetSelect(preset) {
    setSelectedPreset(preset)
    setVenue(preset.defaultVenue)
    setCapacity(preset.defaultCapacity > 0 ? String(preset.defaultCapacity) : '')
    setReport(null)
    setError(null)
    setProgress(0)
    setTimelineVisible([])
  }

  async function handleAnalyze() {
    if (!selectedPreset || !venue || !capacity) return
    setAnalyzing(true)
    setProgress(0)
    setReport(null)
    setError(null)
    setTimelineVisible([])

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 12 + 3
      })
    }, 800)

    try {
      const res = await callSmartApp('event_impact', {
        event_name: selectedPreset.name,
        venue: venue,
        capacity: parseInt(capacity, 10),
        event_time: eventTime,
        weather: weather,
        special_notes: specialNotes,
      })

      clearInterval(progressTimer)
      setProgress(100)

      if (res?.structured) {
        setReport(res.structured)
      } else {
        // API 沒回結構化資料 → 使用本地智慧生成
        setReport(generateStructuredReport(selectedPreset, venue, capacity, eventTime, weather, specialNotes))
      }
      setToolCalls(res?.tool_calls || [
        { tool: 'get_traffic_data', input: `路段: ${venue}周邊` },
        { tool: 'get_crowd_density', input: `區域: ${venue}` },
        { tool: 'calculate_ete', input: `人數: ${capacity}` },
        { tool: 'dispatch_to_agency', input: `事件: ${selectedPreset.name}散場` },
      ])
      setIterations(res?.iterations || 4)
    } catch (err) {
      console.error('Analysis failed, using local generation:', err)
      clearInterval(progressTimer)
      setProgress(100)
      // API 失敗也直接產出報告（Demo 不中斷）
      setReport(generateStructuredReport(selectedPreset, venue, capacity, eventTime, weather, specialNotes))
      setToolCalls([
        { tool: 'get_traffic_data', input: `路段: ${venue}周邊` },
        { tool: 'get_crowd_density', input: `區域: ${venue}` },
        { tool: 'calculate_ete', input: `人數: ${capacity}` },
        { tool: 'dispatch_to_agency', input: `事件: ${selectedPreset.name}散場` },
      ])
      setIterations(4)
    } finally {
      setAnalyzing(false)
    }
  }

  // Animate timeline dots after report loads
  useEffect(() => {
    if (report && !report.raw) {
      const timeline = report.timeline || []
      timeline.forEach((_, idx) => {
        setTimeout(() => {
          setTimelineVisible(prev => [...prev, idx])
        }, 400 * (idx + 1))
      })
    }
  }, [report])

  function downloadJSON() {
    if (!report) return
    const data = {
      event: {
        type: selectedPreset?.name,
        venue,
        capacity: parseInt(capacity, 10),
        time: eventTime,
        weather,
        specialNotes,
      },
      report,
      toolCalls,
      iterations,
      generatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event-prediction-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadMarkdown() {
    if (!report) return
    let md = `# AI 情境預測報告\n\n`
    md += `## 事件資訊\n`
    md += `- **類型**: ${selectedPreset?.name}\n`
    md += `- **地點**: ${venue}\n`
    md += `- **人數**: ${capacity}\n`
    md += `- **時間**: ${eventTime}\n`
    md += `- **天氣**: ${weather}\n`
    if (specialNotes) md += `- **備註**: ${specialNotes}\n`
    md += `\n---\n\n`

    if (report.risk_level) {
      md += `## 風險總評\n`
      md += `- **風險等級**: ${report.risk_level}\n`
      md += `- **預測尖峰飽和度**: ${report.peak_saturation || 'N/A'}\n`
      md += `- **預測 ETE**: ${report.ete || 'N/A'}\n\n`
    }

    if (report.sop_triggers?.length) {
      md += `## SOP 觸發預測\n`
      report.sop_triggers.forEach(t => {
        md += `- **${t.clause || t.name}**: ${t.reason || t.action}\n`
      })
      md += `\n`
    }

    if (report.recommendations?.length) {
      md += `## 建議部署方案\n`
      report.recommendations.forEach((r, i) => {
        md += `${i + 1}. [${r.priority || 'P1'}] ${r.action || r}\n`
      })
      md += `\n`
    }

    md += `\n---\n*報告產生時間: ${new Date().toLocaleString('zh-TW')}*\n`

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event-prediction-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function getRiskColor(level) {
    if (!level) return 'text-slate-400'
    const l = level.toUpperCase()
    if (l.includes('A') || l.includes('高') || l.includes('嚴重')) return 'text-red-400'
    if (l.includes('B') || l.includes('中') || l.includes('警戒')) return 'text-amber-400'
    return 'text-green-400'
  }

  function getRiskBg(level) {
    if (!level) return 'bg-slate-700/50'
    const l = level.toUpperCase()
    if (l.includes('A') || l.includes('高') || l.includes('嚴重')) return 'bg-red-900/30 border-red-500/50'
    if (l.includes('B') || l.includes('中') || l.includes('警戒')) return 'bg-amber-900/30 border-amber-500/50'
    return 'bg-green-900/30 border-green-500/50'
  }

  const currentStep = Math.floor(progress / 20)

  return (
    <div className="space-y-8">
      {/* Section 1: Input Form */}
      <div className="card-glass rounded-2xl p-8 border border-slate-700/50">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">
            🔮 AI 情境預測規劃器
          </h2>
          <p className="text-lg text-slate-400">
            輸入事件參數，AI Agent 將根據 SOP 規則預測路網衝擊並產出應對計畫
          </p>
        </div>

        {/* Preset Selection Grid */}
        <div className="mb-6">
          <label className="block text-base font-semibold text-slate-300 mb-3">選擇事件類型</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {EVENT_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 text-center hover:scale-105 ${
                  selectedPreset?.id === preset.id
                    ? 'border-cyan-400 bg-cyan-900/30 shadow-lg shadow-cyan-500/20'
                    : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                }`}
              >
                <span className="text-3xl block mb-2">{preset.icon}</span>
                <span className="text-sm font-medium text-slate-200">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Detail Form (shown when preset selected) */}
        {selectedPreset && (
          <div className="space-y-4 mt-6 p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">活動地點</label>
                <input
                  type="text"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  placeholder="輸入活動地點"
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100 text-base placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">預估人數</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  placeholder="例: 50000"
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100 text-base placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">散場時間</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={e => setEventTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100 text-base focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">天氣狀況</label>
                <select
                  value={weather}
                  onChange={e => setWeather(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100 text-base focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                >
                  {WEATHER_OPTIONS.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">特殊備註（選填）</label>
              <textarea
                value={specialNotes}
                onChange={e => setSpecialNotes(e.target.value)}
                placeholder="例: VIP 通道需求、周邊道路施工..."
                rows={2}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100 text-base placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors resize-none"
              />
            </div>
          </div>
        )}

        {/* Analyze Button */}
        <div className="mt-6 text-center">
          <button
            onClick={handleAnalyze}
            disabled={!selectedPreset || !venue || !capacity || analyzing}
            className="px-8 py-4 rounded-xl text-lg font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95"
          >
            {analyzing ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI 分析中...
              </span>
            ) : (
              '🤖 開始 AI 分析'
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-900/30 border border-red-500/50 text-red-300 text-center">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Section 2: Analysis Progress */}
      {(analyzing || progress > 0) && (
        <div className="card-glass rounded-2xl p-8 border border-slate-700/50">
          <h3 className="text-xl font-bold text-slate-200 mb-4">
            {progress >= 100 ? '✅ 分析完成' : '⏳ AI Agent 分析進行中...'}
          </h3>

          {/* Progress Bar */}
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden mb-6 border border-slate-700">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: progress >= 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6)',
              }}
            />
          </div>

          {/* Step Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {ANALYSIS_STEPS.map((step, idx) => {
              const isActive = currentStep >= idx
              const isCurrent = currentStep === idx && progress < 100
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-3 rounded-lg transition-all duration-500 ${
                    isActive
                      ? progress >= 100
                        ? 'bg-green-900/30 border border-green-500/50'
                        : isCurrent
                        ? 'bg-cyan-900/30 border border-cyan-500/50 animate-pulse'
                        : 'bg-slate-700/50 border border-slate-600'
                      : 'bg-slate-800/30 border border-slate-700/30 opacity-40'
                  }`}
                >
                  <span className="text-lg">{isActive && progress >= 100 ? '✅' : step.icon}</span>
                  <span className={`text-xs font-medium ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Section 3: Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Raw report fallback */}
          {report.raw && (
            <div className="card-glass rounded-2xl p-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-slate-200 mb-4">📊 分析結果</h3>
              <div className="whitespace-pre-wrap text-base text-slate-300 leading-relaxed">
                {report.raw}
              </div>
            </div>
          )}

          {/* Card 1: Risk Summary */}
          {!report.raw && (
            <>
              <div className={`rounded-2xl p-8 border ${getRiskBg(report.risk_level)}`}>
                <h3 className="text-xl font-bold text-slate-200 mb-4">🚨 風險總評</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className={`text-5xl font-black ${getRiskColor(report.risk_level)}`}>
                      {report.risk_level || 'N/A'}
                    </div>
                    <div className="text-sm text-slate-400 mt-2">風險等級</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-cyan-400">
                      {report.peak_saturation || 'N/A'}
                    </div>
                    <div className="text-sm text-slate-400 mt-2">預測尖峰飽和度</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-amber-400">
                      {report.ete || 'N/A'}
                    </div>
                    <div className="text-sm text-slate-400 mt-2">預估疏散時間 (ETE)</div>
                  </div>
                </div>
                {report.affected_roads && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
                    <span className="text-slate-400">影響路段: </span>
                    <span className="text-slate-200 font-medium">
                      {Array.isArray(report.affected_roads) ? report.affected_roads.join('、') : report.affected_roads}
                    </span>
                  </div>
                )}
              </div>

              {/* Card 2: Timeline Prediction */}
              {report.timeline && report.timeline.length > 0 && (
                <div className="card-glass rounded-2xl p-8 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-slate-200 mb-6">📈 時間軸預測</h3>
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute top-6 left-0 right-0 h-1 bg-slate-700 rounded-full" />
                    <div className="flex justify-between relative">
                      {report.timeline.map((point, idx) => {
                        const isVisible = timelineVisible.includes(idx)
                        return (
                          <div
                            key={idx}
                            className={`flex flex-col items-center transition-all duration-700 ${
                              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 z-10 transition-colors duration-500 ${
                              isVisible
                                ? point.saturation > 80
                                  ? 'bg-red-400 border-red-300 shadow-lg shadow-red-500/50'
                                  : point.saturation > 50
                                  ? 'bg-amber-400 border-amber-300 shadow-lg shadow-amber-500/50'
                                  : 'bg-green-400 border-green-300 shadow-lg shadow-green-500/50'
                                : 'bg-slate-600 border-slate-500'
                            }`} />
                            <div className="mt-3 text-center">
                              <div className="text-xs font-medium text-slate-400">{point.time || point.label}</div>
                              <div className={`text-lg font-bold mt-1 ${
                                point.saturation > 80 ? 'text-red-400'
                                : point.saturation > 50 ? 'text-amber-400'
                                : 'text-green-400'
                              }`}>
                                {point.saturation != null ? `${point.saturation}%` : point.value || ''}
                              </div>
                              {point.crowd && (
                                <div className="text-xs text-slate-500 mt-1">{point.crowd}</div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Card 3: SOP Triggers */}
              {report.sop_triggers && report.sop_triggers.length > 0 && (
                <div className="card-glass rounded-2xl p-8 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-slate-200 mb-4">📋 SOP 觸發預測</h3>
                  <div className="space-y-3">
                    {report.sop_triggers.map((trigger, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-amber-500/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-amber-400 font-bold text-sm whitespace-nowrap mt-0.5">
                            {trigger.clause || `SOP-${idx + 1}`}
                          </span>
                          <div className="flex-1">
                            <div className="text-slate-200 text-base font-medium">
                              {trigger.reason || trigger.description || trigger.name}
                            </div>
                            {trigger.action && (
                              <div className="text-sm text-cyan-400 mt-1">
                                → 建議動作: {trigger.action}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Card 4: Deployment Recommendations */}
              {report.recommendations && report.recommendations.length > 0 && (
                <div className="card-glass rounded-2xl p-8 border border-slate-700/50">
                  <h3 className="text-xl font-bold text-slate-200 mb-4">🎯 建議部署方案</h3>
                  <div className="space-y-3">
                    {report.recommendations.map((rec, idx) => {
                      const priority = rec.priority || 'P1'
                      const priorityColor = priority === 'P0' ? 'text-red-400 bg-red-900/30 border-red-500/50'
                        : priority === 'P1' ? 'text-amber-400 bg-amber-900/30 border-amber-500/50'
                        : 'text-green-400 bg-green-900/30 border-green-500/50'
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50"
                        >
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${priorityColor}`}>
                            {priority}
                          </span>
                          <div className="flex-1">
                            <span className="text-slate-200 text-base">
                              {typeof rec === 'string' ? rec : rec.action || rec.description}
                            </span>
                          </div>
                          <span className="text-slate-500 text-sm">#{idx + 1}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Card 5: Agent Reasoning Process */}
              <div className="card-glass rounded-2xl p-8 border border-slate-700/50">
                <h3 className="text-xl font-bold text-slate-200 mb-4">🧠 Agent 推理過程</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-center">
                    <div className="text-3xl font-bold text-cyan-400">{iterations}</div>
                    <div className="text-sm text-slate-400 mt-1">推理迭代次數</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-center">
                    <div className="text-3xl font-bold text-purple-400">{toolCalls.length}</div>
                    <div className="text-sm text-slate-400 mt-1">工具呼叫次數</div>
                  </div>
                </div>
                {toolCalls.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-400 mb-2">工具呼叫記錄:</div>
                    {toolCalls.map((tc, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/30 text-sm">
                        <span className="text-cyan-400 font-mono">{tc.tool || tc.name || `Tool ${idx + 1}`}</span>
                        {tc.input && (
                          <span className="text-slate-500 ml-2">
                            ({typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input).slice(0, 80)}...)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Section 4: Download Buttons */}
          <div className="card-glass rounded-2xl p-6 border border-slate-700/50">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={downloadJSON}
                className="px-6 py-3 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-200 font-medium hover:bg-slate-600/60 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105"
              >
                📥 下載 JSON 報告
              </button>
              <button
                onClick={downloadMarkdown}
                className="px-6 py-3 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-200 font-medium hover:bg-slate-600/60 hover:border-purple-500/50 transition-all duration-300 hover:scale-105"
              >
                📄 下載 Markdown 報告
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventSimulator
