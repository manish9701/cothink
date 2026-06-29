'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ArrowUp, Sparkles, Layout } from 'lucide-react'
import type { Thought } from '@/lib/thought-types'

interface Props {
  isOpen: boolean
  thoughts: Thought[]
  onAdd: (t: Omit<Thought, 'id' | 'createdAt'>) => void
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  streaming?: boolean
}

const PROMPTS = [
  'What pattern do I keep circling?',
  "Where's the weakest assumption?",
  "What's the next question to ask?",
  'Compress this into one sentence',
]

async function streamInsight(
  prompt: string,
  thoughts: Thought[],
  onDelta: (delta: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const contextData = thoughts.map(t => ({
    id: t.id,
    type: t.type,
    content: t.content,
    mediaUrl: t.mediaUrl,
    canvasId: t.canvasId,
    folderId: t.folderId,
    x: t.x, y: t.y,
    voiceTranscription: t.voiceTranscription,
  }))

  const res = await fetch('/api/think', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context: JSON.stringify(contextData) }),
    signal,
  })

  if (!res.ok || !res.body) throw new Error('Stream failed')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const p = JSON.parse(data)
        if (p.type === 'text-delta' && p.delta) {
          full += p.delta
          onDelta(p.delta)
        }
      } catch {}
    }
  }
  return full
}

export default function AISidebar({ isOpen, thoughts, onAdd, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const submit = useCallback(async (q: string = query) => {
    const trimmed = q.trim()
    if (!trimmed || busy) return

    setQuery('')
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    // Add user message
    const userId = crypto.randomUUID()
    const aiId = crypto.randomUUID()

    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user', content: trimmed },
      { id: aiId, role: 'ai', content: '', streaming: true },
    ])
    setBusy(true)

    try {
      let accumulated = ''
      await streamInsight(
        trimmed,
        thoughts,
        (delta) => {
          accumulated += delta
          setMessages(prev =>
            prev.map(m => m.id === aiId ? { ...m, content: accumulated } : m)
          )
        },
        ctrl.signal
      )
      // Mark streaming done
      setMessages(prev =>
        prev.map(m => m.id === aiId ? { ...m, streaming: false } : m)
      )
    } catch {
      if (ctrl.signal.aborted) return
      const fallback = 'Name the core assumption. Write the opposite version. Compare which explains more.'
      setMessages(prev =>
        prev.map(m => m.id === aiId ? { ...m, content: fallback, streaming: false } : m)
      )
    } finally {
      setBusy(false)
    }
  }, [query, busy, thoughts])

  const synthesizeToCanvas = useCallback((content: string) => {
    onAdd({ type: 'ai', content })
  }, [onAdd])

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 380,
      background: '#fff', borderLeft: '1px solid #e2e8f0',
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 50, display: 'flex', flexDirection: 'column',
      boxShadow: isOpen ? '-4px 0 24px rgba(0,0,0,0.05)' : 'none',
    }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
              <Sparkles size={16} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--zinc-900)', letterSpacing: '-0.02em' }}>
                Thinking Agent
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--zinc-400)' }}>
                {thoughts.length} thoughts in context
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, background: 'none', border: 'none', color: 'var(--zinc-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--zinc-100)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="chat-messages no-scroll"
          style={{ flexShrink: 1, minHeight: 0, flex: 1 }}
        >
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, opacity: 0.5 }}>
              <Sparkles size={32} color="var(--zinc-400)" />
              <p style={{ fontSize: 13, color: 'var(--zinc-400)', margin: 0 }}>Ask anything about your thoughts</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`chat-bubble-row ${msg.role}`}>
              {msg.role === 'ai' && (
                <div className="chat-avatar"><Sparkles size={14} /></div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '80%', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.streaming && msg.content === '' ? (
                  <div className="chat-thinking">
                    <div className="chat-thinking-dot" />
                    <div className="chat-thinking-dot" />
                    <div className="chat-thinking-dot" />
                  </div>
                ) : (
                  <div className={`chat-bubble ${msg.role}`}>
                    {msg.content}
                    {msg.streaming && <span className="ai-cursor" />}
                  </div>
                )}

                {/* Synthesize button for AI messages */}
                {msg.role === 'ai' && !msg.streaming && msg.content && (
                  <div className="chat-bubble-actions">
                    <button
                      className="chat-synth-btn"
                      onClick={() => synthesizeToCanvas(msg.content)}
                      title="Add to Canvas"
                    >
                      <Layout size={12} />
                      Synthesize to Canvas
                    </button>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="chat-avatar" style={{ background: 'var(--zinc-900)', color: 'white' }}>
                  <span style={{ fontSize: 12, fontFamily: 'inherit' }}>You</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="chat-input-area" style={{ flexShrink: 0 }}>
          {/* Quick prompts */}
          <div className="chat-prompts">
            {PROMPTS.map(p => (
              <button
                key={p}
                className="chat-prompt-chip"
                onClick={() => submit(p)}
                disabled={busy}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <textarea
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
              disabled={busy}
              placeholder="Ask about your thoughts… (Enter to send)"
              rows={2}
              className="chat-textarea no-scroll"
            />
            <button
              className="chat-send-btn"
              onClick={() => submit()}
              disabled={!query.trim() || busy}
            >
              <ArrowUp size={14} />
            </button>
          </div>
      </div>
    </div>
  )
}
