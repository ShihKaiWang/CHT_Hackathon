import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

const TOAST_STYLES = {
  critical: {
    container: 'border-red-500 bg-red-500/10 shadow-red-500/20',
    icon: '🚨',
    badge: 'bg-red-500',
    text: 'text-red-400',
  },
  warning: {
    container: 'border-amber-500 bg-amber-500/10 shadow-amber-500/20',
    icon: '⚠️',
    badge: 'bg-amber-500',
    text: 'text-amber-400',
  },
  success: {
    container: 'border-green-500 bg-green-500/10 shadow-green-500/20',
    icon: '✅',
    badge: 'bg-green-500',
    text: 'text-green-400',
  },
  info: {
    container: 'border-blue-500 bg-blue-500/10 shadow-blue-500/20',
    icon: 'ℹ️',
    badge: 'bg-blue-500',
    text: 'text-blue-400',
  },
}

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const addToast = useCallback((message, level = 'info', duration = 5000) => {
    const id = ++toastId
    const toast = { id, message, level, entering: true }
    setToasts((prev) => [toast, ...prev].slice(0, 5)) // 最多顯示 5 個

    // 入場動畫
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, entering: false } : t)))
    }, 50)

    // 自動移除
    timersRef.current[id] = setTimeout(() => {
      removeToast(id)
    }, duration)

    return id
  }, [])

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id])
    // 先標記退出
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    // 退場後移除
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Toast 容器 - 固定右上角 */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.level] || TOAST_STYLES.info
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto border rounded-lg p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ${style.container} ${
                toast.entering
                  ? 'translate-x-full opacity-0'
                  : toast.exiting
                  ? 'translate-x-full opacity-0'
                  : 'translate-x-0 opacity-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium leading-snug">{toast.message}</p>
                  <p className={`text-xs mt-1 ${style.text}`}>
                    {new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-white flex-shrink-0 transition-colors"
                >
                  ✕
                </button>
              </div>
              {/* 自動消失進度條 */}
              <div className="mt-2 w-full h-0.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${style.badge} rounded-full`}
                  style={{
                    animation: `shrink 5s linear forwards`,
                  }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>

      {/* CSS 動畫 */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export default ToastProvider
