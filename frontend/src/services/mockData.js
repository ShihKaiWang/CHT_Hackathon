// 模擬 15 路段的即時車流量資料
export const trafficFlowData = Array.from({ length: 24 }, (_, hour) => ({
  time: `${String(hour).padStart(2, '0')}:00`,
  路段A_忠孝東路: Math.floor(300 + Math.random() * 500 + (hour >= 7 && hour <= 9 ? 400 : 0) + (hour >= 17 && hour <= 19 ? 350 : 0)),
  路段B_中山北路: Math.floor(250 + Math.random() * 400 + (hour >= 7 && hour <= 9 ? 350 : 0) + (hour >= 17 && hour <= 19 ? 300 : 0)),
  路段C_信義路: Math.floor(200 + Math.random() * 450 + (hour >= 7 && hour <= 9 ? 380 : 0) + (hour >= 17 && hour <= 19 ? 320 : 0)),
  路段D_民權東路: Math.floor(180 + Math.random() * 350),
  路段E_復興南路: Math.floor(220 + Math.random() * 300),
}))

// 飽和度資料（超過 0.85 為異常）
export const saturationData = [
  { id: 'R001', name: '忠孝東路四段', saturation: 0.92, status: 'critical' },
  { id: 'R002', name: '中山北路二段', saturation: 0.87, status: 'warning' },
  { id: 'R003', name: '信義路三段', saturation: 0.78, status: 'normal' },
  { id: 'R004', name: '民權東路三段', saturation: 0.65, status: 'normal' },
  { id: 'R005', name: '復興南路一段', saturation: 0.55, status: 'normal' },
  { id: 'R006', name: '南京東路四段', saturation: 0.91, status: 'critical' },
  { id: 'R007', name: '和平東路二段', saturation: 0.72, status: 'normal' },
  { id: 'R008', name: '建國南路二段', saturation: 0.88, status: 'warning' },
]

// 即時告警
export const alertsData = [
  {
    id: 1,
    time: '14:32',
    type: 'saturation',
    level: 'critical',
    message: '忠孝東路四段飽和度達 92%，超出閾值',
    road: '忠孝東路四段',
  },
  {
    id: 2,
    time: '14:28',
    type: 'saturation',
    level: 'critical',
    message: '南京東路四段飽和度達 91%，建議啟動疏導',
    road: '南京東路四段',
  },
  {
    id: 3,
    time: '14:15',
    type: 'incident',
    level: 'warning',
    message: '信義路/復興南路口：施工佔用一車道',
    road: '信義路三段',
  },
  {
    id: 4,
    time: '13:50',
    type: 'crowd',
    level: 'warning',
    message: '台北 101 周邊基地台人流密度異常升高',
    road: '信義區',
  },
  {
    id: 5,
    time: '13:22',
    type: 'saturation',
    level: 'info',
    message: '建國南路二段飽和度 88%，持續觀測中',
    road: '建國南路二段',
  },
]

// 突發事件範例
export const incidentTemplates = [
  { type: 'collapse', label: '道路塌陷', icon: '🕳️' },
  { type: 'accident', label: '交通事故', icon: '🚗' },
  { type: 'crowd', label: '大型人潮', icon: '👥' },
  { type: 'construction', label: '施工佔道', icon: '🚧' },
  { type: 'weather', label: '天氣異常', icon: '🌧️' },
]

// 模擬事件處理結果
export const mockIncidentResponse = {
  event: '忠孝東路四段道路塌陷',
  severity: 'critical',
  affected_roads: ['忠孝東路四段', '忠孝東路五段', '大安路一段'],
  alternative_routes: [
    { path: '仁愛路四段 → 復興南路 → 忠孝東路五段', ete: '12 分鐘', congestion: 'low' },
    { path: '市民大道四段 → 光復南路', ete: '15 分鐘', congestion: 'medium' },
  ],
  signal_adjustments: [
    { intersection: '忠孝/復興路口', action: '綠燈延長 15 秒（南北向）' },
    { intersection: '仁愛/大安路口', action: '增設左轉專用相位' },
  ],
  processing_time_sec: 8.2,
}

// 模擬 Chat 回應
export const mockChatResponses = [
  {
    question: '如果忠孝東路塌陷，替代路線有哪些？',
    answer: '根據 SOP 第 2 條，系統建議以下替代路徑：\n1. 仁愛路四段 → 復興南路（ETE 12 分）\n2. 市民大道 → 光復南路（ETE 15 分）\n\n已自動調整沿線號誌，預計 10 分鐘內分流完成。',
  },
]

// 模擬多語通報
export const mockMultiLangReport = {
  roaming_rate: 0.35,
  triggered: true,
  reports: {
    zh: '⚠️ 交通通報：忠孝東路四段因道路塌陷暫時封閉，請改走仁愛路或市民大道。預計修復時間：3 小時。',
    en: '⚠️ Traffic Alert: Zhongxiao E. Rd. Sec. 4 is closed due to road collapse. Please use Ren\'ai Rd. or Civic Blvd. as alternatives. Estimated repair time: 3 hours.',
    ja: '⚠️ 交通情報：忠孝東路四段は道路陥没のため通行止めです。仁愛路または市民大道をご利用ください。復旧見込み：3時間。',
    ko: '⚠️ 교통 안내: 중효동로 4단은 도로 함몰로 인해 폐쇄되었습니다. 런아이로 또는 시민대도로 우회해 주세요. 복구 예상 시간: 3시간.',
  },
}

// 通知發送歷史紀錄
export const dispatchHistory = [
  {
    id: 'D001',
    time: '14:33:05',
    event: '忠孝東路四段飽和度超標',
    channels: ['cbs', 'sms', 'signboard'],
    status: 'completed',
    reach: 8200,
    deliveryRate: 0.94,
  },
  {
    id: 'D002',
    time: '14:28:12',
    event: '南京東路四段飽和度超標',
    channels: ['signboard', 'navigation'],
    status: 'completed',
    reach: 5100,
    deliveryRate: 0.91,
  },
  {
    id: 'D003',
    time: '13:50:30',
    event: '台北 101 大型人潮（漫遊率 35%）',
    channels: ['cbs', 'sms', 'app', 'signboard', 'social'],
    status: 'completed',
    reach: 42000,
    deliveryRate: 0.88,
  },
]

// 疏散路線建議
export const evacuationRoutes = [
  {
    id: 'ER01',
    from: '忠孝東路四段（封閉段）',
    to: '仁愛路四段',
    direction: '南向疏散',
    distance: '450m',
    ete: '3 分鐘',
    signalAdjust: '復興/仁愛路口綠燈延長 15 秒',
  },
  {
    id: 'ER02',
    from: '忠孝東路四段（封閉段）',
    to: '市民大道四段',
    direction: '北向疏散',
    distance: '380m',
    ete: '2 分鐘',
    signalAdjust: '復興/市民大道口增設左轉相位',
  },
  {
    id: 'ER03',
    from: '大安路一段（受影響）',
    to: '建國南路二段',
    direction: '西向分流',
    distance: '600m',
    ete: '5 分鐘',
    signalAdjust: '大安/信義路口調整為全紅閃燈',
  },
]
