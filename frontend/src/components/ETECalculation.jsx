import { useState, useEffect } from 'react'

function ETECalculation({ incidentResult }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [autoPlay, setAutoPlay] = useState(false)

  useEffect(() => {
    fetchETE()
  }, [])

  useEffect(() => {
    if (!autoPlay) return
    if (step >= 4) {
      setAutoPlay(false)
      return
    }
    const timer = setTimeout(() => setStep((s) => s + 1), 1500)
    return () => clearTimeout(timer)
  }, [step, autoPlay])

  async function fetchETE() {
    setLoading(true)
    try {
      if (incidentResult && incidentResult.ete) {
        const ete = incidentResult.ete
        const severity = incidentResult.severity || 'Critical'
        const desc = incidentResult.agent_structured?.situation?.description || incidentResult.event || ''
        const level = incidentResult.level || (ete.avg_saturation >= 0.95 ? 'A' : ete.avg_saturation >= 0.85 ? 'B' : 'normal')
        setData({
          ete: ete,
          level: level,
          severity: severity,
          incident_desc: desc,
          excluded_roads: [],
          selected_roads: (incidentResult.alternative_routes || []).slice(0, 3).map((r, i) => ({
            id: `alt-${i}`, name: r.path || r.name || '', saturation: r.saturation || 0.6
          })),
        })
      } else {
        const res = await fetch('/api/dashboard/ete')
        const json = await res.json()
        setData(json)
      }
      setStep(0)
      setAutoPlay(true)
    } catch (err) {
      console.error('ETE fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="card-glass rounded-lg p-6 animate-pulse">
        <div className="h-48 bg-slate-700 rounded"></div>
      </div>
    )
  }

  const { ete, level, severity, incident_desc, excluded_roads, selected_roads, llm_explanation } = data

  return (
    <div className="space-y-6">
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">📐 ETE 計算推導（SOP 第 7 條）</h2>
          <div className="flex gap-2">
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded">
              程式即時運算
            </span>
            <button onClick={fetchETE} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors">
              ▶ 重新演算
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4">
          <p className="text-xs text-slate-400 mb-2">ETE 計算公式（依 SOP 第 7 條）：</p>
          <p className="text-base text-white font-mono">ETE = Base_Clearance + Congestion_Penalty</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">其中 Congestion_Penalty = max(0, (Avg_Saturation - 0.5) × 60)</p>
        </div>

        <div className="space-y-3">
          <div className={`p-3 rounded-lg border transition-all duration-500 ${step >= 0 ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 bg-slate-700/30 opacity-40'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center">1</span>
              <span className="text-sm text-white font-medium">基礎清除時間（Base_Clearance）</span>
            </div>
            <p className="text-xs text-slate-400 ml-7">
              嚴重度 <span className="text-red-400 font-medium">{severity}</span> → 查表得 <span className="text-blue-400 font-mono font-bold">{ete.base_clearance} 分鐘</span>
            </p>
          </div>

          <div className={`p-3 rounded-lg border transition-all duration-500 ${step >= 1 ? 'border-purple-500/50 bg-purple-500/5' : 'border-slate-700 bg-slate-700/30 opacity-40'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center">2</span>
              <span className="text-sm text-white font-medium">平均飽和度（Avg_Saturation）</span>
            </div>
            <p className="text-xs text-slate-400 ml-7">
              受影響路段即時平均 = <span className="text-purple-400 font-mono font-bold">{(ete.avg_saturation * 100).toFixed(1)}%</span>
            </p>
          </div>

          <div className={`p-3 rounded-lg border transition-all duration-500 ${step >= 2 ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700 bg-slate-700/30 opacity-40'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center">3</span>
              <span className="text-sm text-white font-medium">壅塞懲罰（Congestion_Penalty）</span>
            </div>
            <p className="text-xs text-slate-400 ml-7">
              max(0, ({ete.avg_saturation.toFixed(2)} - 0.5) × 60) = <span className="text-amber-400 font-mono font-bold">+{ete.congestion_penalty} 分鐘</span>
            </p>
          </div>

          <div className={`p-3 rounded-lg border transition-all duration-500 ${step >= 3 ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 bg-slate-700/30 opacity-40'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center">4</span>
              <span className="text-sm text-white font-medium">計算結果</span>
            </div>
            <div className="ml-7">
              <p className="text-sm text-slate-300 font-mono">{ete.formula}</p>
              <p className="text-2xl text-green-400 font-bold font-mono mt-1">ETE = {ete.ete_minutes} 分鐘</p>
            </div>
          </div>

          <div className={`p-3 rounded-lg border transition-all duration-500 ${step >= 4 ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700 bg-slate-700/30 opacity-40'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center justify-center">5</span>
              <span className="text-sm text-white font-medium">{level} 級判定依據</span>
            </div>
            <div className="ml-7 text-xs text-slate-400 space-y-1">
              <p>• 事件：{incident_desc}</p>
              <p>• 嚴重度：<span className="text-red-400">{severity}</span></p>
              <p>• 平均飽和度：<span className="text-red-400">{(ete.avg_saturation * 100).toFixed(1)}%</span>
                {ete.avg_saturation >= 0.95 ? ' ≥ 95%（A 級）' : ete.avg_saturation >= 0.85 ? ' ≥ 85%（B 級）' : ''}
              </p>
            </div>
          </div>
        </div>

        {llm_explanation && (
          <div className="mt-4 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🤖</span>
              <span className="text-xs text-cyan-400 font-medium">AI Agent 解釋（LLM 生成）</span>
            </div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{llm_explanation}</p>
          </div>
        )}
      </div>

      {excluded_roads && excluded_roads.length > 0 && (
        <div className="card-glass rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">🚫 排除路線分析</h2>
          <p className="text-xs text-slate-400 mb-4">以下路線因飽和度超標（≥ 85%）被程式排除：</p>
          <div className="space-y-3">
            {excluded_roads.map((route) => (
              <div key={route.id} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{route.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                    飽和度 {(route.saturation * 100).toFixed(0)}% — 已排除
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${route.saturation * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected_roads && selected_roads.length > 0 && (
        <div className="card-glass rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">✅ 可用替代路線</h2>
          <div className="space-y-3">
            {selected_roads.map((route, i) => (
              <div key={route.id} className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                    <span className="text-sm font-medium text-white">{route.name}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                    飽和度 {(route.saturation * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${route.saturation * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ETECalculation
