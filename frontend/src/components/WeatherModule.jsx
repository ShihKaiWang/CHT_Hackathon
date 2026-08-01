import { useState, useEffect } from 'react'
import { useCountUp } from '../hooks/useCountUp'
import { callSmartApp } from '../services/api'

// Open-Meteo API（免費、無需 key）
const TAIPEI_LAT = 25.033
const TAIPEI_LNG = 121.565
const WEATHER_API = `https://api.open-meteo.com/v1/forecast?latitude=${TAIPEI_LAT}&longitude=${TAIPEI_LNG}&current=temperature_2m,relative_humidity_2m,rain,weather_code,wind_speed_10m,visibility&timezone=Asia%2FTaipei`

// Weather code → 中文 + icon
function getWeatherInfo(code) {
  if (code <= 1) return { label: '晴天', icon: '☀️' }
  if (code <= 3) return { label: '多雲', icon: '⛅' }
  if (code <= 48) return { label: '霧', icon: '🌫️' }
  if (code <= 55) return { label: '毛毛雨', icon: '🌦️' }
  if (code <= 65) return { label: '下雨', icon: '🌧️' }
  if (code <= 67) return { label: '凍雨', icon: '🌧️' }
  if (code <= 77) return { label: '下雪', icon: '🌨️' }
  if (code <= 82) return { label: '陣雨', icon: '🌧️' }
  if (code <= 86) return { label: '陣雪', icon: '🌨️' }
  if (code <= 99) return { label: '雷暴', icon: '⛈️' }
  return { label: '未知', icon: '❓' }
}

// 根據天氣計算容量係數
function calculateCapacityFactor(rain, visibility, wind) {
  let factor = 1.0

  // 降雨影響
  if (rain > 50) factor *= 0.4        // 暴雨
  else if (rain > 20) factor *= 0.6    // 大雨
  else if (rain > 5) factor *= 0.8     // 中雨
  else if (rain > 1) factor *= 0.9     // 小雨

  // 能見度影響（公尺）
  if (visibility < 200) factor *= 0.5
  else if (visibility < 1000) factor *= 0.7
  else if (visibility < 3000) factor *= 0.85

  // 強風影響
  if (wind > 60) factor *= 0.6
  else if (wind > 40) factor *= 0.8
  else if (wind > 25) factor *= 0.9

  return Math.max(0.3, factor)
}

function getRiskLevel(factor) {
  if (factor >= 0.95) return { level: 'low', label: '低風險', color: 'green' }
  if (factor >= 0.8) return { level: 'medium', label: '中風險', color: 'amber' }
  if (factor >= 0.6) return { level: 'high', label: '高風險', color: 'orange' }
  return { level: 'critical', label: '極高風險', color: 'red' }
}

// 積水熱點
const FLOOD_HOTSPOTS = [
  { name: '忠孝東路/光復南路口', baseDepth: 15 },
  { name: '市民大道地下道入口', baseDepth: 25 },
  { name: '基隆路/信義路口', baseDepth: 10 },
  { name: '復興南路地下道', baseDepth: 30 },
  { name: '大安路/仁愛路口', baseDepth: 8 },
]

const ROAD_CAPACITY = [
  { name: '忠孝東路四段', normalCap: 1800 },
  { name: '仁愛路四段', normalCap: 2200 },
  { name: '市民大道四段', normalCap: 2500 },
  { name: '光復南路', normalCap: 1500 },
  { name: '基隆路一段', normalCap: 1600 },
  { name: '信義路五段', normalCap: 2000 },
]

function AnimatedValue({ value, suffix = '', decimals = 0, className = '' }) {
  const { formattedValue } = useCountUp(value, { duration: 800, decimals })
  return <span className={className}>{formattedValue}{suffix}</span>
}

