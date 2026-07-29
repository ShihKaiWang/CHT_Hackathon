import { useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// 自訂 icon
const originIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 10px #3b82f6"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const destIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 10px #ef4444"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

// 封閉路段區域（用於碰撞偵測）
const CLOSED_ZONES = [
  { name: '忠孝東路四段', center: [25.04095, 121.55110], radius: 300 },
]

// 模擬路線計算
function calculateRoute(origin, dest) {
  const R = 6371000 // 地球半徑 m
  const dLat = (dest[0] - origin[0]) * Math.PI / 180
  const dLng = (dest[1] - origin[1]) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(origin[0] * Math.PI / 180) * Math.cos(dest[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  // 檢查是否經過封閉區域
  const midPoint = [(origin[0] + dest[0]) / 2, (origin[1] + dest[1]) / 2]
  const passesClosedZone = CLOSED_ZONES.some((zone) => {
    const dLat2 = (midPoint[0] - zone.center[0]) * Math.PI / 180
    const dLng2 = (midPoint[1] - zone.center[1]) * Math.PI / 180
    const a2 = Math.sin(dLat2 / 2) ** 2 + Math.cos(midPoint[0] * Math.PI / 180) * Math.cos(zone.center[0] * Math.PI / 180) * Math.sin(dLng2 / 2) ** 2
    const dist = R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2))
    return dist < zone.radius
  })

  const distKm = distance / 1000
  const walkSpeed = 5 // km/h
  const bikeSpeed = 12
  const busSpeed = 18
  const taxiSpeed = 25
  const mrtSpeed = 35

  // 產出路線方案
  const routes = [
    {
      id: 'mrt',
      icon: '🚇',
      label: '捷運',
      time: Math.ceil((distKm / mrtSpeed) * 60 + 8), // +8 分鐘等車走路
      cost: Math.ceil(20 + distKm * 3),
      carbon: Math.ceil(distKm * 20),
      distance: distKm.toFixed(1),
      affected: false,
    },
    {
      id: 'bus',
      icon: '🚌',
      label: '公車',
      time: Math.ceil((distKm / busSpeed) * 60 + 5),
      cost: 15,
      carbon: Math.ceil(distKm * 50),
      distance: distKm.toFixed(1),
      affected: passesClosedZone,
      affectedNote: passesClosedZone ? '路線經過封閉路段，需改道（+8 分鐘）' : null,
    },
    {
      id: 'bike',
      icon: '🚲',
      label: 'YouBike',
      time: Math.ceil((distKm / bikeSpeed) * 60 + 3),
      cost: Math.ceil(10 + distKm * 2),
      carbon: 0,
      distance: distKm.toFixed(1),
      affected: false,
      note: '🌿 零碳排',
    },
    {
      id: 'taxi',
      icon: '🚕',
      label: '計程車',
      time: Math.ceil((distKm / taxiSpeed) * 60 + 3),
      cost: Math.ceil(85 + distKm * 25),
      carbon: Math.ceil(distKm * 120),
      distance: distKm.toFixed(1),
      affected: passesClosedZone,
      affectedNote: passesClosedZone ? '需繞行避開封閉路段（+$50、+5 分鐘）' : null,
    },
    {
      id: 'walk',
      icon: '🚶',
      label: '步行',
      time: Math.ceil((distKm / walkSpeed) * 60),
      cost: 0,
      carbon: 0,
      distance: distKm.toFixed(1),
      affected: false,
      note: '🌿 零碳排、有騎樓遮蔽',
    },
  ]

  // 受影響的加時間加費用
  routes.forEach((r) => {
    if (r.affected) {
      r.originalTime = r.time
      r.time += r.id === 'bus' ? 8 : 5
      if (r.id === 'taxi') r.cost += 50
    }
  })

  return { routes, distance: distKm, passesClosedZone }
}

// 地圖點擊事件處理
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

function MapRoutePlanner() {
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [settingMode, setSettingMode] = useState('origin') // origin | destination
  const [routeResult, setRouteResult] = useState(null)
  const [locating, setLocating] = useState(false)
  const [sortBy, setSortBy] = useState('time')

  function handleMapClick(latlng) {
    if (settingMode === 'origin') {
      setOrigin(latlng)
      setSettingMode('destination')
      setRouteResult(null)
    } else {
      setDestination(latlng)
      setSettingMode('origin')
      // 自動計算路線
      const result = calculateRoute(origin || latlng, latlng)
      // 如果已有 origin 才計算
      if (origin) {
        setRouteResult(calculateRoute(origin, latlng))
      }
    }
  }

  function handleGPS() {
    if (!navigator.geolocation) {
      alert('您的瀏覽器不支援定位功能')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin([pos.coords.latitude, pos.coords.longitude])
        setSettingMode('destination')
        setRouteResult(null)
        setLocating(false)
      },
      () => {
        // 定位失敗用預設位置
        setOrigin([25.0415, 121.5437])
        setSettingMode('destination')
        setLocating(false)
      },
      { timeout: 5000 }
    )
  }

  function handleReset() {
    setOrigin(null)
    setDestination(null)
    setRouteResult(null)
    setSettingMode('origin')
  }

  function handleRecalculate() {
    if (origin && destination) {
      setRouteResult(calculateRoute(origin, destination))
    }
  }

  const sortedRoutes = routeResult
    ? [...routeResult.routes].sort((a, b) => {
        if (sortBy === 'time') return a.time - b.time
        if (sortBy === 'cost') return a.cost - b.cost
        if (sortBy === 'carbon') return a.carbon - b.carbon
        return 0
      })
    : []

  return (
    <div className="space-y-4">
      {/* 操作指引 */}
      <div className="card-glass rounded-xl p-4">
        <h3 className="text-base font-bold text-white mb-2">🗺️ 地圖路線規劃</h3>
        <div className="flex items-center gap-3 mb-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${
            settingMode === 'origin' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
            <span className="w-3 h-3 rounded-full bg-blue-400 border-2 border-white"></span>
            {origin ? `起點已設定` : '點擊地圖設起點'}
          </div>
          <span className="text-slate-500">→</span>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${
            settingMode === 'destination' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
            <span className="w-3 h-3 rounded-full bg-red-400 border-2 border-white"></span>
            {destination ? '終點已設定' : '點擊地圖設終點'}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGPS}
            disabled={locating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-xs rounded-lg transition-colors"
          >
            {locating ? '⏳ 定位中...' : '📍 使用目前位置'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
          >
            🔄 重新選擇
          </button>
        </div>
      </div>

      {/* 地圖 */}
      <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: '350px' }}>
        <MapContainer
          center={[25.0400, 121.5510]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
            opacity={0.8}
          />

          <MapClickHandler onMapClick={handleMapClick} />

          {/* 起點標記 */}
          {origin && (
            <Marker position={origin} icon={originIcon}>
              <Popup>📍 起點<br/>{origin[0].toFixed(5)}, {origin[1].toFixed(5)}</Popup>
            </Marker>
          )}

          {/* 終點標記 */}
          {destination && (
            <Marker position={destination} icon={destIcon}>
              <Popup>🏁 終點<br/>{destination[0].toFixed(5)}, {destination[1].toFixed(5)}</Popup>
            </Marker>
          )}

          {/* 路線連線 */}
          {origin && destination && (
            <Polyline
              positions={[origin, destination]}
              pathOptions={{ color: routeResult?.passesClosedZone ? '#f59e0b' : '#22c55e', weight: 4, dashArray: '8, 8' }}
            />
          )}

          {/* 封閉區域 */}
          {CLOSED_ZONES.map((zone, i) => (
            <Circle
              key={i}
              center={zone.center}
              radius={zone.radius}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15, weight: 2, dashArray: '5, 5' }}
            >
              <Popup>🚧 {zone.name} — 封閉中</Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>

      {/* 路線經過封閉區域警告 */}
      {routeResult?.passesClosedZone && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <p className="text-sm text-amber-300 font-medium">
            ⚠️ 您的路線可能經過忠孝東路四段封閉路段，部分方案已自動加計繞行時間
          </p>
        </div>
      )}

      {/* 路線方案結果 */}
      {routeResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">
              建議方案（直線距離 {routeResult.distance} km）
            </h4>
            <div className="flex gap-1">
              {[
                { id: 'time', label: '⚡ 最快' },
                { id: 'cost', label: '💰 最省' },
                { id: 'carbon', label: '🌱 最綠' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id)}
                  className={`px-2 py-1 rounded text-xs ${sortBy === s.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {sortedRoutes.map((route, i) => (
            <div key={route.id} className={`bg-slate-800 border rounded-xl p-4 transition-all ${
              route.affected ? 'border-amber-500/30' : 'border-slate-700'
            } ${i === 0 ? 'ring-2 ring-blue-500/30' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{route.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{route.label}</span>
                      {i === 0 && <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">推薦</span>}
                      {route.affected && <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">受影響</span>}
                      {route.note && <span className="text-xs text-green-400">{route.note}</span>}
                    </div>
                    {route.affectedNote && (
                      <p className="text-xs text-amber-400 mt-0.5">⚠️ {route.affectedNote}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${route.affected ? 'text-amber-400' : 'text-white'}`}>
                      {route.time} 分
                      {route.originalTime && <span className="text-xs text-slate-500 line-through ml-1">{route.originalTime}</span>}
                    </span>
                    <span className="text-sm text-white">${route.cost}</span>
                    <span className={`text-xs ${route.carbon === 0 ? 'text-green-400' : 'text-slate-400'}`}>
                      {route.carbon}g CO₂
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 未設定起終點提示 */}
      {!routeResult && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <p className="text-3xl mb-2">🗺️</p>
          <p className="text-sm text-slate-400">點擊地圖設定起點和終點</p>
          <p className="text-xs text-slate-500 mt-1">或按「📍 使用目前位置」自動定位起點</p>
        </div>
      )}
    </div>
  )
}

export default MapRoutePlanner
