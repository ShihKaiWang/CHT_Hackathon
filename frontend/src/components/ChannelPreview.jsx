import { useState } from 'react'

const CHANNEL_DATA = {
  cbs: {
    name: 'Cell Broadcast',
    icon: '📡',
    mission: '在重大事件發生時，讓特定基地台範圍內的所有人，第一時間知道「哪裡不能去、現在該怎麼做」。',
    coreVerb: '立即避開',
    languages: ['zh'],
    languageReason: 'CBS 接收者包含行人、居民、旅客，不只駕駛。文案不放連結，不加背景說明，避免緊急情境中判斷資訊真偽。需同時涵蓋：發生什麼事、在哪裡、是否需避開、駕駛走哪、延誤多久。',
  },
  sms: {
    name: 'SMS 簡訊',
    icon: '💬',
    mission: '針對即將進入管制區、曾出現在附近基地台，或特定旅客族群，提供更具體的行動指引。',
    coreVerb: '提前改道',
    languages: ['zh', 'en'],
    languageReason: 'SMS 比 CBS 更適合分眾，可依基地台或使用者狀態切換版本。簡訊可放短連結，但主要行動仍要在不點擊的情況下看得懂。外國旅客使用英文版。',
  },
  signboard: {
    name: '電子看板 / CMS',
    icon: '🖥️',
    mission: '讓正在移動中的駕駛，在數秒內完成「看到、理解、轉向」。',
    coreVerb: '前方轉向',
    languages: ['position_a', 'position_b', 'position_c'],
    languageReason: '駕駛經過看板只有很短的閱讀時間。CMS 最重要的是「位置＋方向＋動作」，不同位置的看板應顯示不同內容。不適合放太長原因、QR Code 或三條以上替代路線。',
  },
  app: {
    name: 'APP 推播',
    icon: '📱',
    mission: '根據使用者目前位置、目的地與交通方式，提供個人化建議並讓使用者立即採取行動。',
    coreVerb: '接受新路線',
    languages: ['driver', 'transit', 'pedestrian'],
    languageReason: 'APP 知道使用者在哪裡、去哪裡、用什麼運具。文案不應只說「道路封閉」，而應回答：「這件事對我的行程有什麼影響？」顯示「多 12 分鐘」比「可能壅塞」更有行動力。',
  },
  social: {
    name: '社群廣播',
    icon: '📢',
    mission: '提供完整事件背景、持續更新與可分享資訊，避免謠言和錯誤資訊擴散。',
    coreVerb: '查看並分享更新',
    languages: ['zh'],
    languageReason: '社群貼文需加入：清楚的更新時間、下次更新時間、不同族群行動建議、官方連結。「下次更新時間」能降低民眾反覆詢問。民眾可能轉傳、留言、截圖、事後才看到。',
  },
  navigation: {
    name: '導航平台',
    icon: '🗺️',
    mission: '不只告知事故，而是直接把訊息轉化成新的行駛路線。',
    coreVerb: '立即重規劃',
    languages: ['banner', 'voice'],
    languageReason: '導航中的民眾已在移動，不需閱讀完整事故新聞。只需知道：前方能否通行、是否已改道、新路線多多少時間、下個轉向是什麼。系統應直接提供可執行新路徑，不讓駕駛自行決定。',
  },
}

export default function ChannelPreview({ selectedChannels, onClose }) {
  const [activeChannel, setActiveChannel] = useState(selectedChannels[0] || 'cbs')
  const [activeVariant, setActiveVariant] = useState(0)
  const channel = CHANNEL_DATA[activeChannel]
  if (!channel) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 p-5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">📤 通知管道發送預覽</h2>
              <p className="text-xs text-slate-400 mt-0.5">查看各管道的實際呈現方式與文案策略</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors">✕</button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* 管道切換 */}
          <div className="flex gap-2 flex-wrap">
            {selectedChannels.map((chId) => {
              const ch = CHANNEL_DATA[chId]
              if (!ch) return null
              return (
                <button key={chId} onClick={() => { setActiveChannel(chId); setActiveVariant(0) }}
                  className={`px-4 py-2.5 rounded-xl text-sm transition-all ${activeChannel === chId ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  {ch.icon} {ch.name}
                </button>
              )
            })}
          </div>

          {/* 管道任務說明 */}
          <div className="bg-slate-700/30 border border-slate-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{channel.icon}</span>
              <div>
                <h3 className="text-base font-bold text-white">{channel.name}</h3>
                <p className="text-sm text-slate-300 mt-1">{channel.mission}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">核心動詞：{channel.coreVerb}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 語言/文案策略 */}
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-indigo-400 mb-2">💡 為什麼這樣設計？</h4>
            <p className="text-sm text-slate-300 leading-relaxed">{channel.languageReason}</p>
          </div>

          {/* 訊息預覽 — 依管道不同 */}
          {activeChannel === 'cbs' && <CBSPreview />}
          {activeChannel === 'sms' && <SMSPreview />}
          {activeChannel === 'signboard' && <CMSPreview />}
          {activeChannel === 'app' && <APPPreview />}
          {activeChannel === 'social' && <SocialPreview />}
          {activeChannel === 'navigation' && <NavPreview />}
        </div>
      </div>
    </div>
  )
}

function CBSPreview() {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-slate-300">模擬呈現：手機緊急警報彈窗</h4>
      <div className="bg-gradient-to-b from-red-900 to-red-950 border-2 border-red-500 rounded-2xl p-6 max-w-sm mx-auto shadow-2xl">
        <div className="text-center mb-3">
          <span className="text-3xl">⚠️</span>
          <p className="text-red-200 text-sm font-bold mt-1">【重大交通警報】忠孝東路四段封閉</p>
        </div>
        <p className="text-white text-sm leading-relaxed text-center">
          忠孝東路四段「光復南路至延吉街」因路面塌陷雙向封閉。請立即避開事故區域，車輛改走仁愛路四段或市民大道，預估延誤約 30 分鐘。請依現場人員指示通行。
        </p>
        <div className="mt-5 text-center">
          <button className="px-8 py-2.5 bg-red-600 text-white text-sm rounded-full font-medium">確定</button>
        </div>
        <p className="text-red-400/50 text-xs text-center mt-3">台北市政府交通局</p>
      </div>
    </div>
  )
}

function SMSPreview() {
  const [lang, setLang] = useState('zh')
  const msgs = {
    zh: '【城市交通通知】您目前可能接近忠孝東路四段管制區。光復南路至延吉街因路面塌陷雙向封閉，請於進入事故區前提前改道。前往信義區建議改走仁愛路四段或市民大道，預估延誤約 30 分鐘。即時路況與替代路線：https://tpe.traffic/r/3kF',
    en: '【Traffic Alert】Sec. 4, Zhongxiao E. Rd. between Guangfu S. Rd. and Yanji St. is closed due to a road collapse. Please use Sec. 4, Ren\'ai Rd. or Civic Blvd. Expected delay: 30 minutes. Updates: https://tpe.traffic/r/3kF',
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-slate-300">模擬呈現：手機簡訊</h4>
        <div className="flex gap-1 ml-auto">
          <button onClick={() => setLang('zh')} className={`px-2 py-1 rounded text-xs ${lang === 'zh' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>🇹🇼 中文</button>
          <button onClick={() => setLang('en')} className={`px-2 py-1 rounded text-xs ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>🇺🇸 English</button>
        </div>
      </div>
      <div className="bg-slate-200 rounded-2xl p-5 max-w-sm mx-auto">
        <p className="text-center text-xs text-slate-500 mb-3">簡訊</p>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">台北市交通局 · 14:33</p>
          <p className="text-sm text-slate-900 leading-relaxed">{msgs[lang]}</p>
        </div>
      </div>
      <div className="bg-slate-700/30 rounded-lg p-3 text-xs text-slate-400">
        <p><strong className="text-slate-300">分眾邏輯：</strong>依基地台判斷用戶狀態</p>
        <p className="mt-1">• 即將進入事故區 → 提前轉向位置</p>
        <p>• 已在事故區 → 離開方向</p>
        <p>• 外國旅客 → 英文版本</p>
      </div>
    </div>
  )
}

function CMSPreview() {
  const [position, setPosition] = useState('a')
  const boards = {
    a: { label: '事故前方 2km', content: '忠孝東路前方封閉\n改走仁愛路／市民大道\n請提前改道' },
    b: { label: '上游路口 500m', content: '忠孝東路禁止進入\n前方右轉改走仁愛路\n延誤約30分鐘' },
    c: { label: '事故核心區', content: '前方事故管制\n禁止進入\n依警察指示通行' },
  }
  const board = boards[position]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-slate-300">模擬呈現：路側電子看板</h4>
        <div className="flex gap-1 ml-auto">
          {Object.entries(boards).map(([k, v]) => (
            <button key={k} onClick={() => setPosition(k)} className={`px-2 py-1 rounded text-xs ${position === k ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>{v.label}</button>
          ))}
        </div>
      </div>
      <div className="bg-black border-4 border-slate-600 rounded-lg p-8 max-w-md mx-auto">
        <p className="text-xs text-slate-600 text-center mb-2">📍 看板位置：{board.label}</p>
        <div className="border border-amber-500/30 rounded p-5">
          <pre className="text-amber-400 text-xl font-bold font-mono text-center whitespace-pre-wrap leading-loose">{board.content}</pre>
        </div>
      </div>
      <div className="bg-slate-700/30 rounded-lg p-3 text-xs text-slate-400">
        <p><strong className="text-slate-300">位置邏輯：</strong>不同看板依位置自動切換</p>
        <p className="mt-1">• 2km 前：提醒提前改道</p>
        <p>• 500m 前：明確轉向方向</p>
        <p>• 核心區：禁止進入</p>
      </div>
    </div>
  )
}

function APPPreview() {
  const [persona, setPersona] = useState('driver')
  const personas = {
    driver: {
      label: '🚗 自駕者',
      title: '前方 800 公尺道路封閉',
      body: '忠孝東路四段因路面塌陷管制，已為您找到仁愛路替代路線，預估行程增加 12 分鐘。',
      buttons: ['接受新路線', '查看事故資訊'],
    },
    transit: {
      label: '🚇 大眾運輸',
      title: '市政府站周邊交通壅塞',
      body: '忠孝東路四段封閉，市政府站周邊人流增加。建議改由國父紀念館站轉乘，預估節省 15 分鐘。',
      buttons: ['查看轉乘路線', '仍前往原車站'],
    },
    pedestrian: {
      label: '🚶 行人',
      title: '前方路口實施人流管制',
      body: '光復南路與忠孝東路口暫停通行，建議改由延吉街方向繞行，約增加步行 6 分鐘。',
      buttons: ['開始步行導航', '查看管制範圍'],
    },
  }
  const p = personas[persona]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-slate-300">模擬呈現：APP 推播（依使用者分眾）</h4>
        <div className="flex gap-1 ml-auto">
          {Object.entries(personas).map(([k, v]) => (
            <button key={k} onClick={() => setPersona(k)} className={`px-2 py-1 rounded text-xs ${persona === k ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>{v.label}</button>
          ))}
        </div>
      </div>
      <div className="max-w-sm mx-auto">
        <div className="bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs">🚦</div>
            <span className="text-xs text-slate-400">台北交通 · 現在</span>
          </div>
          <h3 className="text-sm font-bold text-white mb-2">{p.title}</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{p.body}</p>
          <div className="flex gap-2 mt-4">
            {p.buttons.map((btn, i) => (
              <button key={i} className={`flex-1 py-2 rounded-lg text-xs font-medium ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{btn}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-slate-700/30 rounded-lg p-3 text-xs text-slate-400">
        <p><strong className="text-slate-300">個人化邏輯：</strong>APP 知道用戶位置、目的地、運具</p>
        <p className="mt-1">• 自駕 → 顯示「多 12 分鐘」+ 接受新路線</p>
        <p>• 大眾運輸 → 建議轉乘站</p>
        <p>• 行人 → 步行繞行指引</p>
      </div>
    </div>
  )
}

function SocialPreview() {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-slate-300">模擬呈現：LINE 官方帳號 / 社群貼文</h4>
      <div className="bg-white rounded-2xl p-5 max-w-md mx-auto shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">北</div>
          <div>
            <p className="text-sm font-bold text-slate-900">台北市交通局</p>
            <p className="text-xs text-slate-500">官方帳號 · 18:10</p>
          </div>
        </div>
        <div className="text-sm text-slate-800 leading-relaxed space-y-2">
          <p>🚨 <strong>【信義區交通快訊｜18:10 更新】</strong></p>
          <p>忠孝東路四段「光復南路至延吉街」因路面塌陷，目前雙向封閉，現場已啟動交通管制與上游分流。</p>
          <p>🚗 <strong>自駕民眾</strong><br/>請提前改走仁愛路四段或市民大道，避免進入忠孝東路四段。</p>
          <p>🚶 <strong>行人與活動旅客</strong><br/>請避開事故管制範圍，並依現場警察及工作人員指引通行。</p>
          <p>⏱️ 目前預估延誤：約 30 分鐘<br/>🕒 下次資訊更新：18:25<br/>🗺️ 即時管制範圍與替代路線：<span className="text-blue-600 underline">tpe.traffic/live</span></p>
          <p className="text-slate-600">請協助分享給即將前往信義區的親友。</p>
          <p className="text-blue-600">#臺北交通 #信義區 #交通管制 #即時路況</p>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
          <span>❤️ 342</span><span>💬 89</span><span>🔁 1,204</span>
        </div>
      </div>
      <div className="bg-slate-700/30 rounded-lg p-3 text-xs text-slate-400">
        <p><strong className="text-slate-300">社群設計重點：</strong></p>
        <p className="mt-1">• 標注更新時間 + 下次更新時間 → 降低不確定感</p>
        <p>• 分眾建議（自駕/行人）→ 每個人找到自己該做的事</p>
        <p>• 含 hashtag → 增加搜尋和擴散</p>
        <p>• 呼籲分享 → 群眾協助傳播</p>
      </div>
    </div>
  )
}

function NavPreview() {
  const [mode, setMode] = useState('visual')
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-slate-300">模擬呈現：導航平台</h4>
        <div className="flex gap-1 ml-auto">
          <button onClick={() => setMode('visual')} className={`px-2 py-1 rounded text-xs ${mode === 'visual' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>📱 畫面</button>
          <button onClick={() => setMode('voice')} className={`px-2 py-1 rounded text-xs ${mode === 'voice' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>🔊 語音</button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div className="max-w-sm mx-auto space-y-3">
          {/* 警示橫幅 */}
          <div className="bg-red-600 text-white rounded-xl p-3 text-center">
            <p className="text-sm font-bold">⚠️ 前方道路封閉，已重新規劃路線</p>
          </div>
          {/* 路線卡片 */}
          <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white font-bold">改走仁愛路四段</span>
              <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">+12 分鐘</span>
            </div>
            <p className="text-xs text-slate-400">已避開事故與壅塞路段</p>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2 bg-blue-600 text-white text-xs rounded-lg font-medium">開始新路線</button>
              <button className="flex-1 py-2 bg-slate-700 text-slate-300 text-xs rounded-lg">其他方案</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-3">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-2">🔊 語音導航播報：</p>
            <p className="text-sm text-white leading-relaxed italic">
              「前方 800 公尺，忠孝東路四段道路封閉。已為您改走仁愛路四段，新路線預計增加 12 分鐘，請依導航行駛。」
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-2">🔊 接近轉向點時：</p>
            <p className="text-sm text-white leading-relaxed italic">
              「前方路口請右轉進入仁愛路四段，避開忠孝東路事故管制區。」
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-700/30 rounded-lg p-3 text-xs text-slate-400">
        <p><strong className="text-slate-300">導航設計重點：</strong></p>
        <p className="mt-1">• 不只顯示「前方事故」→ 直接提供新路徑</p>
        <p>• 明確告知「多多少時間」→ 降低焦慮</p>
        <p>• 語音提前告知 + 接近時再次提醒 → 安全轉向</p>
      </div>
    </div>
  )
}