function WeatherModule({ weatherEnabled, setWeatherEnabled }) {
  const [liveWeather, setLiveWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)
  const [agentResult, setAgentResult] = useState(null)
  const [agentLoading, setAgentLoading] = useState(false)

  // 取得即時天氣
  async function fetchWeather() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(WEATHER_API)
      const data = await res.json()
      const current = data.current
      setLiveWeather({
        temp: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        rain: current.rain,
        weatherCode: current.weather_code,
        wind: current.wind_speed_10m,
        visibility: current.visibility, // 公尺
      })
      setLastUpdate(new Date())
      // Auto-call AI Agent for weather impact analysis
      callWeatherAgent(getWeatherInfo(current.weather_code).label, current.rain)
    } catch (err) {
      setError('無法取得天氣資料，請檢查網路連線')
    } finally {
      setLoading(false)
    }
  }

  // 開啟時自動取得，之後每 5 分鐘更新
  useEffect(() => {
    if (!weatherEnabled) return
    fetchWeather()
    const timer = setInterval(fetchWeather, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [weatherEnabled])

  async function callWeatherAgent(condition, rainProb) {
    setAgentLoading(true)
    setAgentResult(null)
    try {
      const res = await callSmartApp('weather_impact', { condition, rain_prob: rainProb })
      if (res && Object.keys(res).length > 0) {
        setAgentResult(res)
      }
    } catch (err) {
      console.error('AI Agent weather_impact error:', err)
    } finally {
      setAgentLoading(false)
    }
  }

  // 計算衍生值
  const weatherInfo = liveWeather ? getWeatherInfo(liveWeather.weatherCode) : null
  const capacityFactor = liveWeather
    ? calculateCapacityFactor(liveWeather.rain, liveWeather.visibility, liveWeather.wind)
    : 1.0
  const risk = getRiskLevel(capacityFactor)

  return (
    <div className="space-y-6">
      {/* 開關控制 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-white">🌧️ 天氣連動模組</h2>
            <p className="text-sm text-slate-400 mt-1">
              接入即時天氣資料，自動影響路網容量計算
            </p>
          </div>
          {/* 開關 */}
          <button
            onClick={() => setWeatherEnabled(!weatherEnabled)}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
              weatherEnabled ? 'bg-green-500' : 'bg-slate-600'
            }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
              weatherEnabled ? 'left-7.5' : 'left-0.5'
            }`} style={{ left: weatherEnabled ? '30px' : '2px' }}></div>
          </button>
        </div>

        <div className={`p-3 rounded-lg border ${
          weatherEnabled
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-slate-700/30 border-slate-700'
        }`}>
          <p className="text-sm">
            {weatherEnabled ? (
              <span className="text-green-400">✅ <strong>已啟用</strong>：即時天氣數據將影響路網容量計算、飽和度評估與疏散方案</span>
            ) : (
              <span className="text-slate-400">⏸ <strong>已關閉</strong>：路網容量使用標準值，不考慮天氣影響</span>
            )}
          </p>
        </div>
      </div>

      {/* 天氣啟用後的內容 */}
      {weatherEnabled && (
        <>
          {/* 載入中 */}
          {loading && !liveWeather && (
            <div className="card-glass rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-sm text-slate-400">正在取得台北即時天氣...</p>
            </div>
          )}

          {/* 錯誤 */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={fetchWeather} className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded-lg">重試</button>
            </div>
          )}

          {/* 天氣數據 */}
          {liveWeather && (
            <>
              {/* 即時天氣卡片 */}
              <div className="card-glass rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">📡 即時天氣（台北信義區）</h3>
                  <div className="flex items-center gap-2">
                    {loading && <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>}
                    <span className="text-xs text-slate-500">
                      {lastUpdate ? `更新：${lastUpdate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                    <button onClick={fetchWeather} className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600">🔄</button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl">{weatherInfo.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{weatherInfo.label}</h3>
                      <span className={`text-xs font-medium text-${risk.color}-400`}>● {risk.label}</span>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-3xl font-bold text-white">{liveWeather.temp}°C</p>
                      <p className="text-xs text-slate-400">即時溫度</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-400">💧 濕度</p>
                      <p className="text-lg font-bold text-cyan-400">{liveWeather.humidity}%</p>
                    </div>
                    <div className={`bg-slate-800 rounded-lg p-3 text-center ${liveWeather.rain > 5 ? 'glow-blue' : ''}`}>
                      <p className="text-xs text-slate-400">🌧️ 雨量</p>
                      <p className={`text-lg font-bold ${liveWeather.rain > 20 ? 'text-red-400' : liveWeather.rain > 5 ? 'text-amber-400' : 'text-green-400'}`}>
                        {liveWeather.rain} mm/h
                      </p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-400">💨 風速</p>
                      <p className="text-lg font-bold text-white">{liveWeather.wind} km/h</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-400">👁️ 能見度</p>
                      <p className="text-lg font-bold text-white">{(liveWeather.visibility / 1000).toFixed(1)} km</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 容量影響 */}
              <div className="card-glass rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">📉 路段容量即時影響</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">容量係數：</span>
                    <span className={`text-sm font-bold font-mono text-${risk.color}-400`}>
                      ×{capacityFactor.toFixed(2)}
                    </span>
                    {capacityFactor < 1 && (
                      <span className="text-xs text-red-400">(-{Math.round((1 - capacityFactor) * 100)}%)</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {ROAD_CAPACITY.map((road) => {
                    const adjusted = Math.floor(road.normalCap * capacityFactor)
                    const reduction = road.normalCap - adjusted
                    const pct = (adjusted / road.normalCap) * 100
                    return (
                      <div key={road.name} className="bg-slate-700/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white">{road.name}</span>
                          <span className="text-xs text-slate-400">
                            {road.normalCap} → <span className={reduction > 0 ? 'text-amber-400' : 'text-green-400'}>{adjusted}</span> 車/時
                            {reduction > 0 && <span className="text-red-400 ml-1">▼{reduction}</span>}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              pct < 70 ? 'bg-red-500' : pct < 90 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {capacityFactor < 0.85 && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-300">
                      ⚠️ 天氣導致路網有效容量下降 {Math.round((1 - capacityFactor) * 100)}%，建議啟動預防性號誌調整
                    </p>
                  </div>
                )}
              </div>

              {/* 積水熱點（有降雨時） */}
              {liveWeather.rain > 1 && (
                <div className="card-glass rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">🌊 積水熱點監測</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {FLOOD_HOTSPOTS.map((spot) => {
                      const depth = Math.floor(spot.baseDepth * (liveWeather.rain / 35))
                      const critical = depth > 20
                      const warning = depth > 10
                      return (
                        <div key={spot.name} className={`p-3 rounded-lg border ${
                          critical ? 'border-red-500/40 bg-red-500/10' :
                          warning ? 'border-amber-500/40 bg-amber-500/10' :
                          'border-slate-700 bg-slate-700/30'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-white">{spot.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              critical ? 'bg-red-500/20 text-red-400' :
                              warning ? 'bg-amber-500/20 text-amber-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {critical ? '🚫 封閉' : warning ? '⚠️ 警戒' : '✅ 正常'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${critical ? 'bg-red-500' : warning ? 'bg-amber-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min((depth / 30) * 100, 100)}%` }}></div>
                            </div>
                            <span className="text-xs text-slate-400">{depth} cm</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* AI Agent 天氣衝擊分析 */}
              {agentLoading && (
                <div className="card-glass rounded-lg p-4 flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-cyan-500"></div>
                  <span className="text-sm text-cyan-400">AI Agent 天氣衝擊分析中...</span>
                </div>
              )}
              {agentResult && (
                <div className="card-glass rounded-lg p-4 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">🤖</span>
                    <span className="text-sm text-cyan-400 font-medium">AI Agent 分析</span>
                    {agentResult.iterations && <span className="text-xs text-slate-500">{agentResult.iterations} 輪推理</span>}
                  </div>
                  {agentResult.at_risk_roads && (
                    <div className="space-y-1 mb-2">
                      <p className="text-xs text-slate-400 font-medium">⚠️ 高風險路段：</p>
                      {agentResult.at_risk_roads.map((road, i) => (
                        <div key={i} className="bg-slate-700/30 rounded p-2 text-xs text-red-300">
                          📍 {typeof road === 'string' ? road : road.name || road.road}
                          {road.reason && <span className="text-slate-400 ml-1">— {road.reason}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {agentResult.recommendations && (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400 font-medium">建議措施：</p>
                      {agentResult.recommendations.map((rec, i) => (
                        <p key={i} className="text-xs text-green-400">💡 {rec}</p>
                      ))}
                    </div>
                  )}
                  {agentResult.summary && (
                    <p className="text-xs text-slate-300 mt-2">{agentResult.summary}</p>
                  )}
                  {agentResult.tool_calls?.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-700">
                      <p className="text-xs text-slate-500 mb-1">推理過程：</p>
                      {agentResult.tool_calls.map((tc, i) => (
                        <div key={i} className="text-xs text-slate-400">→ <span className="text-cyan-300">{tc.tool}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 資料來源說明 */}
              <div className="bg-slate-700/20 border border-slate-700 rounded-lg p-3 text-xs text-slate-500">
                <p>📡 資料來源：Open-Meteo API（即時氣象資料）| 座標：台北信義區 ({TAIPEI_LAT}, {TAIPEI_LNG})</p>
                <p className="mt-0.5">🔄 自動每 5 分鐘更新 | 容量係數公式：降雨×能見度×風速 三因子加權</p>
                <p className="mt-0.5">☁️ AWS 部署時可改接 Amazon Location Service Weather 或中央氣象署 API</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default WeatherModule
