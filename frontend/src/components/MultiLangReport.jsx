import { useState, useEffect } from 'react'
import { fetchMultiLangReport } from '../services/api'
import NotificationDispatch from './NotificationDispatch'
import AffectedAreaMap from './AffectedAreaMap'
import DispatchStatus from './DispatchStatus'
import { dispatchHistory, evacuationRoutes } from '../services/mockData'
import { useSimClock } from '../hooks/useSimClock.jsx'

const LANG_LABELS = {
  zh: { name: '中文', flag: '🇹🇼' },
  en: { name: 'English', flag: '🇺🇸' },
  ja: { name: '日本語', flag: '🇯🇵' },
  ko: { name: '한국어', flag: '🇰🇷' },
}

function MultiLangReport({ incidentResult }) {
  const [report, setReport] = useState(null)
  const [selectedLang, setSelectedLang] = useState('zh')
  const [loading, setLoading] = useState(true)
  const [dispatchedChannels, setDispatchedChannels] = useState([])
  const { currentTime } = useSimClock()

  // 通報觸發條件：SimClock >= 22:10 或 已有事件注入結果
  const eventTriggered = currentTime >= '22:10' || !!incidentResult

  useEffect(() => {
    loadReport()
  }, [])

  // 事件注入後：優先使用 Agent 產出的多語通報
  useEffect(() => {
    if (incidentResult?.agent_structured?.multilang) {
      const agentML = incidentResult.agent_structured.multilang
      setReport({
        roaming_rate: agentML.roaming_rate || 0.45,
        triggered: agentML.triggered !== false,
        trigger_station: agentML.station || '',
        reports: {
          zh: agentML.zh || '',
          en: agentML.en || '',
          ja: agentML.ja || '',
          ko: agentML.ko || '',
        },
        llm_generated: true,
      })
      setLoading(false)
    } else if (incidentResult) {
      loadReport()
    }
  }, [incidentResult])

  async function loadReport() {
    try {
      const data = await fetchMultiLangReport()
      setReport(data)
    } catch (err) {
      console.error('載入多語通報失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleDispatch(channels) {
    setDispatchedChannels(channels)
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 animate-pulse">
        <div className="h-48 bg-slate-700 rounded"></div>
      </div>
    )
  }

  if (!report) return null

  if (!eventTriggered) {
    return (
      <div className="card-glass rounded-lg p-8 text-center">
        <span className="text-4xl block mb-3">📡</span>
        <h2 className="text-lg font-bold text-white">通報發佈</h2>
        <p className="text-sm text-slate-400 mt-2">目前尚無事件觸發通報。</p>
        <p className="text-xs text-slate-500 mt-1">當事件發生且漫遊率 ≥ 30% 時，系統將自動產出多語通報。</p>
        <p className="text-xs text-slate-600 mt-3 font-mono">模擬時間：{currentTime} ｜ 等待事件觸發...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* === 第一排：漫遊率 + 多語通報內容 === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 漫遊率觸發條件 */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">📡 漫遊率偵測</h2>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400">
                {(report.roaming_rate * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-slate-400 mt-1">目前區域漫遊率</p>
            </div>

            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>0%</span>
                <span className="text-amber-400">閾值 30%</span>
                <span>100%</span>
              </div>
              <div className="w-full h-3 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500"
                  style={{ width: `${report.roaming_rate * 100}%` }}
                ></div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${
              report.triggered
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-green-500 bg-green-500/10'
            }`}>
              <p className="text-sm font-medium">
                {report.triggered
                  ? '⚠️ 已觸發多語通報（SOP 第 6 條）'
                  : '✅ 未達觸發閾值'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {report.triggered
                  ? '漫遊率 ≥ 30%，自動發送中/英/日/韓通報'
                  : '持續監測中'}
              </p>
            </div>
          </div>
        </div>

        {/* 多語通報內容 */}
        <div className="lg:col-span-2 bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">🌐 多語化全通路通報</h2>

          {/* 語言切換 */}
          <div className="flex gap-2 mb-4">
            {Object.entries(LANG_LABELS).map(([code, { name, flag }]) => (
              <button
                key={code}
                onClick={() => setSelectedLang(code)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedLang === code
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {flag} {name}
              </button>
            ))}
          </div>

          {/* 通報內容 */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{LANG_LABELS[selectedLang].flag}</span>
              <span className="text-sm font-medium text-slate-300">{LANG_LABELS[selectedLang].name}</span>
            </div>
            <p className="text-base text-slate-200 leading-relaxed">
              {report.reports[selectedLang]}
            </p>
          </div>

          {/* 全部語言預覽 */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">所有語言版本：</h3>
            <div className="space-y-2">
              {Object.entries(report.reports).map(([code, text]) => (
                <div key={code} className="bg-slate-700/50 rounded p-2">
                  <span className="text-xs text-slate-400">
                    {LANG_LABELS[code].flag} {LANG_LABELS[code].name}：
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === 第二排：受影響範圍 + 疏散路線 === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AffectedAreaMap incidentResult={incidentResult} />

        {/* 疏散路線建議 */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">🛤️ 疏散路線建議</h2>
          <div className="space-y-3">
            {evacuationRoutes.map((route) => (
              <div key={route.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{route.direction}</span>
                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                    ETE {route.ete}
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <p><span className="text-red-400">起點：</span>{route.from}</p>
                  <p><span className="text-green-400">終點：</span>{route.to}</p>
                  <p><span className="text-slate-400">距離：</span>{route.distance}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-600">
                  <p className="text-xs text-amber-400">🚦 {route.signalAdjust}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === 第三排：通知發送管道 + 發送狀態 === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NotificationDispatch onDispatch={handleDispatch} />
        <DispatchStatus dispatchedChannels={dispatchedChannels} />
      </div>

      {/* === 第四排：發送歷史紀錄 === */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">📜 通知發送歷史</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left">
                <th className="pb-3 text-slate-400 font-medium">時間</th>
                <th className="pb-3 text-slate-400 font-medium">事件</th>
                <th className="pb-3 text-slate-400 font-medium">管道</th>
                <th className="pb-3 text-slate-400 font-medium">觸及人數</th>
                <th className="pb-3 text-slate-400 font-medium">送達率</th>
                <th className="pb-3 text-slate-400 font-medium">狀態</th>
              </tr>
            </thead>
            <tbody>
              {dispatchHistory.map((record) => (
                <tr key={record.id} className="border-b border-slate-700/50">
                  <td className="py-3 text-slate-300">{record.time}</td>
                  <td className="py-3 text-white">{record.event}</td>
                  <td className="py-3 text-slate-300">{record.channels.length} 個管道</td>
                  <td className="py-3 text-slate-300">{record.reach.toLocaleString()}</td>
                  <td className="py-3">
                    <span className="text-green-400">{(record.deliveryRate * 100).toFixed(0)}%</span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                      已完成
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default MultiLangReport
