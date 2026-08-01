import axios from 'axios'
import {
  trafficFlowData,
  saturationData,
  alertsData,
  mockIncidentResponse,
  mockChatResponses,
  mockMultiLangReport,
} from './mockData'

const API_BASE = '/api'
const USE_MOCK = false // 切換為 false 以連接真實後端

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

// ============ JWT Token 管理 ============

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    sessionStorage.setItem('jwt_token', token)
  } else {
    delete api.defaults.headers.common['Authorization']
    sessionStorage.removeItem('jwt_token')
  }
}

// 頁面載入時恢復 token
const savedToken = sessionStorage.getItem('jwt_token')
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
}

// 登入 API
export async function loginAPI(username, password) {
  const res = await api.post('/auth/login', { username, password })
  setAuthToken(res.data.token)
  return res.data
}

// 登出
export function logoutAPI() {
  setAuthToken(null)
}

// 車流時序資料
export async function fetchTrafficData() {
  if (USE_MOCK) return { flow: trafficFlowData, saturation: saturationData }
  const res = await api.get('/dashboard/traffic')
  return res.data
}

// 告警列表
export async function fetchAlerts() {
  if (USE_MOCK) return alertsData
  const res = await api.get('/dashboard/alerts')
  return res.data
}

// 處理突發事件
export async function processIncident(incident) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1500)) // 模擬延遲
    return mockIncidentResponse
  }
  const res = await api.post('/incidents/process', incident)
  return res.data
}

// 生成建議書
export async function generateReport(incidentId) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1000))
    return { report: '交控中心建議書已產出（模擬）' }
  }
  const res = await api.post('/incidents/report', { incident_id: incidentId })
  return res.data
}

// 對話式諮詢
export async function sendChatMessage(message) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800))
    const match = mockChatResponses.find((r) =>
      message.includes('替代') || message.includes('塌陷')
    )
    return { reply: match?.answer || '根據 SOP 規範，系統正在分析您的問題。請稍候...' }
  }
  const res = await api.post('/chat/', { message })
  return res.data
}

// 多語通報
export async function fetchMultiLangReport() {
  if (USE_MOCK) return mockMultiLangReport
  const res = await api.get('/dashboard/multilang-report')
  return res.data
}

// WebSocket 連線（即時推送）
export function connectWebSocket(onMessage) {
  if (USE_MOCK) {
    // 模擬 WebSocket：每 10 秒推送一筆新告警
    const interval = setInterval(() => {
      const mockAlert = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        type: 'saturation',
        level: Math.random() > 0.5 ? 'critical' : 'warning',
        message: `路段飽和度異常更新 (${(0.85 + Math.random() * 0.15).toFixed(2)})`,
        road: '即時監測',
      }
      onMessage(mockAlert)
    }, 10000)
    return { close: () => clearInterval(interval) }
  }

  const ws = new WebSocket(`ws://${window.location.host}/api/dashboard/ws`)
  ws.onmessage = (event) => onMessage(JSON.parse(event.data))
  return ws
}
