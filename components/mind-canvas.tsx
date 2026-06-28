'use client'

import { useEffect, useRef, useState, useMemo, type ElementType } from 'react'
import {
  Layers, Pin, FileText, Mic, ImageIcon, Video, Pencil, Sparkles,
  Search, X, PanelRightOpen, PanelRightClose, Hexagon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { hydrateThought, serializeThought, type SerializedThought, type Thought } from '@/lib/thought-types'
import ThoughtCard from './thought-card'
import ToolDock from './tool-dock'

const STORAGE_KEY = 'minded.thoughts.v2'

const SEED: Thought[] = [
  { id: '1', type: 'text', content: 'The best ideas arrive when the room gets quieter than the urge to respond.', createdAt: new Date(Date.now() - 1000 * 60 * 44), pinned: true, aiExpanded: 'This is a useful anchor: your interface should reduce pressure before it tries to add intelligence.' },
  { id: '2', type: 'ai', content: 'You are circling a pattern, not a single answer. The system should help you see structure.', createdAt: new Date(Date.now() - 1000 * 60 * 38) },
  { id: '3', type: 'voice', content: 'Voice memo', createdAt: new Date(Date.now() - 1000 * 60 * 28), voiceDuration: '0:22' },
  { id: '4', type: 'photo', content: 'Morning light through the window', createdAt: new Date(Date.now() - 1000 * 60 * 20), mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80' },
  { id: '5', type: 'text', content: 'Complexity is often a sign that the model is wrong, not that the idea is hard.', createdAt: new Date(Date.now() - 1000 * 60 * 11), pinned: true },
]

type Filter = 'all' | 'pinned' | 'text' | 'ai' | 'voice' | 'photo' | 'video' | 'draw'

const NAV_ITEMS: { id: Filter; label: string; icon: ElementType }[] = [
  { id: 'all',    label: 'All Thoughts', icon: Layers },
  { id: 'pinned', label: 'Pinned',       icon: Pin },
  { id: 'text',   label: 'Notes',        icon: FileText },
  { id: 'voice',  label: 'Voice Memos',  icon: Mic },
  { id: 'photo',  label: 'Media',        icon: ImageIcon },
  { id: 'video',  label: 'Video',        icon: Video },
  { id: 'draw',   label: 'Sketches',     icon: Pencil },
  { id: 'ai',     label: 'AI Insights',  icon: Sparkles },
]

const AGENT_ACTIONS = ['What is weak here?', 'Find the next question', 'Make this sharper', 'Show the hidden pattern']

function deserialize(raw: string | null): Thought[] | null {
  if (!raw) return null
  try { return (JSON.parse(raw) as SerializedThought[]).map(hydrateThought) } catch { return null }
}

async function loadRemoteThoughts() {
  const res = await fetch('/api/thoughts', { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json() as { configured?: boolean; thoughts?: SerializedThought[] }
  if (!data.configured || !data.thoughts) return null
  return data.thoughts.map(hydrateThought)
}

async function saveRemoteThoughts(thoughts: Thought[]) {
  await fetch('/api/thoughts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ thoughts: thoughts.map(serializeThought) }) })
}

async function streamInsight(prompt: string, thoughts: Thought[], signal?: AbortSignal) {
  const context = thoughts.slice(0, 8).filter(t => t.type === 'text').map(t => t.content).join('\n')
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

function CanvasGrid({ thoughts, onPin, onDelete }: { thoughts: Thought[]; onPin: (id: string) => void; onDelete: (id: string) => void }) {
  const sorted = [...thoughts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.createdAt.getTime() - a.createdAt.getTime()
  })
  return (
    <div className="columns-1 gap-4 md:columns-2 2xl:columns-3">
      {sorted.map((t, i) => <div key={t.id} className="mb-4 break-inside-avoid"><ThoughtCard thought={t} onPin={onPin} onDelete={onDelete} index={i} /></div>)}
    </div>
  )
}

export default function MindCanvas() {
  const [thoughts, setThoughts] = useState<Thought[]>(SEED)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [agentOpen, setAgentOpen] = useState(true)
  const [agentPrompt, setAgentPrompt] = useState('')
  const [agentReply, setAgentReply] = useState('')
  const [agentBusy, setAgentBusy] = useState(false)
  const hydratedRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const local = deserialize(window.localStorage.getItem(STORAGE_KEY))
    if (local?.length) setThoughts(local)
    loadRemoteThoughts().then(r => { if (r?.length) setThoughts(r) }).finally(() => { hydratedRef.current = true })
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(thoughts.map(serializeThought)))
    if (!hydratedRef.current) return
    saveRemoteThoughts(thoughts).catch(() => {})
  }, [thoughts])

  useEffect(() => { if (searchOpen) setTimeout(() => searchRef.current?.focus(), 60) }, [searchOpen])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: thoughts.length, pinned: thoughts.filter(t => t.pinned).length }
    for (const t of thoughts) c[t.type] = (c[t.type] ?? 0) + 1
    return c
  }, [thoughts])

  const add = (partial: Omit<Thought, 'id' | 'createdAt'>) => {
    setThoughts(prev => [{ ...partial, id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2), createdAt: new Date() }, ...prev])
  }
  const pin = (id: string) => setThoughts(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t))
  const del = (id: string) => setThoughts(prev => prev.filter(t => t.id !== id))

  const visible = thoughts.filter(t => {
    if (filter === 'pinned' && !t.pinned) return false
    if (filter !== 'all' && filter !== 'pinned' && t.type !== filter) return false
    const q = search.trim().toLowerCase()
    return !q || t.content.toLowerCase().includes(q)
  })

  const activeNav = NAV_ITEMS.find(n => n.id === filter)

  const askAgent = async (prompt: string) => {
    if (!prompt.trim()) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setAgentBusy(true); setAgentReply('')
    try {
      const r = await streamInsight(prompt, thoughts, ctrl.signal)
      const reply = r || 'Narrow the question until one useful next move becomes obvious.'
      setAgentReply(reply); add({ type: 'ai', content: reply })
    } catch {
      if (ctrl.signal.aborted) return
      const fb = 'Name the assumption, write the opposite version, compare which one explains more.'
      setAgentReply(fb); add({ type: 'ai', content: fb })
    } finally { setAgentBusy(false) }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page)' }}>

      {/* ─── Sidebar ─── */}
      <aside className="sidebar flex w-[252px] shrink-0 flex-col">
        {/* Logo */}
        <div className="flex h-[56px] items-center gap-2.5 px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'var(--ink)' }}>
            <Hexagon size={14} color="white" strokeWidth={2.5} />
          </div>
          <span className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            co*think
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto no-scroll px-3 pt-1 pb-3">
          <div className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--ink-4)' }}>
            Library
          </div>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = filter === item.id
            return (
              <button key={item.id} onClick={() => setFilter(item.id)} className={cn('sidebar-item', isActive && 'active')}>
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
                {(counts[item.id] ?? 0) > 0 && <span className="count">{counts[item.id]}</span>}
              </button>
            )
          })}
        </nav>

        {/* Bottom stats */}
        <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border-default)' }}>
          <div className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
            {thoughts.length} thoughts · {counts.pinned ?? 0} pinned
          </div>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="flex min-w-0 flex-1 flex-col" style={{ borderLeft: '1px solid var(--border-default)' }}>

        {/* Header */}
        <header className="flex h-[56px] shrink-0 items-center gap-3 px-6" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--surface)' }}>
          <h1 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            {activeNav?.label ?? 'All Thoughts'}
          </h1>
          <span className="text-[12px] font-medium" style={{ color: 'var(--ink-4)' }}>
            {visible.length}
          </span>

          <div className="flex-1" />

          {/* Search */}
          {searchOpen ? (
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}>
              <Search size={13} style={{ color: 'var(--ink-4)' }} />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-[200px] text-[13px] placeholder:text-[var(--ink-4)]" />
              <button onClick={() => { setSearch(''); setSearchOpen(false) }} style={{ color: 'var(--ink-4)' }}><X size={13} /></button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]" style={{ color: 'var(--ink-3)' }}>
              <Search size={15} />
            </button>
          )}

          {/* Agent toggle */}
          <button onClick={() => setAgentOpen(v => !v)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]" style={{ color: agentOpen ? 'var(--ink)' : 'var(--ink-3)' }}>
            {agentOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          </button>
        </header>

        {/* Content */}
        <div className="flex min-h-0 flex-1">
          {/* Grid */}
          <section className="min-h-0 flex-1 overflow-y-auto no-scroll p-5">
            {visible.length ? (
              <CanvasGrid thoughts={visible} onPin={pin} onDelete={del} />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--surface-2)' }}>
                    <Layers size={18} style={{ color: 'var(--ink-4)' }} />
                  </div>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--ink-3)' }}>No thoughts here yet</p>
                  <p className="mt-1 text-[12px]" style={{ color: 'var(--ink-4)' }}>
                    {search ? 'Try a different search' : 'Use the dock below to capture one'}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Agent panel */}
          {agentOpen && (
            <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto no-scroll p-4 gap-4" style={{ borderLeft: '1px solid var(--border-default)', background: 'var(--surface)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} style={{ color: 'var(--ink-3)' }} />
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Thinking Agent</span>
                </div>
              </div>

              <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)', minHeight: 80 }}>
                {agentBusy ? (
                  <div className="flex items-center gap-1.5">
                    {[0,1,2].map(i => <div key={i} className="think-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ink-3)', animationDelay: `${i*0.22}s` }} />)}
                  </div>
                ) : (
                  <p className="text-[13px] leading-[1.7]" style={{ color: agentReply ? 'var(--ink-2)' : 'var(--ink-4)' }}>
                    {agentReply || 'Ask the agent to challenge, connect, or extend your thinking.'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {AGENT_ACTIONS.map(a => (
                  <button key={a} onClick={() => askAgent(a)} className="rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors hover:bg-[var(--surface-2)]" style={{ color: 'var(--ink-3)', border: '1px solid var(--border-default)' }}>
                    {a}
                  </button>
                ))}
              </div>

              <div className="mt-auto rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
                <textarea value={agentPrompt} onChange={e => setAgentPrompt(e.target.value)} rows={3} placeholder="Ask about your thoughts..." className="w-full resize-none text-[13px] leading-[1.7] no-scroll placeholder:text-[var(--ink-4)]" />
                <div className="mt-2 flex justify-end">
                  <button onClick={() => askAgent(agentPrompt)} disabled={agentBusy || !agentPrompt.trim()} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white transition-opacity disabled:opacity-30" style={{ background: 'var(--ink)' }}>
                    <Sparkles size={12} /> Ask
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      <ToolDock onAdd={add} recentThoughts={thoughts} />
    </div>
  )
}
