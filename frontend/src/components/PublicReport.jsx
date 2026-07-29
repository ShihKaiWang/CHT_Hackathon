import { useState } from 'react'

const REPORT_TYPES = [
  { id: 'traffic_jam', icon: '🚗', label: '塞車', color: 'red' },
  { id: 'accident', icon: '💥', label: '事故', color: 'red' },
  { id: 'flood', icon: '🌊', label: '積水', color: 'blue' },
  { id: 'road_damage', icon: '🕳️', label: '路面損壞', color: 'amber' },
  { id: 'signal_broken', icon: '🚦', label: '號誌故障', color: 'purple' },
  { id: 'construction', icon: '🚧', label: '施工', color: 'amber' },
  { id: 'fallen_tree', icon: '🌳', label: '樹木倒塌', color: 'green' },
  { id: 'other', icon: '📝', label: '其他', color: 'slate' },
]

const SEVERITY_OPTIONS = [
  { id: 'low', label: '輕微', desc: '不影響通行', color: 'green' },
  { id: 'medium', label: '中等', desc: '部分車道受阻', color: 'amber' },
  { id: 'high', label: '嚴重', desc: '道路嚴重阻塞或封閉', color: 'red' },
]

// 模擬已有的民眾回報
const EXISTING_REPORTS = [
  {
    id: 'R001',
    type: 'traffic_jam',
    icon: '🚗',
    location: '忠孝東路/光復南路口',
    description: '雙向都塞住了，完全不動',
    severity: 'high',
    time: '14:28',
    upvotes: 23,
    status: 'confirmed',
    reporter: '匿名市民',
  },
  {
    id: 'R002',
    type: 'flood',
    icon: '🌊',
    location: '市民大道地下道入口',
    description: '積水大概到小腿，機車無法通過',
    severity: 'high',
    time: '14:15',
    upvotes: 15,
    status: 'processing',
    reporter: '路過騎士',
  },
  {
    id: 'R003',
    type: 'road_damage',
    icon: '🕳️',
    location: '大安路一段 近仁愛路口',
    description: '路面有個大坑洞，機車要小心',
    severity: 'medium',
    time: '13:50',
    upvotes: 8,
    status: 'confirmed',
    reporter: '通勤族',
  },
  {
    id: 'R004',
    type: 'signal_broken',
    icon: '🚦',
    location: '復興南路/市民大道口',
    description: '紅綠燈一直閃黃燈',
    severity: 'medium',
    time: '13:30',
    upvotes: 12,
    status: 'dispatched',
    reporter: '附近住戶',
  },
  {
    id: 'R005',
    type: 'traffic_jam',
    icon: '🚗',
    location: '仁愛路四段 東向',
    description: '可能是忠孝東路塞車分流過來的',
    severity: 'medium',
    time: '14:35',
    upvotes: 6,
    status: 'new',
    reporter: '公車乘客',
  },
]

const STATUS_CONFIG = {
  new: { label: '新回報', color: 'bg-blue-500/20 text-blue-400', icon: '🆕' },
  confirmed: { label: '已確認', color: 'bg-green-500/20 text-green-400', icon: '✅' },
  processing: { label: '處理中', color: 'bg-amber-500/20 text-amber-400', icon: '⏳' },
  dispatched: { label: '已派遣', color: 'bg-purple-500/20 text-purple-400', icon: '🚔' },
  resolved: { label: '已解決', color: 'bg-slate-500/20 text-slate-400', icon: '✓' },
}

