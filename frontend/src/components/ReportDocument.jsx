import { useState } from 'react'

const REPORT_DATA = {
  // 1. 事件辨識
  event: {
    event_id: 'EVT-2026-0724-001',
    description: '忠孝東路四段（延吉街至光復南路段）路面塌陷',
    time: '2026-07-24 14:32:05',
    sop_clauses: ['第 2 條（主疏散規則）', '第 6 條（多語通報）', '第 7 條（ETE 計算）'],
    source: 'live_incidents.json — event_type: road_collapse',
  },
  // 2. 交通分級判定
  classification: {
    level: 'A',
    criteria: [
      '忠孝東路四段飽和度 92% > 90%（A 級門檻）',
      '影響路段數 3 段 ≥ 3（A 級條件）',
      '事故類型：完全阻斷（雙向封閉）',
    ],
    traffic_data: {
      saturation: 0.92,
      flow_rate: 1656,
      capacity: 1800,
      affected_roads: 3,
    },
  },
  // 3. 替代路徑建議
  routes: {
    primary: {
      name: '仁愛路四段 → 復興南路 → 忠孝東路五段',
      ete: '12 分鐘',
      saturation: '58%',
      reason: '飽和度最低、距事故點最近、餘量 924 車/時',
    },
    secondary: {
      name: '市民大道四段 → 光復南路',
      ete: '15 分鐘',
      saturation: '62%',
      reason: '雙向六車道、容量充足、餘量 950 車/時',
    },
    excluded: [
      { name: '基隆路一段', reason: '飽和度 94% 超過 85% 閾值' },
      { name: '光復南路（南段）', reason: '承載餘量不足（< 200 車/時）' },
      { name: '松仁路', reason: '施工佔道（live_incidents 事件）' },
    ],
  },
  // 4. 號誌調整建議
  signals: [
    {
      intersection: '忠孝東路/復興南路口',
      action: '南北向綠燈延長 +25%（現 40s → 50s）',
      period: '14:35 ~ 事件解除',
    },
    {
      intersection: '仁愛路/大安路口',
      action: '增設東向左轉專用相位（10s）',
      period: '14:35 ~ 事件解除',
    },
    {
      intersection: '市民大道/復興北路口',
      action: '東西向綠燈延長 +15%（現 45s → 52s）',
      period: '14:40 ~ 車流回穩',
    },
  ],
  // 5. 跨系統聯動
  coordination: [
    { target: '臺北捷運公司', action: '板南線忠孝復興站加開疏運列車', sop: '第 3 條' },
    { target: '公車處', action: '212、232 路線臨時改道仁愛路', sop: '第 3 條' },
    { target: '交通大隊', action: '派員忠孝/復興路口手動指揮', sop: '第 5 條' },
    { target: '工務局', action: '塌陷搶修工班進場', sop: '第 2 條' },
  ],
}

