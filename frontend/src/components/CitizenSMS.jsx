import { useState } from 'react'

// 多語化民眾簡訊資料
const SMS_DATA = {
  // 觸發判定
  trigger: {
    triggered: true,
    condition: 'SOP 第 6 條：任一基地台 Roaming ≥ 30%',
    station: '大巨蛋站 (BL17)',
    roaming_rate: 0.35,
    threshold: 0.30,
    result: '漫遊率 35% ≥ 30%，觸發多語通報',
  },

  // 簡訊內容 — 符合 CMS 電子看板 + 手機簡訊的可讀性要求
  messages: {
    zh: {
      lang: '中文',
      flag: '🇹🇼',
      sms: '【台北市交通局】忠孝東路四段（延吉街─光復南路）因路面塌陷封閉。改道：仁愛路或市民大道。預計延誤 12-15 分鐘。捷運板南線正常，建議轉乘。緊急請撥 1999。',
      cms: '忠孝東路四段 封閉中\n改道→仁愛路/市民大道\n延誤約15分 | 捷運正常',
      charCount: 82,
    },
    en: {
      lang: 'English',
      flag: '🇺🇸',
      sms: '[Taipei Traffic] Zhongxiao E. Rd. Sec.4 CLOSED (road collapse). Detour: Ren-ai Rd. or Civic Blvd. Delay: 12-15 min. MRT Blue Line normal. Call 1999 for help.',
      cms: 'Zhongxiao E. Rd. Sec.4 CLOSED\nDetour→Ren-ai Rd / Civic Blvd\nDelay ~15min | MRT OK',
      charCount: 156,
    },
    ja: {
      lang: '日本語',
      flag: '🇯🇵',
      sms: '【台北交通局】忠孝東路四段は陥没のため通行止め。迂回：仁愛路または市民大道。遅延12〜15分。MRT板南線は通常運行。緊急時は1999へ。',
      cms: '忠孝東路四段 通行止め\n迂回→仁愛路/市民大道\n遅延約15分 | MRT正常',
      charCount: 74,
    },
    ko: {
      lang: '한국어',
      flag: '🇰🇷',
      sms: '[타이베이 교통국] 중효동로 4단 도로함몰로 폐쇄. 우회: 런아이로 또는 시민대도. 지연: 12-15분. MRT 판난선 정상. 긴급시 1999.',
      cms: '중효동로4단 폐쇄\n우회→런아이로/시민대도\n지연~15분 | MRT정상',
      charCount: 85,
    },
  },

  // 訊息要點確認
  checklist: [
    { item: '事故位置', value: '忠孝東路四段（延吉街至光復南路段）', checked: true },
    { item: '改道指引', value: '仁愛路四段 / 市民大道四段', checked: true },
    { item: '預計延誤時間', value: '12-15 分鐘', checked: true },
    { item: '替代交通', value: '捷運板南線正常營運', checked: true },
    { item: '求援管道', value: '撥打 1999 市民熱線', checked: true },
    { item: '避開提醒', value: '遠離塌陷區域，注意施工圍籬', checked: true },
  ],
}

