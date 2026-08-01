import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { callSmartApp } from '../services/api'

const RISK_CONFIG = {
  congestion: { icon: '🚗', label: '塞車風險', color: '#f59e0b' },
  accident: { icon: '💥', label: '車禍風險', color: '#ef4444' },
  flood: { icon: '🌊', label: '積水風險', color: '#3b82f6' },
  fallen_tree: { icon: '🌳', label: '行道樹倒塌', color: '#22c55e' },
  underpass_flood: { icon: '🚇', label: '地下道積水', color: '#8b5cf6' },
}

const LEVEL_CONFIG = {
  high: { color: '#ef4444', size: 14, label: '高風險' },
  medium: { color: '#f59e0b', size: 11, label: '中風險' },
  low: { color: '#22c55e', size: 8, label: '低風險' },
}

const MAP_CENTER = [25.0405, 121.5510]

function FlyToRisk({ risks }) {
  const map = useMap()
  useEffect(() => {
    if (risks.length > 0) {
      const highRisk = risks.find((r) => r.level === 'high')
      if (highRisk && highRisk.lat && highRisk.lng) {
        map.flyTo([highRisk.lat, highRisk.lng], 15, { duration: 1.5 })
      }
    }
  }, [risks, map])
  return null
}

function RiskPredictionMap() {
  const [risks, setRisks] = useState([])
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [toolCalls, setToolCalls] = useState([])
  const [iterations, setIterations] = useState(0)
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    fetchWeatherAndAnalyze()
  }, [])

  async function fetchWeatherAndAnalyze() {
    setLoading(true)
    try {
      const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=25.033&longitude=121.565&current=temperature_2m,rain,weather_code,wind_speed_10m,visibility&timezone=Asia%2FTaipei')
      const weatherData = await weatherRes.json()
      const current = weatherData.current
      setWeather(current)

      const res = await callSmartApp('risk_prediction', {
        weather: current.weather_code <= 3 ? '晴天' : current.weather_code <= 65 ? '下雨' : '惡劣天氣',
        rain_mm: current.rain || 0,
        wind_kmh: current.wind_speed_10m || 0,
        visibility_km: (current.visibility || 10000) / 1000,
      })

      if (res?.structured?.risks) {
        setRisks(res.structured.risks)
        setSummary(res.structured.summary || '')
      } else if (res?.risks) {
        setRisks(res.risks)
        setSummary(res.summary || '')
      }
      setToolCalls(res?.tool_calls || [])
      setIterations(res?.iterations || 0)
    } catch (err) {
      console.error('Risk prediction error:', err)
    } finally {
      setLoading(false)
    }
  }

  const highCount = risks.filter((r) => r.level === 'high').length
  const mediumCount = risks.filter((r) => r.level === 'medium').length

  return (
    <div className="space-y-6">
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">🔮 AI 風險預判地圖</h2>
            <p className="text-sm text-slate-400 mt-1">AI Agent 結合路網飽和度 + 即時天氣 + SOP 規則，預判各路段潛在風險</p>
          </div>
          <button onClick={fetchWeatherAndAnalyze} disabled={loading} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
            {loading ? <span className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></span> : <span>🤖</span>}
            {loading ? '分析中...' : '重新分析'}
          </button>
        </div>

        {risks.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-white">{risks.length}</p>
              <p className="text-xs text-slate-400">預判風險點</p>
            </div>
            <div className={`bg-slate-700/50 rounded-lg p-3 text-center ${highCount > 0 ? 'glow-red' : ''}`}>
              <p className="text-xl font-bold text-red-400">{highCount}</p>
              <p className="text-xs text-slate-400">高風險</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-amber-400">{mediumCount}</p>
              <p className="text-xs text-slate-400">中風險</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-green-400">{risks.length - highCount - mediumCount}</p>
              <p className="text-xs text-slate-400">低風險</p>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="card-glass rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto mb-3"></div>
          <p className="text-sm text-cyan-400">AI Agent 正在分析路網 + 天氣 + SOP...</p>
          <p className="text-xs text-slate-500 mt-1">預判塞車、車禍、積水、行道樹倒塌風險中</p>
        </div>
      )}

      {risks.length > 0 && (
        <>
          <div className="card-glass rounded-lg p-4">
            <div className="rounded-lg overflow-hidden border border-slate-700" style={{ height: '450px' }}>
              <MapContainer center={MAP_CENTER} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={true}>
                <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <FlyToRisk risks={risks} />
                {risks.map((risk, i) => {
                  if (!risk.lat || !risk.lng) return null
                  const levelConf = LEVEL_CONFIG[risk.level] || LEVEL_CONFIG.medium
                  const typeConf = RISK_CONFIG[risk.type] || { icon: '⚠️', label: risk.type }
                  return (
                    <CircleMarker key={i} center={[risk.lat, risk.lng]} radius={levelConf.size} pathOptions={{ color: levelConf.color, fillColor: levelConf.color, fillOpacity: 0.6, weight: 2 }}>
                      <Popup>
                        <div style={{ color: '#1e293b', minWidth: '200px' }}>
                          <strong>{typeConf.icon} {risk.road}</strong>
                          <br /><span style={{ color: levelConf.color }}>{levelConf.label}</span> — {typeConf.label}
                          <br />機率：{risk.probability}%
                          <br />依據：{risk.reason}
                          <br />SOP：{risk.sop_clause}
                          <br /><strong>改善：</strong>{risk.improvement}
                        </div>
                      </Popup>
                    </CircleMarker>
                  )
                })}
              </MapContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              {Object.entries(RISK_CONFIG).map(([key, conf]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-slate-300"><span>{conf.icon}</span><span>{conf.label}</span></div>
              ))}
              <div className="ml-auto flex gap-3">
                {Object.entries(LEVEL_CONFIG).map(([key, conf]) => (
                  <div key={key} className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: conf.color }}></span><span className="text-slate-400">{conf.label}</span></div>
                ))}
              </div>
            </div>
          </div>

          <div className="card-glass rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📋 風險詳細分析 + 改善建議</h3>
            <div className="space-y-3">
              {risks.map((risk, i) => {
                const typeConf = RISK_CONFIG[risk.type] || { icon: '⚠️', label: risk.type }
                const levelConf = LEVEL_CONFIG[risk.level] || LEVEL_CONFIG.medium
                return (
                  <div key={i} className={`p-4 rounded-lg border ${risk.level === 'high' ? 'border-red-500/30 bg-red-500/5' : risk.level === 'medium' ? 'border-amber-500/30 bg-amber-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{typeConf.icon}</span>
                        <div>
                          <span className="text-sm font-medium text-white">{risk.road}</span>
                          <span className="text-xs text-slate-400 ml-2">{typeConf.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${levelConf.color}20`, color: levelConf.color }}>{levelConf.label} {risk.probability}%</span>
                        {risk.sop_clause && <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">{risk.sop_clause}</span>}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">📊 依據：{risk.reason}</p>
                    <div className="p-2 bg-green-500/10 border border-green-500/20 rounded">
                      <p className="text-xs text-green-400">💡 改善建議：{risk.improvement}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {summary && (
        <div className="card-glass rounded-lg p-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🤖</span>
            <span className="text-sm text-cyan-400 font-medium">AI Agent 風險摘要</span>
            {iterations > 0 && <span className="text-xs text-slate-500">{iterations} 輪推理</span>}
          </div>
          <p className="text-sm text-slate-300">{summary}</p>
          {toolCalls.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-1">推理過程：</p>
              {toolCalls.map((tc, i) => (
                <div key={i} className="text-xs text-slate-400">→ <span className="text-cyan-300">{tc.tool}</span></div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RiskPredictionMap
