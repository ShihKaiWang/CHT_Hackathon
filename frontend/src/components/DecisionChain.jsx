import { useState } from 'react'
import { mockIncidentResponse } from '../services/mockData'

function DecisionChain() {
  const [showReport, setShowReport] = useState(false)

  const steps = [
    { id: 1, label: '事件偵測', status: 'done', detail: '系統偵測忠孝東路四段飽和度異常（92%）' },
    { id: 2, label: 'SOP 匹配', status: 'done', detail: '匹配 SOP 第 2 條：路段飽和度 ≥ 90% 需啟動疏導' },
    { id: 3, label: '路網分析', status: 'done', detail: '計算替代路徑 2 條，ETE 分別為 12/15 分鐘' },
    { id: 4, label: '號誌調整建議', status: 'done', detail: '建議調整 2 個路口號誌配時' },
    { id: 5, label: '漫遊率檢測', status: 'done', detail: '漫遊率 35%，觸發多語通報（SOP 第 6 條）' },
    { id: 6, label: '建議書產出', status: 'done', detail: '交控中心建議書已生成，含完整決策鏈' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 決策鏈 */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">🧠 AI 決策推理鏈</h2>
        <div className="space-y-1">
          {steps.map((step, i) => (
            <div key={step.id} className="flex gap-3">
              {/* 連接線 */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                  <span className="text-green-400 text-xs font-bold">{step.id}</span>
                </div>
                {i < steps.length - 1 && <div className="w-0.5 h-8 bg-green-500/30"></div>}
              </div>
              {/* 內容 */}
              <div className="flex-1 pb-4">
                <p className="text-sm font-medium text-white">{step.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 建議書 */}
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">📄 交控中心建議書</h2>
          <button
            onClick={() => setShowReport(!showReport)}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            {showReport ? '收合' : '展開建議書'}
          </button>
        </div>

        {showReport ? (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-4 text-sm">
            <div>
              <h3 className="text-blue-400 font-medium">一、事件摘要</h3>
              <p className="text-slate-300 mt-1">
                {mockIncidentResponse.event}，影響路段：{mockIncidentResponse.affected_roads.join('、')}
              </p>
            </div>
            <div>
              <h3 className="text-blue-400 font-medium">二、ETE 分析</h3>
              <div className="mt-1 space-y-1">
                {mockIncidentResponse.alternative_routes.map((r, i) => (
                  <p key={i} className="text-slate-300">
                    路線 {i + 1}：{r.path}（預估 {r.ete}）
                  </p>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-blue-400 font-medium">三、號誌調控建議</h3>
              <div className="mt-1 space-y-1">
                {mockIncidentResponse.signal_adjustments.map((s, i) => (
                  <p key={i} className="text-slate-300">
                    • {s.intersection}：{s.action}
                  </p>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-blue-400 font-medium">四、依據 SOP</h3>
              <p className="text-slate-300 mt-1">第 2 條（路網重規劃）、第 6 條（多語通報）、第 7 條（建議書產出）</p>
            </div>
            <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">
              產出時間：{new Date().toLocaleString('zh-TW')} ｜ 系統自動生成
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-500">
            <p className="text-sm">點擊「展開建議書」查看完整報告</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DecisionChain
