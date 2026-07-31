import { useSimClock } from '../hooks/useSimClock.jsx'

function SimClockBar() {
  const {
    currentTime,
    currentIndex,
    timestamps,
    isRunning,
    speed,
    progress,
    triggeredEvents,
    start,
    pause,
    reset,
    jumpTo,
    setSpeed,
  } = useSimClock()

  const SPEEDS = [
    { label: '1x', value: 5000 },
    { label: '2x', value: 3000 },
    { label: '5x', value: 1500 },
    { label: '10x', value: 800 },
  ]

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700/50 px-4 py-2">
      <div className="flex items-center gap-3">
        {/* 播放控制 */}
        <div className="flex items-center gap-1">
          <button
            onClick={isRunning ? pause : start}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              isRunning ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
            }`}
          >
            {isRunning ? '⏸' : '▶'}
          </button>
          <button
            onClick={reset}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            ⏮
          </button>
        </div>

        {/* 模擬時鐘 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">模擬時間：</span>
          <span className="text-sm font-mono font-bold text-white bg-slate-700 px-2 py-0.5 rounded">
            2026-05-20 {currentTime}
          </span>
          {isRunning && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>}
        </div>

        {/* 進度條 */}
        <div className="flex-1 mx-3">
          <div className="relative">
            <input
              type="range"
              min={0}
              max={timestamps.length - 1}
              value={currentIndex}
              onChange={(e) => jumpTo(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
            />
            {/* 事件標記 */}
            <div className="absolute top-3 left-0 right-0 flex justify-between pointer-events-none">
              {timestamps.map((ts, i) => {
                const hasEvent = ['22:10', '22:20', '22:30'].includes(ts)
                if (!hasEvent) return null
                const left = (i / (timestamps.length - 1)) * 100
                return (
                  <div key={ts} className="absolute" style={{ left: `${left}%` }}>
                    <span className="text-xs text-red-400">▲</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-xs text-slate-600">{timestamps[0]}</span>
            <span className="text-xs text-slate-600">{timestamps[timestamps.length - 1]}</span>
          </div>
        </div>

        {/* 速度控制 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">速度：</span>
          {SPEEDS.map((s) => (
            <button
              key={s.label}
              onClick={() => setSpeed(s.value)}
              className={`px-2 py-0.5 rounded text-xs transition-all ${
                speed === s.value ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 事件數 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">事件：</span>
          <span className={`text-xs font-bold ${triggeredEvents.length > 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {triggeredEvents.length}/3
          </span>
        </div>
      </div>
    </div>
  )
}

export default SimClockBar
