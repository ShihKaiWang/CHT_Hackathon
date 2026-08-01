import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Circle, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useSimClock } from '../hooks/useSimClock.jsx'

// 修正 Leaflet 預設 marker icon 路徑問題
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// 台北信義計畫區中心
const MAP_CENTER = [25.0405, 121.5510]
const MAP_ZOOM = 15

// 自訂 icon
function createIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 8px ${color}"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

// === 路段座標（真實台北路網，已對齊 OpenStreetMap） ===

// 台北信義計畫區中心（忠孝東路四段/光復南路附近）
// 座標已用 OSM 地圖精確校正

// 忠孝東路四段（封閉路段）— 東西向，復興南路口→基隆路口
const ZHONGXIAO_ROAD = [
  [25.04145, 121.54430], // 復興南路口（西端）
  [25.04120, 121.54760], // 延吉街口
  [25.04095, 121.55110], // 光復南路口
  [25.04070, 121.55490], // 國父紀念館
  [25.04050, 121.55790], // 基隆路口（東端）
]

// 替代路線 1：仁愛路四段 — 東西向，在忠孝東路南邊約 400m
const RENAI_ROAD = [
  [25.03770, 121.54430], // 復興南路口
  [25.03750, 121.54760], // 延吉街口
  [25.03730, 121.55110], // 光復南路口
  [25.03710, 121.55490], // 仁愛圓環
  [25.03690, 121.55790], // 基隆路口
]

// 替代路線 2：市民大道四段 — 東西向，在忠孝東路北邊約 350m
const CIVIC_BLVD = [
  [25.04480, 121.54430], // 復興南路口
  [25.04460, 121.54760], // 延吉街口
  [25.04440, 121.55110], // 光復南路口
  [25.04420, 121.55490], // 逸仙路口
  [25.04400, 121.55790], // 基隆路口
]

// 受影響路段：光復南路（南北向）
const GUANGFU_ROAD = [
  [25.04440, 121.55110], // 市民大道口（北端）
  [25.04095, 121.55110], // 忠孝東路口
  [25.03730, 121.55110], // 仁愛路口（南端）
]

// 受影響路段：大安路一段（南北向）
const DAAN_ROAD = [
  [25.04480, 121.54570], // 市民大道口（北端）
  [25.04120, 121.54570], // 忠孝東路口
  [25.03750, 121.54570], // 仁愛路口（南端）
]

// 基地台位置（精確對齊地標建築）
const BASE_STATIONS = [
  { id: 'BL17', name: '大巨蛋站', pos: [25.04280, 121.55250], users: 28000, roaming: 0.35 },
  { id: 'BL12', name: '忠孝復興站', pos: [25.04150, 121.54370], users: 22000, roaming: 0.18 },
  { id: 'BR09', name: '市府轉運站', pos: [25.04090, 121.56220], users: 15000, roaming: 0.22 },
  { id: 'R03', name: '信義商圈', pos: [25.03560, 121.56700], users: 35000, roaming: 0.38 },
  { id: 'G12', name: '台北101站', pos: [25.03360, 121.56320], users: 42000, roaming: 0.32 },
]

// 事件位置（忠孝東路四段/光復南路口附近）
const INCIDENT_LOCATION = { pos: [25.04095, 121.55110], label: '🚨 路面塌陷' }

// 號誌調整路口
const SIGNAL_ADJUSTMENTS = [
  { pos: [25.04145, 121.54430], label: '忠孝/復興路口：南北向綠燈+25%' },
  { pos: [25.03750, 121.54570], label: '仁愛/大安路口：增設左轉相位' },
  { pos: [25.04440, 121.55110], label: '市民大道/光復路口：東西向+15%' },
]

// 動態 pulse 動畫元件
function PulseMarker({ position, color, size = 200 }) {
  const map = useMap()

  useEffect(() => {
    const pulseIcon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:20px;height:20px;">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 0 12px ${color};z-index:2;"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:${color};border-radius:50%;opacity:0.5;animation:map-pulse 2s ease-out infinite;"></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    const marker = L.marker(position, { icon: pulseIcon }).addTo(map)
    return () => map.removeLayer(marker)
  }, [map, position, color])

  return null
}

// 事件觸發時自動飛到事件地點
function FlyToEvent({ eventStarted }) {
  const map = useMap()
  const hasFlewRef = useRef(false)

  useEffect(() => {
    if (eventStarted && !hasFlewRef.current) {
      hasFlewRef.current = true
      // 先 zoom out 一點讓使用者看到全局，再飛入事件點
      setTimeout(() => {
        map.flyTo(INCIDENT_LOCATION.pos, 16, {
          duration: 2,
          easeLinearity: 0.25,
        })
      }, 500)
    }
    if (!eventStarted) {
      hasFlewRef.current = false
    }
  }, [eventStarted, map])

  return null
}

function TrafficMap() {
  const { currentTime } = useSimClock()
  const eventStarted = currentTime >= '22:10'

  return (
    <div className="card-glass rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">🗺️ 即時路網態勢圖</h2>
        {eventStarted && (
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-1 bg-red-500 rounded"></span> 封閉路段</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1 bg-green-500 rounded"></span> 替代路線</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1 bg-amber-500 rounded"></span> 受影響</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400/50"></span> 基地台覆蓋</span>
        </div>
        )}
      </div>

      <div className="rounded-lg overflow-hidden border border-slate-700" style={{ height: '480px' }}>
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          {/* 衛星圖像圖磚 */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> | Imagery &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          {/* 路名標註覆蓋層（讓衛星圖上也看得到路名） */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
            opacity={0.8}
          />

          {/* 事件觸發時自動飛到事件地點 */}
          <FlyToEvent eventStarted={eventStarted} />

          {/* 封閉路段（紅色粗虛線） */}
          {eventStarted && (
          <>
          <Polyline
            positions={ZHONGXIAO_ROAD}
            pathOptions={{ color: '#dc2626', weight: 8, dashArray: '12, 8', opacity: 0.95 }}
          />

          {/* 替代路線 1（綠色實線 + 動態箭頭感） */}
          <Polyline
            positions={RENAI_ROAD}
            pathOptions={{ color: '#16a34a', weight: 6, opacity: 0.9 }}
          />
          <Polyline
            positions={RENAI_ROAD}
            pathOptions={{ color: '#4ade80', weight: 3, dashArray: '5, 15', opacity: 0.7 }}
          />

          {/* 替代路線 2（綠色） */}
          <Polyline
            positions={CIVIC_BLVD}
            pathOptions={{ color: '#16a34a', weight: 6, opacity: 0.9 }}
          />
          <Polyline
            positions={CIVIC_BLVD}
            pathOptions={{ color: '#4ade80', weight: 3, dashArray: '5, 15', opacity: 0.7 }}
          />

          {/* 受影響路段（黃色） — 大安路 */}
          <Polyline
            positions={DAAN_ROAD}
            pathOptions={{ color: '#d97706', weight: 6, dashArray: '8, 6', opacity: 0.85 }}
          />

          {/* 受影響路段（黃色） — 光復南路 */}
          <Polyline
            positions={GUANGFU_ROAD}
            pathOptions={{ color: '#d97706', weight: 6, dashArray: '8, 6', opacity: 0.85 }}
          />

          {/* 基地台覆蓋圈 */}
          {BASE_STATIONS.map((station) => (
            <Circle
              key={station.id}
              center={station.pos}
              radius={280}
              pathOptions={{
                color: station.roaming >= 0.3 ? '#d97706' : '#0891b2',
                fillColor: station.roaming >= 0.3 ? '#fbbf24' : '#22d3ee',
                fillOpacity: 0.2,
                weight: 2.5,
                dashArray: station.roaming >= 0.3 ? '' : '5, 5',
              }}
            >
              <Popup>
                <div style={{ color: '#1e293b', minWidth: '160px' }}>
                  <strong>{station.name} ({station.id})</strong>
                  <br />用戶數：{station.users.toLocaleString()}
                  <br />漫遊率：<span style={{ color: station.roaming >= 0.3 ? '#d97706' : '#059669' }}>
                    {(station.roaming * 100).toFixed(0)}%
                  </span>
                  {station.roaming >= 0.3 && <><br /><strong style={{ color: '#d97706' }}>⚠️ 已觸發多語通報</strong></>}
                </div>
              </Popup>
            </Circle>
          ))}

          {/* 基地台中心點 */}
          {BASE_STATIONS.map((station) => (
            <Marker
              key={`marker-${station.id}`}
              position={station.pos}
              icon={createIcon(station.roaming >= 0.3 ? '#f59e0b' : '#06b6d4')}
            >
              <Popup>
                <strong>{station.name}</strong>
              </Popup>
            </Marker>
          ))}

          {/* 事件位置（脈衝點） */}
          <PulseMarker position={INCIDENT_LOCATION.pos} color="#ef4444" />
          <Circle
            center={INCIDENT_LOCATION.pos}
            radius={50}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3, weight: 2 }}
          >
            <Popup>
              <div style={{ color: '#1e293b' }}>
                <strong>🚨 路面塌陷事件</strong>
                <br />忠孝東路四段（延吉街至光復南路）
                <br />狀態：<span style={{ color: '#dc2626' }}>雙向封閉</span>
                <br />影響：3 路段
              </div>
            </Popup>
          </Circle>

          {/* 號誌調整標記 */}
          {SIGNAL_ADJUSTMENTS.map((sig, i) => (
            <Marker
              key={`signal-${i}`}
              position={sig.pos}
              icon={L.divIcon({
                className: '',
                html: '<div style="width:16px;height:16px;background:#22c55e;border-radius:3px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:10px;">🚦</div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            >
              <Popup>
                <div style={{ color: '#1e293b' }}>
                  <strong>🚦 號誌調整</strong>
                  <br />{sig.label}
                </div>
              </Popup>
            </Marker>
          ))}
          </>
          )}
        </MapContainer>
      </div>

      {/* 地圖下方說明 */}
      {eventStarted && (
      <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
          <p className="text-red-400 font-medium">封閉路段</p>
          <p className="text-slate-400">忠孝東路四段</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
          <p className="text-green-400 font-medium">替代路線 ×2</p>
          <p className="text-slate-400">仁愛路/市民大道</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2">
          <p className="text-amber-400 font-medium">漫遊觸發 ×3</p>
          <p className="text-slate-400">大巨蛋/信義/101</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
          <p className="text-blue-400 font-medium">號誌調整 ×2</p>
          <p className="text-slate-400">綠燈延長/左轉相位</p>
        </div>
      </div>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes map-pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default TrafficMap