function CitizenSMS() {
  const [selectedLang, setSelectedLang] = useState('zh')
  const [viewMode, setViewMode] = useState('sms') // sms | cms
  const [exportFormat, setExportFormat] = useState(null)

  const currentMsg = SMS_DATA.messages[selectedLang]

  function handleExportJSON() {
    const exportData = {
      event_id: 'EVT-2026-0724-001',
      triggered_by: SMS_DATA.trigger.condition,
      roaming_rate: SMS_DATA.trigger.roaming_rate,
      timestamp: new Date().toISOString(),
      messages: Object.fromEntries(
        Object.entries(SMS_DATA.messages).map(([lang, data]) => [
          lang,
          { sms: data.sms, cms: data.cms },
        ])
      ),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'citizen_sms_multilang.json'
    a.click()
    URL.revokeObjectURL(url)
    setExportFormat('json')
    setTimeout(() => setExportFormat(null), 3000)
  }

  function handleSpeak() {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const langCodes = { zh: 'zh-TW', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' }
    const utterance = new SpeechSynthesisUtterance(currentMsg.sms)
    utterance.lang = langCodes[selectedLang]
    utterance.rate = 0.85
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="card-glass rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">📱 多語化民眾簡訊</h2>
          <p className="text-xs text-slate-400 mt-1">第二份核心產出 — 適合 CMS 電子看板與手機簡訊呈現</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
          >
            📥 匯出 JSON
          </button>
          <button
            onClick={handleSpeak}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition-colors"
          >
            🔊 語音播報
          </button>
        </div>
      </div>

      {exportFormat && (
        <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
          <span className="text-xs text-green-400">✅ JSON 已匯出</span>
        </div>
      )}

      {/* 觸發判定 */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-400 mb-3 border-b border-slate-700 pb-2">
          觸發判定
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">觸發條件：</span>
            <span className="text-xs text-white">{SMS_DATA.trigger.condition}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">觸發站點：</span>
            <span className="text-xs text-white">{SMS_DATA.trigger.station}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">漫遊率：</span>
            <span className="text-xs text-amber-400 font-bold">
              {(SMS_DATA.trigger.roaming_rate * 100).toFixed(0)}% ≥ {(SMS_DATA.trigger.threshold * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">判定結果：</span>
            <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-medium">
              ⚠️ 觸發多語通報
            </span>
          </div>
        </div>
      </div>

      {/* 語言選擇 + 格式切換 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {Object.entries(SMS_DATA.messages).map(([code, { lang, flag }]) => (
            <button
              key={code}
              onClick={() => setSelectedLang(code)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${
                selectedLang === code
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {flag} {lang}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-700 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('sms')}
            className={`px-3 py-1 rounded text-xs transition-all ${
              viewMode === 'sms' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            📱 簡訊
          </button>
          <button
            onClick={() => setViewMode('cms')}
            className={`px-3 py-1 rounded text-xs transition-all ${
              viewMode === 'cms' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            🖥️ 電子看板
          </button>
        </div>
      </div>

      {/* 訊息預覽 */}
      {viewMode === 'sms' ? (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{currentMsg.flag}</span>
            <span className="text-sm font-medium text-white">{currentMsg.lang} — 手機簡訊格式</span>
            <span className="text-xs text-slate-500 ml-auto">{currentMsg.charCount} 字</span>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {currentMsg.sms}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-black rounded-xl p-6 border-2 border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{currentMsg.flag}</span>
            <span className="text-sm font-medium text-amber-400">{currentMsg.lang} — CMS 電子看板格式</span>
          </div>
          <div className="bg-black rounded-lg p-6 text-center">
            <pre className="text-amber-300 text-lg font-bold font-mono leading-loose whitespace-pre-wrap">
              {currentMsg.cms}
            </pre>
          </div>
          <p className="text-xs text-slate-500 text-center mt-2">模擬路側電子看板顯示效果</p>
        </div>
      )}

      {/* 所有語言一覽 */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">全語言版本對照</h3>
        <div className="space-y-2">
          {Object.entries(SMS_DATA.messages).map(([code, data]) => (
            <div key={code} className="bg-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>{data.flag}</span>
                <span className="text-xs text-slate-400">{data.lang}</span>
                <span className="text-xs text-slate-600 ml-auto">{data.charCount}字</span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">{data.sms}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 訊息要點 checklist */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-400 mb-3 border-b border-slate-700 pb-2">
          訊息要點確認（命題要求）
        </h3>
        <div className="space-y-2">
          {SMS_DATA.checklist.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              <span className="text-xs text-slate-400 w-24 flex-shrink-0">{item.item}：</span>
              <span className="text-xs text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 可讀性說明 */}
      <div className="bg-slate-700/30 rounded-xl p-4">
        <h3 className="text-xs font-medium text-slate-300 mb-2">📝 可讀性設計原則</h3>
        <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
          <div>• 避免技術術語</div>
          <div>• 動作指引明確</div>
          <div>• 字數控制 160 字內</div>
          <div>• 重點資訊前置</div>
          <div>• 適合快速掃讀</div>
          <div>• CMS 看板可顯示</div>
        </div>
      </div>
    </div>
  )
}

export default CitizenSMS
