import { useState, useEffect } from 'react'
import { useCountUp } from '../hooks/useCountUp'

// 模擬 ETE 計算參數
const ETE_PARAMS = {
  base_clearance_time: 20, // 基礎清除時間（分鐘）
  severity_factor: 1.5,    // 嚴重度因子（A 級 = 1.5, B 級 = 1.0）
  signal_delay: 5,         // 號誌調整增加延遲（分鐘）
  detour_factor: 1.2,      // 替代路線繞行因子
  weather_factor: 1.0,     // 天氣因子（正常 = 1.0）
}

const EXCLUDED_ROUTES = [
  {
    name: '基隆路一段',
    reason: '飽和度 94% > 閾值 85%',
    saturation: 0.94,
    capacity: 1800,
    current_flow: 1692,
  },
  {
    name: '光復南路',
    reason: '承載餘量不足（剩餘 < 200 車/時）',
    saturation: 0.89,
    capacity: 1500,
    current_flow: 1335,
  },
  {
    name: '松仁路',
    reason: '施工佔道（live_incidents 事件 #3）',
    saturation: 0.72,
    capacity: 1200,
    current_flow: 864,
    blocked: true,
  },
]

const SELECTED_ROUTES = [
  {
    name: '仁愛路四段',
    saturation: 0.58,
    capacity: 2200,
    ete: 12,
    reason: '飽和度 58%，餘量 924 車/時，距事故點最近',
  },
  {
    name: '市民大道四段',
    saturation: 0.62,
    capacity: 2500,
    ete: 15,
    reason: '飽和度 62%，餘量 950 車/時，雙向六車道容量大',
  },
]

function AnimatedValue({ value, suffix = '', decimals = 0, className = '' }) {
  const { formattedValue } = useCountUp(value, { duration: 800, decimals })
  return <span className={className}>{formattedValue}{suffix}</span>
}

function ETECalculation() {
  const [step, setStep] = useState(0)
  const [autoPlay, setAutoPlay] = useState(false)

  useEffect(() => {
    if (!autoPlay) return
    if (step >= 4) {
      setAutoPlay(false)
      return
    }
    const timer = setTimeout(() => setStep((s) => s + 1), 2000)
    return () => clearTimeout(timer)
  }, [step, autoPlay])

  function startAnimation() {
    setStep(0)
    setAutoPlay(true)
  }

  const ete_result = ETE_PARAMS.base_clearance_time * ETE_PARAMS.severity_factor + ETE_PARAMS.signal_delay

  return (
    <div className="space-y-6">
      {/* ETE 公式推導 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">📐 ETE 計算推導（SOP 第 7 條）</h2>
          <button
            onClick={startAnimation}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
          >
            ▶ 重新演算
          </button>
        </div>

        {/* 公式 */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4">
          <p className="text-xs text-slate-400 mb-2">ETE 計算公式（依 SOP 第 7 條）：</p>
          <p className="text-base text-white font-mono">
            ETE = Base_Time × Severity_Factor + Signal_Delay
          </p>
        </div>

        {/* 步驟演算 */}
        <div className="space-y-3">
          {/* Step 1: 代入基礎時間 */}
          <div className={`p-3 rounded-lg border transition-all duration-500 ${
            step >= 0 ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 bg-slate-700/30 opacity-40'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center">1</span>
              <span className="text-sm text-white font-medium">基礎清除時間（Base_Time）</span>
            </div>
            <p className="text-xs text-slate-400 ml-7">
              依事故類型「路面塌陷」查表 →{' '}
              <span className="text-blue-400 font-mono">{ETE_PARAMS.base_clearance_time} 分鐘</span>
            </p>
          </div>

          {/* Step 2: 嚴重度因子 */}
          <div className={`p-3 rounded-lg border transition-all duration-500 ${
            step >= 1 ? 'border-purple-500/50 bg-purple-500/5' : 'border-slate-700 bg-slate-700/30 opacity-40'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center">2</span>
              <span className="text-sm text-white font-medium">嚴重度因子（Severity_Factor）</span>
            </div>
            <p className="text-xs text-slate-400 ml-7">
              事故判定為 <span className="text-red-400 font-medium">A 級</span>（飽和度 &gt; 90% 且影響 ≥ 3 路段）→{' '}
              <span className="text-purple-400 font-mono">×{ETE_PARAMS.severity_factor}</span>
            </p>
          </div>

          {/* Step 3: 號誌延遲 */}
          <div className={`p-3 rounded-lg border transition-all duration-500 ${
            step >= 2 ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700 bg-slate-700/30 opacity-40'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center">3</span>
              <span className="text-sm text-white font-medium">號誌調整延遲（Signal_Delay）</span>
            </div>
            <p className="text-xs text-slate-400 ml-7">
              涉及 2 路口號誌重配時 →{' '}
              <span className="text-amber-400 font-mono">+{ETE_PARAMS.signal_delay} 分鐘</span>
            </p>
          </div>

          {/* Step 4: 計算結果 */}
          <div className={`p-3 rounded-lg border transition-all duration-500 ${
            step >= 3 ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 bg-slate-700/30 opacity-40'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center">4</span>
              <span className="text-sm text-white font-medium">計算結果</span>
            </div>
            <div className="ml-7">
              <p className="text-sm text-slate-300 font-mono">
                ETE = {ETE_PARAMS.base_clearance_time} × {ETE_PARAMS.severity_factor} + {ETE_PARAMS.signal_delay}
              </p>
              <p className="text-lg text-green-400 font-bold font-mono mt-1">
                = <AnimatedValue value={ete_result} className="text-green-400" /> 分鐘
              </p>
              <p className="text-xs text-slate-400 mt-1">
                預計恢復時間：{new Date(Date.now() + ete_result * 60000).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Step 5: 分級依據 */}
          <div className={`p-3 rounded-lg border transition-all duration-500 ${
            step >= 4 ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700 bg-slate-700/30 opacity-40'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center justify-center">5</span>
              <span className="text-sm text-white font-medium">A 級判定依據</span>
            </div>
            <div className="ml-7 text-xs text-slate-400 space-y-1">
              <p>• 忠孝東路四段飽和度 <span className="text-red-400">92%</span> &gt; 90%（SOP 閾值）</p>
              <p>• 影響路段數 <span className="text-red-400">3 段</span> ≥ 3（A 級門檻）</p>
              <p>• 事故類型：路面塌陷（完全阻斷）</p>
            </div>
          </div>
        </div>
      </div>

      {/* 排除路線理由 */}
      <div className="card-glass rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">🚫 排除路線分析</h2>
        <p className="text-xs text-slate-400 mb-4">
          以下路線因飽和度超標或事件影響而被 AI 排除於替代建議之外：
        </p>
        <div className="space-y-3">
          {EXCLUDED_ROUTES.map((route) => (
            <div key={route.name} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{route.name}</span>
                <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">已排除</span>
              </div>
              <p className="text-xs text-red-300 mb-2">❌ {route.reason}</p>
              <div className="flex gap-4 text-xs text-slate-400">
                <span>飽和度：<span className="text-red-400">{(route.saturation * 100).toFixed(0)}%</span></span>
                <span>車流：{route.current_flow}/{route.capacity}</span>
                <span>餘量：<span className={route.capacity - route.current_flow < 200 ? 'text-red-400' : ''}>{route.capacity - route.current_flow} 車/時</span></span>
              </div>
              {/* 飽和度長條 */}
              <div className="mt-2 w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${route.saturation * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 選用路線 */}
      <div className="card-glass rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">✅ 最優替代路線</h2>
        <div className="space-y-3">
          {SELECTED_ROUTES.map((route, i) => (
            <div key={route.name} className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-white">{route.name}</span>
                </div>
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                  ETE {route.ete} 分鐘
                </span>
              </div>
              <p className="text-xs text-green-300 mb-2">✓ {route.reason}</p>
              <div className="flex gap-4 text-xs text-slate-400">
                <span>飽和度：<span className="text-green-400">{(route.saturation * 100).toFixed(0)}%</span></span>
                <span>容量：{route.capacity} 車/時</span>
                <span>餘量：<span className="text-green-400">{Math.floor(route.capacity * (1 - route.saturation))} 車/時</span></span>
              </div>
              <div className="mt-2 w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${route.saturation * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ETECalculation
