import { useState, useEffect, useRef } from 'react'

const TIMELINE_EVENTS = [
  {
    id: 1,
    time: '00:00',
    icon: '⚠️',
    label: '偵測異常',
    detail: '忠孝東路四段飽和度達 92%，超出 SOP 閾值',
    color: 'red',
  },
  {
    id: 2,
    time: '00:05',
    icon: '🔍',
    label: 'SOP 匹配',
    detail: '匹配 SOP 第 2 條：飽和度 ≥ 90% 啟動疏導機制',
    color: 'blue',
  },
  {
    id: 3,
    time: '00:12',
    icon: '🧠',
    label: 'AI 路網分析',
    detail: '計算最優替代路徑 2 條（ETE 12/15 分鐘）',
    color: 'purple',
  },
  {
    id: 4,
    time: '00:18',
    icon: '🚦',
    label: '號誌調整',
    detail: '產出 2 路口號誌配時建議（綠燈延長/左轉相位）',
    color: 'amber',
  },
  {
    id: 5,
    time: '00:25',
    icon: '📡',
    label: '漫遊率偵測',
    detail: '漫遊率 35%，觸發多語通報（SOP 第 6 條）',
    color: 'cyan',
  },
  {
    id: 6,
    time: '00:30',
    icon: '🌐',
    label: '多語生成',
    detail: '自動產出中/英/日/韓四語通報內容',
    color: 'green',
  },
  {
    id: 7,
    time: '00:35',
    icon: '📤',
    label: '全通路發送',
    detail: 'CBS + SMS + 電子看板 + APP 同步推播',
    color: 'indigo',
  },
  {
    id: 8,
    time: '00:42',
    icon: '📄',
    label: '建議書產出',
    detail: '交控中心建議書生成完成（含完整決策鏈）',
    color: 'blue',
  },
  {
    id: 9,
    time: '00:45',
    icon: '✅',
    label: '應變完成',
    detail: '全程耗時 45 秒，所有管道確認送達',
    color: 'green',
  },
]

const COLOR_MAP = {
  red: { bg: 'bg-red-500', ring: 'ring-red-500/30', text: 'text-red-400', glow: 'shadow-red-500/50' },
  blue: { bg: 'bg-blue-500', ring: 'ring-blue-500/30', text: 'text-blue-400', glow: 'shadow-blue-500/50' },
  purple: { bg: 'bg-purple-500', ring: 'ring-purple-500/30', text: 'text-purple-400', glow: 'shadow-purple-500/50' },
  amber: { bg: 'bg-amber-500', ring: 'ring-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/50' },
  cyan: { bg: 'bg-cyan-500', ring: 'ring-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/50' },
  green: { bg: 'bg-green-500', ring: 'ring-green-500/30', text: 'text-green-400', glow: 'shadow-green-500/50' },
  indigo: { bg: 'bg-indigo-500', ring: 'ring-indigo-500/30', text: 'text-indigo-400', glow: 'shadow-indigo-500/50' },
}

function EventTimeline({ isRunning = false, onComplete }) {
  const [activeStep, setActiveStep] = useState(-1)
  const [elapsedSec, setElapsedSec] = useState(0)
  const timerRef = useRef(null)
  const stepTimerRef = useRef(null)

  // 倒數計時
  useEffect(() => {
    if (isRunning && activeStep === -1) {
      startTimeline()
    }
    if (!isRunning) {
      resetTimeline()
    }
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(stepTimerRef.current)
    }
  }, [isRunning])

  function startTimeline() {
    setActiveStep(0)
    setElapsedSec(0)

    // 每秒更新計時器
    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1)
    }, 1000)

    // 逐步推進時間線
    advanceSteps(0)
  }

  function advanceSteps(currentStep) {
    if (currentStep >= TIMELINE_EVENTS.length - 1) {
      // 完成
      clearInterval(timerRef.current)
      if (onComplete) onComplete()
      return
    }

    stepTimerRef.current = setTimeout(() => {
      const nextStep = currentStep + 1
      setActiveStep(nextStep)
      advanceSteps(nextStep)
    }, 3000) // 每步間隔 3 秒
  }

  function resetTimeline() {
    clearInterval(timerRef.current)
    clearTimeout(stepTimerRef.current)
    setActiveStep(-1)
    setElapsedSec(0)
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const isComplete = activeStep === TIMELINE_EVENTS.length - 1

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      {/* Header + 倒數計時 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">⏱️ 應變時間線</h2>
        <div className="flex items-center gap-3">
          {isRunning && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              isComplete ? 'bg-green-500/20 border border-green-500/30' : 'bg-blue-500/20 border border-blue-500/30'
            }`}>
              {!isComplete && (
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              )}
              <span className={`text-lg font-mono font-bold ${isComplete ? 'text-green-400' : 'text-blue-400'}`}>
                {formatTime(elapsedSec)}
              </span>
            </div>
          )}
          {isComplete && (
            <span className="text-sm text-green-400 font-medium animate-pulse">
              ✅ 45 秒內完成！
            </span>
          )}
          {!isRunning && activeStep === -1 && (
            <span className="text-xs text-slate-400">等待啟動...</span>
          )}
        </div>
      </div>

      {/* 60 秒進度條 */}
      {isRunning && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>0 秒</span>
            <span className="text-amber-400">目標：60 秒內</span>
            <span>60 秒</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                elapsedSec > 50 ? 'bg-red-500' : elapsedSec > 30 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((elapsedSec / 60) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 時間線 */}
      <div className="space-y-1">
        {TIMELINE_EVENTS.map((event, i) => {
          const colors = COLOR_MAP[event.color]
          const isActive = i === activeStep
          const isDone = i < activeStep
          const isPending = i > activeStep

          return (
            <div
              key={event.id}
              className={`flex gap-4 transition-all duration-500 ${
                isPending && isRunning ? 'opacity-30' : 'opacity-100'
              }`}
            >
              {/* 左側時間 + 連接線 */}
              <div className="flex flex-col items-center w-14">
                <span className={`text-xs font-mono ${isDone || isActive ? colors.text : 'text-slate-500'}`}>
                  {event.time}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-1 transition-all duration-300 ${
                  isActive
                    ? `${colors.bg} ring-4 ${colors.ring} shadow-lg ${colors.glow} scale-110`
                    : isDone
                    ? `${colors.bg} opacity-80`
                    : 'bg-slate-600'
                }`}>
                  <span className="text-sm">{isDone || isActive ? event.icon : '○'}</span>
                </div>
                {i < TIMELINE_EVENTS.length - 1 && (
                  <div className={`w-0.5 h-6 mt-1 transition-colors duration-300 ${
                    isDone ? 'bg-green-500/50' : 'bg-slate-600'
                  }`}></div>
                )}
              </div>

              {/* 右側內容 */}
              <div className={`flex-1 pb-3 pt-0.5 transition-all duration-300 ${
                isActive ? 'translate-x-1' : ''
              }`}>
                <p className={`text-sm font-medium ${
                  isActive ? 'text-white' : isDone ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {event.label}
                </p>
                <p className={`text-xs mt-0.5 ${
                  isActive ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {event.detail}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EventTimeline
