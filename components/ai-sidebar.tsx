'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ArrowUp, Sparkles, BookOpen } from 'lucide-react'
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
  "What's the next question?",
  'Compress to one sentence',
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

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetch('/api/chat')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMessages(data)
        })
        .catch(() => {})
    }
  }, [isOpen])

  const saveMessage = async (id: string, role: string, content: string) => {
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role, content }),
      })
    } catch {}
  }

  const submit = useCallback(async (q: string = query) => {
    const trimmed = q.trim()
    if (!trimmed || busy) return

    setQuery('')
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const userId = crypto.randomUUID()
    const aiId = crypto.randomUUID()

    // Save user message immediately
    saveMessage(userId, 'user', trimmed)

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
      setMessages(prev =>
        prev.map(m => m.id === aiId ? { ...m, streaming: false } : m)
      )
      // Save AI message after completion
      saveMessage(aiId, 'ai', accumulated)
    } catch {
      if (ctrl.signal.aborted) return
      const fallback = 'Name the core assumption. Write the opposite version. Compare which explains more.'
      setMessages(prev =>
        prev.map(m => m.id === aiId ? { ...m, content: fallback, streaming: false } : m)
      )
      saveMessage(aiId, 'ai', fallback)
    } finally {
      setBusy(false)
    }
  }, [query, busy, thoughts])

  return (
    <div
      className={`ai-sidebar-panel ${isOpen ? 'open' : 'closed'}`}
      onClick={e => e.stopPropagation()}
    >
        {/* Header */}
        <div style={{
          flexShrink: 0,
          padding: '16px 20px',
          borderBottom: '1px solid var(--zinc-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'var(--zinc-900)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <Sparkles size={16} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--zinc-900)', letterSpacing: '-0.02em' }}>
                Thinking Agent
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--zinc-400)', letterSpacing: '-0.01em', fontWeight: 500 }}>
                {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''} in context
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--zinc-100)', border: 'none', color: 'var(--zinc-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--zinc-200)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--zinc-100)'}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="chat-messages no-scroll"
        >
          {messages.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              height: '100%', gap: 12, padding: '40px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'var(--zinc-50)', border: '1px solid var(--zinc-200)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={24} color="var(--zinc-400)" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--zinc-800)', margin: 0, letterSpacing: '-0.01em' }}>
                Ask about your thoughts
              </p>
              <p style={{ fontSize: 13, color: 'var(--zinc-500)', margin: 0, lineHeight: 1.6 }}>
                Explore patterns, surface insights, or get help thinking something through.
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`chat-bubble-row ${msg.role}`} style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'ai' && (
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'var(--zinc-900)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={14} color="white" />
                </div>
              )}

              <div style={{
                display: 'flex', flexDirection: 'column',
                gap: 4, maxWidth: '85%',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {msg.streaming && msg.content === '' ? (
                  <div className="chat-thinking">
                    <div className="chat-thinking-dot" />
                    <div className="chat-thinking-dot" />
                    <div className="chat-thinking-dot" />
                  </div>
                ) : (
                  <div style={{
                    padding: msg.role === 'user' ? '10px 14px' : '0 4px',
                    background: msg.role === 'user' ? 'var(--zinc-100)' : 'transparent',
                    borderRadius: msg.role === 'user' ? 16 : 0,
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 0,
                    fontSize: 14, color: 'var(--zinc-900)', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                    {msg.streaming && <span className="ai-cursor" />}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'var(--zinc-100)', color: 'var(--zinc-600)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
                }}>
                  You
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input area */}
        <div style={{ padding: '16px 20px 24px', borderTop: '1px solid var(--zinc-100)', background: 'white' }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12 }} className="no-scroll">
            {PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => submit(p)}
                disabled={busy}
                style={{
                  padding: '6px 12px', borderRadius: 16, border: '1px solid var(--zinc-200)',
                  background: 'var(--zinc-50)', fontSize: 12, color: 'var(--zinc-600)', whiteSpace: 'nowrap',
                  cursor: busy ? 'default' : 'pointer', transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => !busy && (e.currentTarget.style.background = 'var(--zinc-100)')}
                onMouseLeave={e => !busy && (e.currentTarget.style.background = 'var(--zinc-50)')}
              >
                {p}
              </button>
            ))}
          </div>

          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 10, padding: '10px 12px',
            background: 'var(--zinc-50)', borderRadius: 16, border: '1px solid var(--zinc-200)',
            transition: 'border-color 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <textarea
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
              disabled={busy}
              placeholder="Ask anything… (Enter to send)"
              rows={1}
              className="no-scroll"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                resize: 'none', fontSize: 14, color: 'var(--zinc-900)',
                padding: '4px 0', minHeight: 24, maxHeight: 120, lineHeight: 1.5,
              }}
            />
            <button
              onClick={() => submit()}
              disabled={!query.trim() || busy}
              style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: (!query.trim() || busy) ? 'var(--zinc-200)' : 'var(--zinc-900)',
                color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: (!query.trim() || busy) ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
              }}
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
  )
}
