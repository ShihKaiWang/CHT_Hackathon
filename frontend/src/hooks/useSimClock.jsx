import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const SimClockContext = createContext(null)

// 資料中的所有時間點（從後端取得後設定）
const DEFAULT_TIMESTAMPS = [
  '17:00', '18:00', '19:00', '20:00', '21:00',
  '21:15', '21:30', '21:45', '22:00', '22:10',
  '22:15', '22:20', '22:30', '22:45', '23:00', '23:15',
]

// 事件觸發時間
const INCIDENT_TIMES = [
  { time: '22:10', eventId: 'TPE_2026_ACC_001', message: '🚨 光復南路路面塌陷！三車連環追撞，南下全線封鎖' },
  { time: '22:20', eventId: 'TPE_2026_EVT_002', message: '🚨 捷運國父紀念館站人群推擠，救護車佔用車道' },
  { time: '22:30', eventId: 'TPE_2026_EVT_003', message: '⚠️ 信義威秀周邊號誌故障，需人工指揮' },
]

export function SimClockProvider({ children }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(3000) // 每 X 毫秒推進一格
  const [timestamps, setTimestamps] = useState(DEFAULT_TIMESTAMPS)
  const [triggeredEvents, setTriggeredEvents] = useState([])
  const timerRef = useRef(null)
  const onEventCallbackRef = useRef(null)

  const currentTime = timestamps[currentIndex] || '17:00'

  // 自動推進
  useEffect(() => {
    if (!isRunning) {
      clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1
        if (next >= timestamps.length) {
          setIsRunning(false)
          return prev
        }
        return next
      })
    }, speed)

    return () => clearInterval(timerRef.current)
  }, [isRunning, speed, timestamps.length])

  // 檢查是否有事件該觸發
  useEffect(() => {
    INCIDENT_TIMES.forEach((event) => {
      if (currentTime >= event.time && !triggeredEvents.includes(event.eventId)) {
        setTriggeredEvents((prev) => [...prev, event.eventId])
        if (onEventCallbackRef.current) {
          onEventCallbackRef.current(event)
        }
      }
    })
  }, [currentTime, triggeredEvents])

  const start = useCallback(() => setIsRunning(true), [])
  const pause = useCallback(() => setIsRunning(false), [])
  const reset = useCallback(() => {
    setIsRunning(false)
    setCurrentIndex(0)
    setTriggeredEvents([])
  }, [])
  const jumpTo = useCallback((index) => {
    setCurrentIndex(Math.max(0, Math.min(index, timestamps.length - 1)))
  }, [timestamps.length])

  const setOnEvent = useCallback((cb) => {
    onEventCallbackRef.current = cb
  }, [])

  const value = {
    currentTime,
    currentIndex,
    timestamps,
    isRunning,
    speed,
    triggeredEvents,
    progress: timestamps.length > 1 ? currentIndex / (timestamps.length - 1) : 0,
    start,
    pause,
    reset,
    jumpTo,
    setSpeed,
    setTimestamps,
    setOnEvent,
  }

  return (
    <SimClockContext.Provider value={value}>
      {children}
    </SimClockContext.Provider>
  )
}

export function useSimClock() {
  const context = useContext(SimClockContext)
  if (!context) throw new Error('useSimClock must be used within SimClockProvider')
  return context
}

export default useSimClock