function ReportDocument({ incidentResult }) {
  const [expanded, setExpanded] = useState(true)

  // Use dynamic data from incidentResult if available, otherwise fallback to hardcoded
  const agent = incidentResult?.agent_structured
  const data = agent ? {
    event: {
      event_id: agent.situation?.event_id || REPORT_DATA.event.event_id,
      description: agent.situation?.description || REPORT_DATA.event.description,
      time: agent.situation?.time || REPORT_DATA.event.time,
      sop_clauses: agent.situation?.sop_clauses || REPORT_DATA.event.sop_clauses,
      source: agent.situation?.source || REPORT_DATA.event.source,
    },
    classification: {
      level: agent.classification?.level || REPORT_DATA.classification.level,
      criteria: agent.classification?.criteria || REPORT_DATA.classification.criteria,
      traffic_data: agent.classification?.traffic_data || REPORT_DATA.classification.traffic_data,
    },
    routes: {
      primary: agent.alternatives?.primary || REPORT_DATA.routes.primary,
      secondary: agent.alternatives?.secondary || REPORT_DATA.routes.secondary,
      excluded: agent.alternatives?.excluded || REPORT_DATA.routes.excluded,
    },
    signals: agent.sop_actions?.signals || REPORT_DATA.signals,
    coordination: agent.sop_actions?.coordination || REPORT_DATA.coordination,
    ete: agent.ete || null,
    guidance_text: agent.guidance_text || null,
  } : REPORT_DATA

  function handlePrint() {
    window.print()
  }

  function handleExportMarkdown() {
    const md = generateMarkdown()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `交控中心建議書_${data.event.event_id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function generateMarkdown() {
    return `# 交控中心建議書

## 一、事件辨識

- **事件編號**：${data.event.event_id}
- **事件描述**：${data.event.description}
- **發生時間**：${data.event.time}
- **對應 SOP**：${data.event.sop_clauses.join('、')}
- **來源**：${data.event.source}

## 二、交通分級判定

**判定結果：${data.classification.level} 級**

判定依據：
${data.classification.criteria.map((c) => `- ${c}`).join('\n')}

數據引用：
- 飽和度：${(data.classification.traffic_data.saturation * 100).toFixed(0)}%
- 車流量：${data.classification.traffic_data.flow_rate}/${data.classification.traffic_data.capacity} 車/時
- 影響路段：${data.classification.traffic_data.affected_roads} 段

## 三、替代路徑建議

### 主要疏散路線
- **路線**：${data.routes.primary.name}
- **ETE**：${data.routes.primary.ete}
- **飽和度**：${data.routes.primary.saturation}
- **選用理由**：${data.routes.primary.reason}

### 次要替代路線
- **路線**：${data.routes.secondary.name}
- **ETE**：${data.routes.secondary.ete}
- **飽和度**：${data.routes.secondary.saturation}
- **選用理由**：${data.routes.secondary.reason}

### 排除路線
${data.routes.excluded.map((r) => `- **${r.name}**：${r.reason}`).join('\n')}

## 四、號誌調整建議

| 路口 | 調整內容 | 時段 |
|------|---------|------|
${data.signals.map((s) => `| ${s.intersection} | ${s.action} | ${s.period} |`).join('\n')}

## 五、跨系統聯動

| 單位 | 請求動作 | 依據 SOP |
|------|---------|----------|
${data.coordination.map((c) => `| ${c.target} | ${c.action} | ${c.sop} |`).join('\n')}

---
*產出時間：${new Date().toLocaleString('zh-TW')} ｜ 系統自動生成*
`
  }

  return (
    <div className="card-glass rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">📄 交控中心建議書</h2>
          <p className="text-xs text-slate-400 mt-1">
            事件 {data.event.event_id} ｜ {data.event.time}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors"
          >
            {expanded ? '收合' : '展開'}
          </button>
          <button
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
          >
            📥 匯出 Markdown
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
          >
            🖨️ 列印
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-6 print:space-y-4" id="report-content">
          {/* 一、事件辨識 */}
          <section className="border border-slate-700 rounded-lg p-4">
            <h3 className="text-base font-semibold text-blue-400 mb-3 border-b border-slate-700 pb-2">
              一、事件辨識
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400">事件編號：</span>
                <span className="text-white font-mono">{data.event.event_id}</span>
              </div>
              <div>
                <span className="text-slate-400">發生時間：</span>
                <span className="text-white">{data.event.time}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-400">事件描述：</span>
                <span className="text-white">{data.event.description}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-400">對應 SOP：</span>
                <span className="text-amber-400">{data.event.sop_clauses.join('、')}</span>
              </div>
            </div>
          </section>

          {/* 二、交通分級判定 */}
          <section className="border border-slate-700 rounded-lg p-4">
            <h3 className="text-base font-semibold text-blue-400 mb-3 border-b border-slate-700 pb-2">
              二、交通分級判定
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 text-lg font-bold rounded-lg">
                {data.classification.level} 級
              </span>
              <span className="text-sm text-slate-300">最高嚴重等級</span>
            </div>
            <div className="space-y-1 text-sm">
              {data.classification.criteria.map((c, i) => (
                <p key={i} className="text-slate-300">• {c}</p>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="bg-slate-700/50 rounded p-2 text-center">
                <p className="text-lg font-bold text-red-400">{(data.classification.traffic_data.saturation * 100).toFixed(0)}%</p>
                <p className="text-xs text-slate-400">飽和度</p>
              </div>
              <div className="bg-slate-700/50 rounded p-2 text-center">
                <p className="text-lg font-bold text-white">{data.classification.traffic_data.flow_rate}</p>
                <p className="text-xs text-slate-400">車流量/時</p>
              </div>
              <div className="bg-slate-700/50 rounded p-2 text-center">
                <p className="text-lg font-bold text-amber-400">{data.classification.traffic_data.affected_roads}</p>
                <p className="text-xs text-slate-400">影響路段</p>
              </div>
            </div>
          </section>

          {/* 三、替代路徑建議 */}
          <section className="border border-slate-700 rounded-lg p-4">
            <h3 className="text-base font-semibold text-blue-400 mb-3 border-b border-slate-700 pb-2">
              三、替代路徑建議
            </h3>
            <div className="space-y-3">
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-green-400">🥇 主要疏散路線</span>
                  <span className="text-xs text-green-400">ETE {data.routes.primary.ete}</span>
                </div>
                <p className="text-sm text-white">{data.routes.primary.name}</p>
                <p className="text-xs text-slate-400 mt-1">理由：{data.routes.primary.reason}</p>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-blue-400">🥈 次要替代路線</span>
                  <span className="text-xs text-blue-400">ETE {data.routes.secondary.ete}</span>
                </div>
                <p className="text-sm text-white">{data.routes.secondary.name}</p>
                <p className="text-xs text-slate-400 mt-1">理由：{data.routes.secondary.reason}</p>
              </div>
              <div className="mt-2">
                <p className="text-xs text-slate-400 mb-1">排除路線：</p>
                {data.routes.excluded.map((r, i) => (
                  <p key={i} className="text-xs text-red-400">✕ {r.name}：{r.reason}</p>
                ))}
              </div>
            </div>
          </section>

          {/* 四、號誌調整建議 */}
          <section className="border border-slate-700 rounded-lg p-4">
            <h3 className="text-base font-semibold text-blue-400 mb-3 border-b border-slate-700 pb-2">
              四、號誌調整建議
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 text-slate-400 font-medium">路口</th>
                    <th className="text-left py-2 text-slate-400 font-medium">調整內容</th>
                    <th className="text-left py-2 text-slate-400 font-medium">時段</th>
                  </tr>
                </thead>
                <tbody>
                  {data.signals.map((s, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="py-2 text-white">{s.intersection}</td>
                      <td className="py-2 text-slate-300">{s.action}</td>
                      <td className="py-2 text-slate-400 text-xs">{s.period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 五、跨系統聯動 */}
          <section className="border border-slate-700 rounded-lg p-4">
            <h3 className="text-base font-semibold text-blue-400 mb-3 border-b border-slate-700 pb-2">
              五、跨系統聯動
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 text-slate-400 font-medium">單位</th>
                    <th className="text-left py-2 text-slate-400 font-medium">請求動作</th>
                    <th className="text-left py-2 text-slate-400 font-medium">依據</th>
                  </tr>
                </thead>
                <tbody>
                  {data.coordination.map((c, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="py-2 text-white">{c.target}</td>
                      <td className="py-2 text-slate-300">{c.action}</td>
                      <td className="py-2 text-amber-400 text-xs">{c.sop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ETE 區段（動態資料時顯示） */}
          {data.ete && (
            <section className="border border-slate-700 rounded-lg p-4">
              <h3 className="text-base font-semibold text-blue-400 mb-3 border-b border-slate-700 pb-2">
                六、ETE 預估
              </h3>
              <p className="text-sm text-slate-300">{typeof data.ete === 'string' ? data.ete : JSON.stringify(data.ete)}</p>
            </section>
          )}

          {/* 導引文字（動態資料時顯示） */}
          {data.guidance_text && (
            <section className="border border-slate-700 rounded-lg p-4">
              <h3 className="text-base font-semibold text-blue-400 mb-3 border-b border-slate-700 pb-2">
                七、民眾導引
              </h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{data.guidance_text}</p>
            </section>
          )}

          {/* 簽章行 */}
          <div className="text-xs text-slate-500 border-t border-slate-700 pt-3 flex items-center justify-between">
            <span>產出時間：{new Date().toLocaleString('zh-TW')} ｜ 系統自動生成</span>
            <span>城市應變分析 AI Agent v1.0</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportDocument
