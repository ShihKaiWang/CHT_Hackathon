import { useState, useEffect, useRef } from 'react'

/**
 * 數字跳動動畫 Hook
 * @param {number} target - 目標數值
 * @param {object} options - 設定選項
 * @param {number} options.duration - 動畫時長 (ms)，預設 1500
 * @param {number} options.decimals - 小數位數，預設 0
 * @param {boolean} options.startOnMount - 是否掛載時自動啟動，預設 true
 * @param {string} options.easing - 緩動函數，預設 'easeOut'
 * @returns {{ value: number, formattedValue: string, isAnimating: boolean, start: () => void, reset: () => void }}
 */
export function useCountUp(target, options = {}) {
  const {
    duration = 1500,
    decimals = 0,
    startOnMount = true,
    easing = 'easeOut',
  } = options

  const [value, setValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const rafRef = useRef(null)
  const startTimeRef = useRef(null)
  const prevTargetRef = useRef(0)

  const easingFns = {
    linear: (t) => t,
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeIn: (t) => Math.pow(t, 3),
    easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  }

  function animate(timestamp) {
    if (!startTimeRef.current) startTimeRef.current = timestamp
    const elapsed = timestamp - startTimeRef.current
    const progress = Math.min(elapsed / duration, 1)

    const easeFn = easingFns[easing] || easingFns.easeOut
    const easedProgress = easeFn(progress)

    const from = prevTargetRef.current
    const current = from + (target - from) * easedProgress
    setValue(current)

    if (progress < 1) {
      rafRef.current = requestAnimationFrame(animate)
    } else {
      setValue(target)
      setIsAnimating(false)
      prevTargetRef.current = target
    }
  }

  function start() {
    cancelAnimationFrame(rafRef.current)
    startTimeRef.current = null
    setIsAnimating(true)
    rafRef.current = requestAnimationFrame(animate)
  }

  function reset() {
    cancelAnimationFrame(rafRef.current)
    setValue(0)
    prevTargetRef.current = 0
    setIsAnimating(false)
  }

  useEffect(() => {
    if (startOnMount) {
      start()
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [target])

  const formattedValue = decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toLocaleString()

  return { value, formattedValue, isAnimating, start, reset }
}

/**
 * 百分比動畫 Hook（方便飽和度等顯示）
 */
export function useCountUpPercent(target, options = {}) {
  const { duration = 1200, ...rest } = options
  return useCountUp(target * 100, { duration, decimals: 0, ...rest })
}

export default useCountUp
