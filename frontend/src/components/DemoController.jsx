import { useState, useEffect, useRef } from 'react'
import EventTimeline from './EventTimeline'

const DEMO_STAGES = [
  { id: 'dashboard', label: '動態監測', duration: 6000, description: '即時車流監測，飽和度異常偵測中...' },
  { id: 'incident', label: '突發事件', duration: 6000, description: '事件注入 → AI 自動分析替代路線' },
  { id: 'chat', label: '策略諮詢', duration: 5000, description: 'RAG 檢索 SOP，產出應變建議' },
  { id: 'decision', label: 'AI 決策', duration: 5000, description: '決策推理鏈完成，建議書產出' },
  { id: 'report', label: '多語通報', duration: 6000, description: '多語通報生成 → 全通路發送' },
]

function DemoController({ onTabChange, currentTab }) {
  const [demoRunning, setDemoRunning] = useState(false)
  const [demoStage, setDemoStage] = useState(-1)
  const [timelineRunning, setTimelineRunning] = useState(false)
  const [demoComplete, setDemoComplete] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const stageTimerRef = useRef(null)
  const countdownRef = useRef(null)

  useEffect(() => {
    return () => {
      clearTimeout(stageTimerRef.current)
      clearInterval(countdownRef.current)
    }
  }, [])

  function startDemo() {
    setDemoRunning(true)
    setDemoComplete(false)
    setDemoStage(0)
    setTimelineRunning(true)
    setCountdown(0)

    // 啟動全程倒數
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => prev + 1)
    }, 1000)

    // 切到第一個 tab
    onTabChange(DEMO_STAGES[0].id)
    advanceStage(0)
  }

  function advanceStage(current) {
    if (current >= DEMO_STAGES.length - 1) {
      // Demo 完成
      stageTimerRef.current = setTimeout(() => {
        setDemoRunning(false)
        setDemoComplete(true)
        clearInterval(countdownRef.current)
      }, DEMO_STAGES[current].duration)
      return
    }

    stageTimerRef.current = setTimeout(() => {
      const next = current + 1
      setDemoStage(next)
      onTabChange(DEMO_STAGES[next].id)
      advanceStage(next)
    }, DEMO_STAGES[current].duration)
  }

  function stopDemo() {
    clearTimeout(stageTimerRef.current)
    clearInterval(countdownRef.current)
    setDemoRunning(false)
    setTimelineRunning(false)
    setDemoStage(-1)
    setCountdown(0)
  }

  function resetDemo() {
    setDemoComplete(false)
    setDemoStage(-1)
    setCountdown(0)
    setTimelineRunning(false)
    onTabChange('dashboard')
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">🎬 一鍵 Demo 模式</h2>
            <p className="text-sm text-slate-400 mt-1">
              自動展示完整 SOP 應變流程，60 秒內完成
            </p>
          </div>
          {demoRunning && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              <span className="text-2xl font-mono font-bold text-blue-400">
                {formatTime(countdown)}
              </span>
            </div>
          )}
          {demoComplete && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
              <span className="text-2xl font-mono font-bold text-green-400">
                ✅ {formatTime(countdown)}
              </span>
            </div>
          )}
        </div>

        {/* 控制按鈕 */}
        <div className="flex gap-3 mb-6">
          {!demoRunning && !demoComplete && (
            <button
              onClick={startDemo}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
            >
              ▶ 啟動 Demo
            </button>
          )}
          {demoRunning && (
            <button
              onClick={stopDemo}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all"
            >
              ⏹ 停止
            </button>
          )}
          {demoComplete && (
            <>
              <button
                onClick={startDemo}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/30 transition-all"
              >
                🔄 再跑一次
              </button>
              <button
                onClick={resetDemo}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all"
              >
                重置
              </button>
            </>
          )}
        </div>

        {/* 階段進度指示器 */}
        <div className="flex gap-1">
          {DEMO_STAGES.map((stage, i) => {
            const isActive = i === demoStage
            const isDone = i < demoStage || demoComplete
            return (
              <div key={stage.id} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${
                  isActive
                    ? 'bg-blue-500 animate-pulse'
                    : isDone
                    ? 'bg-green-500'
                    : 'bg-slate-600'
                }`}></div>
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${
                    isActive ? 'text-blue-400' : isDone ? 'text-green-400' : 'text-slate-500'
                  }`}>
                    {isActive ? '●' : isDone ? '✓' : '○'} {stage.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* 當前階段描述 */}
        {demoRunning && demoStage >= 0 && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-300">
              <span className="font-medium">目前階段：</span>
              {DEMO_STAGES[demoStage].description}
            </p>
          </div>
        )}
      </div>

      {/* 事件時間線 */}
      <EventTimeline
        isRunning={timelineRunning}
        onComplete={() => {}}
      />

      {/* 說明卡 */}
      {!demoRunning && !demoComplete && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-3">📋 Demo 展示流程</h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {DEMO_STAGES.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-2">
                <span className="text-xs w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs text-white">{stage.label}</p>
                  <p className="text-xs text-slate-500">{stage.duration / 1000}s</p>
                </div>
                {i < DEMO_STAGES.length - 1 && (
                  <span className="text-slate-600 hidden sm:inline">→</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            總時長約 28 秒 ｜ 系統將自動切換各功能頁面 ｜ 時間線同步展示 SOP 處理步驟
          </p>
        </div>
      )}
    </div>
  )
}

export default DemoController
