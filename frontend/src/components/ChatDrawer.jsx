import { useState, useRef, useEffect } from 'react'
import { sendChatMessage } from '../services/api'

function ChatDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '您好！我是交通策略諮詢顧問。可根據 SOP 回答 What-if 問題，例如「如果 BL17 增至 40,000，會觸發什麼條款？」',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await sendChatMessage(userMessage)
      const agentMsg = { role: 'assistant', content: response.reply }
      // 如果有 Agent 推理過程，附加顯示
      if (response.agent_tool_calls && response.agent_tool_calls.length > 0) {
        agentMsg.toolCalls = response.agent_tool_calls
        agentMsg.iterations = response.agent_iterations
        agentMsg.mode = response.mode
      }
      setMessages((prev) => [...prev, agentMsg])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '抱歉，系統暫時無法回應，請稍後再試。' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const suggestedQuestions = [
    '忠孝東路塌陷，替代路線？',
    'BL17 增至 40,000 觸發什麼？',
    '漫遊率超過 30% 該做什麼？',
  ]

  return (
    <>
      {/* 背景遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* 側邊欄 */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-slate-800 border-l border-slate-700 shadow-2xl z-[9999] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              💬 策略諮詢顧問
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">RAG 檢索 SOP · What-if 分析</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {/* Agent 推理過程 */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-600">
                    <p className="text-xs text-cyan-400 font-medium mb-1">
                      🤖 Agent 推理（{msg.iterations} 輪，{msg.toolCalls.length} 次工具呼叫）
                    </p>
                    <div className="space-y-1">
                      {msg.toolCalls.map((tc, j) => (
                        <div key={j} className="text-xs text-slate-400 flex items-start gap-1">
                          <span className="text-green-400 flex-shrink-0">→</span>
                          <span><span className="text-cyan-300">{tc.tool}</span>({Object.values(tc.input || {}).join(', ') || ''})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-700 rounded-lg p-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 建議問題 */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-slate-400 mb-2">快速提問：</p>
            <div className="flex flex-col gap-1.5">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="text-xs text-left px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="輸入指令或假設性問題..."
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            >
              送出
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

export default ChatDrawer