function PublicReport() {
  const [reports, setReports] = useState(EXISTING_REPORTS)
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [severity, setSeverity] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [filter, setFilter] = useState('all')

  function handleSubmit(e) {
    e.preventDefault()
    if (!selectedType || !location || !severity) return

    const newReport = {
      id: `R${Date.now()}`,
      type: selectedType,
      icon: REPORT_TYPES.find((t) => t.id === selectedType)?.icon || '📝',
      location,
      description,
      severity,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      upvotes: 1,
      status: 'new',
      reporter: '你',
    }

    setReports((prev) => [newReport, ...prev])
    setSubmitted(true)
    setShowForm(false)
    setSelectedType('')
    setSeverity('')
    setLocation('')
    setDescription('')

    // 3 秒後重置提示
    setTimeout(() => setSubmitted(false), 4000)
  }

  function handleUpvote(reportId) {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, upvotes: r.upvotes + 1 } : r))
    )
  }

  const filteredReports = filter === 'all'
    ? reports
    : reports.filter((r) => r.severity === filter)

  const totalReports = reports.length
  const confirmedCount = reports.filter((r) => r.status === 'confirmed' || r.status === 'dispatched').length
  const highSeverityCount = reports.filter((r) => r.severity === 'high').length

  return (
    <div className="space-y-6">
      {/* 標題 + 統計 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">📢 公眾回報系統</h2>
            <p className="text-sm text-slate-400 mt-1">民眾即時回報路況，群眾外包強化系統感知能力</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-lg shadow-lg shadow-blue-500/20 transition-all"
          >
            ＋ 我要回報
          </button>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-white">{totalReports}</p>
            <p className="text-xs text-slate-400">總回報數</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-green-400">{confirmedCount}</p>
            <p className="text-xs text-slate-400">已確認/派遣</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-red-400">{highSeverityCount}</p>
            <p className="text-xs text-slate-400">嚴重事件</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-amber-400">{reports.reduce((sum, r) => sum + r.upvotes, 0)}</p>
            <p className="text-xs text-slate-400">總附議數</p>
          </div>
        </div>
      </div>

      {/* 提交成功提示 */}
      {submitted && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3 animate-pulse">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm text-green-400 font-medium">回報已送出！感謝您的協助</p>
            <p className="text-xs text-slate-400">系統將交叉比對其他數據源驗證，確認後將納入決策參考</p>
          </div>
        </div>
      )}

      {/* 回報表單 */}
      {showForm && (
        <div className="card-glass rounded-lg p-6 border border-blue-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">📝 新增回報</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 事件類型 */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">事件類型 *</label>
              <div className="grid grid-cols-4 gap-2">
                {REPORT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      selectedType === type.id
                        ? 'border-blue-500 bg-blue-500/20 scale-105'
                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-xl block">{type.icon}</span>
                    <span className="text-xs text-white block mt-1">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 嚴重程度 */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">嚴重程度 *</label>
              <div className="grid grid-cols-3 gap-2">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSeverity(opt.id)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      severity === opt.id
                        ? `border-${opt.color}-500 bg-${opt.color}-500/20`
                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                    } ${severity === opt.id ? 'ring-2 ring-blue-500/30' : ''}`}
                  >
                    <span className="text-sm font-medium text-white">{opt.label}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 地點 */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">事件地點 *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例：忠孝東路/光復南路口、市民大道地下道"
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">詳細描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="描述您看到的情況，越詳細越好..."
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* 送出 */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!selectedType || !location || !severity}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
              >
                📤 送出回報
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 回報列表 */}
      <div className="card-glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">📋 即時回報列表</h3>
          {/* 篩選 */}
          <div className="flex gap-1">
            {[
              { id: 'all', label: '全部' },
              { id: 'high', label: '🔴 嚴重' },
              { id: 'medium', label: '🟡 中等' },
              { id: 'low', label: '🟢 輕微' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  filter === f.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredReports.map((report) => {
            const statusConf = STATUS_CONFIG[report.status]
            return (
              <div key={report.id} className="bg-slate-700/30 border border-slate-700 rounded-xl p-4 transition-all hover:border-slate-600">
                <div className="flex items-start gap-3">
                  {/* 左側：icon + upvote */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">{report.icon}</span>
                    <button
                      onClick={() => handleUpvote(report.id)}
                      className="flex flex-col items-center px-2 py-1 rounded-lg bg-slate-600/50 hover:bg-blue-600/20 transition-colors group"
                      title="附議（我也看到了）"
                    >
                      <span className="text-xs group-hover:scale-125 transition-transform">👍</span>
                      <span className="text-xs text-slate-300 font-bold">{report.upvotes}</span>
                    </button>
                  </div>

                  {/* 中間：內容 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusConf.color}`}>
                        {statusConf.icon} {statusConf.label}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        report.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                        report.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {report.severity === 'high' ? '嚴重' : report.severity === 'medium' ? '中等' : '輕微'}
                      </span>
                      <span className="text-xs text-slate-500">{report.time}</span>
                    </div>
                    <p className="text-sm text-white font-medium">📍 {report.location}</p>
                    {report.description && (
                      <p className="text-xs text-slate-400 mt-1">「{report.description}」</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">回報者：{report.reporter}</p>
                  </div>

                  {/* 右側：可信度 */}
                  <div className="text-center flex-shrink-0">
                    <div className="text-sm font-bold text-white">
                      {Math.min(95, 50 + report.upvotes * 2)}%
                    </div>
                    <p className="text-xs text-slate-500">可信度</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* AI 交叉驗證說明 */}
      <div className="card-glass rounded-lg p-5 border-gradient">
        <h3 className="text-sm font-bold text-white mb-3">🤖 AI 交叉驗證機制</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-700/30 rounded-lg p-3">
            <p className="text-cyan-400 font-medium mb-1">多源比對</p>
            <p className="text-slate-400">民眾回報 × 車流感測器 × 基地台信令 = 交叉驗證</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <p className="text-amber-400 font-medium mb-1">群眾附議</p>
            <p className="text-slate-400">多人回報同一地點 → 可信度提升 → 優先處理</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <p className="text-green-400 font-medium mb-1">即時反饋</p>
            <p className="text-slate-400">回報者可追蹤處理進度：新回報→已確認→已派遣→已解決</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicReport
