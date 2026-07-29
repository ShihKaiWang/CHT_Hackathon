import { useState } from 'react'

const BROADCAST_MESSAGES = {
  zh: {
    label: '中文',
    flag: '🇹🇼',
    text: '交通通報：忠孝東路四段因道路塌陷暫時封閉，請改走仁愛路或市民大道。預計修復時間約35分鐘。行人請使用仁愛路地下道通行。',
  },
  en: {
    label: 'English',
    flag: '🇺🇸',
    text: 'Traffic alert: Zhongxiao East Road Section 4 is temporarily closed due to road collapse. Please use Ren-ai Road or Civic Boulevard as alternatives. Estimated repair time is about 35 minutes.',
  },
  ja: {
    label: '日本語',
    flag: '🇯🇵',
    text: '交通情報：忠孝東路四段は道路陥没のため通行止めです。仁愛路または市民大道をご利用ください。復旧まで約35分の見込みです。',
  },
  ko: {
    label: '한국어',
    flag: '🇰🇷',
    text: '교통 안내: 중효동로 4단은 도로 함몰로 인해 폐쇄되었습니다. 런아이로 또는 시민대도로 우회해 주세요. 복구 예상 시간은 약 35분입니다.',
  },
}

// 語言對應 Web Speech API 的 lang code
const LANG_CODES = {
  zh: 'zh-TW',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
}

function VoiceBroadcast() {
  const [selectedLang, setSelectedLang] = useState('zh')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [supported] = useState(() => 'speechSynthesis' in window)

  function handleSpeak() {
    if (!supported) {
      alert('您的瀏覽器不支援語音播報功能')
      return
    }

    // 如果正在播放，停止
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const message = BROADCAST_MESSAGES[selectedLang]
    const utterance = new SpeechSynthesisUtterance(message.text)
    utterance.lang = LANG_CODES[selectedLang]
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.cancel() // 清除之前的
    window.speechSynthesis.speak(utterance)
  }

  function handleSpeakAll() {
    if (!supported) return

    window.speechSynthesis.cancel()
    setIsSpeaking(true)

    const langs = ['zh', 'en', 'ja', 'ko']
    let index = 0

    function speakNext() {
      if (index >= langs.length) {
        setIsSpeaking(false)
        return
      }

      const lang = langs[index]
      const message = BROADCAST_MESSAGES[lang]
      const utterance = new SpeechSynthesisUtterance(message.text)
      utterance.lang = LANG_CODES[lang]
      utterance.rate = 0.9

      utterance.onend = () => {
        index++
        // 語言之間暫停 500ms
        setTimeout(speakNext, 500)
      }
      utterance.onerror = () => {
        index++
        speakNext()
      }

      setSelectedLang(lang)
      window.speechSynthesis.speak(utterance)
    }

    speakNext()
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          🔊 語音播報
          {isSpeaking && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              播放中
            </span>
          )}
        </h3>
        {isSpeaking && (
          <button
            onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false) }}
            className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          >
            ⏹ 停止
          </button>
        )}
      </div>

      {/* 語言選擇 */}
      <div className="flex gap-2 mb-3">
        {Object.entries(BROADCAST_MESSAGES).map(([code, { label, flag }]) => (
          <button
            key={code}
            onClick={() => setSelectedLang(code)}
            className={`flex-1 px-2 py-2 rounded-lg text-xs text-center transition-all ${
              selectedLang === code
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <span className="text-base block">{flag}</span>
            <span className="mt-0.5 block">{label}</span>
          </button>
        ))}
      </div>

      {/* 播報內容預覽 */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 mb-3">
        <p className="text-xs text-slate-300 leading-relaxed">
          {BROADCAST_MESSAGES[selectedLang].text}
        </p>
      </div>

      {/* 播報按鈕 */}
      <div className="flex gap-2">
        <button
          onClick={handleSpeak}
          disabled={!supported}
          className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
            isSpeaking
              ? 'bg-green-600 text-white animate-pulse'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
          } disabled:bg-slate-600 disabled:cursor-not-allowed`}
        >
          {isSpeaking ? '🔊 播放中...' : `▶ 播報 ${BROADCAST_MESSAGES[selectedLang].label}`}
        </button>
        <button
          onClick={handleSpeakAll}
          disabled={!supported || isSpeaking}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all"
          title="依序播報中→英→日→韓"
        >
          🌐 全語播報
        </button>
      </div>

      {!supported && (
        <p className="text-xs text-red-400 mt-2">⚠️ 您的瀏覽器不支援 Web Speech API</p>
      )}
    </div>
  )
}

export default VoiceBroadcast
