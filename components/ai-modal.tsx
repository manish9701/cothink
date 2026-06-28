'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, ArrowUp, X } from 'lucide-react'
import type { Thought } from '@/lib/thought-types'

interface Props { thoughts: Thought[]; onAdd: (t: Omit<Thought, 'id' | 'createdAt'>) => void; onClose: () => void }

const PROMPTS = [
  'What is weak here?',
  'Find the next question',
  'Make this sharper',
  'Show the hidden pattern',
]

async function streamInsight(prompt: string, thoughts: Thought[], signal?: AbortSignal) {
  const context = thoughts.filter(t => t.type === 'text').map(t => t.content).join('\n')
  const res = await fetch('/api/think', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, context }), signal })
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
      try { const p = JSON.parse(data); if (p.type === 'text-delta' && p.delta) full += p.delta } catch {}
    }
  }
  return full
}

export default function AIModal({ thoughts, onAdd, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60) }, [])

  const submit = async (q: string = query) => {
    if (!q.trim()) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setBusy(true)
    try {
      const r = await streamInsight(q, thoughts, ctrl.signal)
      if (r) onAdd({ type: 'ai', content: r })
      setQuery('')
    } catch {
      if (ctrl.signal.aborted) return
      const fb = 'Name the assumption, write the opposite version, compare which one explains more.'
      onAdd({ type: 'ai', content: fb })
      setQuery('')
    } finally { setBusy(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet" style={{ margin: '0 16px', maxWidth: 480 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--zinc-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={12} style={{ color: 'var(--zinc-500)' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--zinc-900)' }}>Thinking Agent</span>
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

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {busy ? (
            <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {[0, 1, 2].map(i => <div key={i} className="think-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--zinc-400)', animationDelay: `${i * 0.2}s` }} />)}
              </div>
              <p style={{ fontSize: 13, color: 'var(--zinc-500)', margin: 0 }}>Analyzing thoughts…</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => submit(p)}
                    style={{ padding: '6px 12px', borderRadius: 99, background: 'var(--zinc-50)', border: '1px solid var(--zinc-200)', fontSize: 12, fontWeight: 500, color: 'var(--zinc-700)', transition: 'all 0.1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--zinc-100)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--zinc-300)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--zinc-50)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--zinc-200)' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              
              <div style={{ position: 'relative' }}>
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                  placeholder="Ask about your thoughts..."
                  rows={3}
                  className="no-scroll"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--zinc-50)', border: '1px solid var(--zinc-200)', fontSize: 14, lineHeight: 1.5, color: 'var(--zinc-900)', resize: 'none' }}
                />
                <button
                  onClick={() => submit()}
                  disabled={!query.trim()}
                  style={{ position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 8, background: query.trim() ? 'var(--zinc-900)' : 'var(--zinc-200)', border: 'none', color: query.trim() ? 'white' : 'var(--zinc-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.14s' }}
                >
                  <ArrowUp size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
