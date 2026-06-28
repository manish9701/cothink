'use client'

import { type Thought } from '@/lib/thought-types'
import { Mic, Play, Pause, ImageIcon, Sparkles, Pin, Trash2, Pencil } from 'lucide-react'
import { useState, useRef, type CSSProperties } from 'react'

interface Props { thoughts: Thought[]; onPin: (id: string) => void; onDelete: (id: string) => void }

const TIME_FMT = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const DATE_FMT = (d: Date) => {
  const today = new Date()
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function WaveBar() {
  const bars = [0.4, 0.7, 1, 0.6, 0.85, 0.45, 0.75, 0.35, 0.9, 0.55]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 20 }}>
      {bars.map((h, i) => (
        <div key={i} className="wave-bar" style={{ width: 2.5, height: `${h * 100}%`, borderRadius: 2, background: 'var(--zinc-400)', '--d': `${0.6 + (i % 4) * 0.09}s`, '--delay': `${i * 0.04}s` } as CSSProperties} />
      ))}
    </div>
  )
}

function VoiceRow({ thought }: { thought: Thought }) {
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const toggle = () => {
    if (!audio.current) { setPlaying(p => !p); if (!playing) setTimeout(() => setPlaying(false), 3000); return }
    if (playing) { audio.current.pause(); setPlaying(false) } else audio.current.play().then(() => setPlaying(true)).catch(() => {})
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {thought.voiceUrl && <audio ref={audio} src={thought.voiceUrl} onEnded={() => setPlaying(false)} preload="metadata" />}
      <button onClick={toggle} style={{ width: 30, height: 30, borderRadius: '50%', background: playing ? 'var(--zinc-900)' : 'var(--zinc-100)', border: '1px solid var(--zinc-200)', color: playing ? 'white' : 'var(--zinc-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.14s' }}>
        {playing ? <Pause size={11} /> : <Play size={11} />}
      </button>
      <WaveBar />
      <span style={{ fontSize: 11, color: 'var(--zinc-400)', fontVariantNumeric: 'tabular-nums', fontFamily: 'DM Mono, monospace' }}>{thought.voiceDuration ?? '--'}</span>
    </div>
  )
}

function ThreadItem({ thought, onPin, onDelete }: { thought: Thought; onPin: (id: string) => void; onDelete: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="thread-item"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ animationDelay: '0ms' }}
    >
      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        {/* Type label for non-text */}
        {thought.type === 'ai' && (
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--zinc-400)', display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.02em' }}>
            <Sparkles size={11} /> AI Insight
          </span>
        )}
        {thought.type === 'voice' && <VoiceRow thought={thought} />}
        {thought.type === 'photo' && thought.mediaUrl && (
          <div>
            <img src={thought.mediaUrl} alt="photo" style={{ maxWidth: 320, borderRadius: 10, border: '1px solid var(--zinc-200)', display: 'block' }} />
            {thought.content && <p style={{ marginTop: 6, fontSize: 13, color: 'var(--zinc-500)' }}>{thought.content}</p>}
          </div>
        )}
        {(thought.type === 'text' || thought.type === 'ai') && (
          <p style={{
            fontSize: thought.type === 'ai' ? 14 : 15,
            lineHeight: 1.65,
            color: thought.type === 'ai' ? 'var(--zinc-500)' : 'var(--zinc-900)',
            fontWeight: thought.type === 'ai' ? 400 : 450,
            margin: 0,
            letterSpacing: '-0.01em',
            fontStyle: thought.type === 'ai' ? 'italic' : 'normal',
          }}>
            {thought.content}
          </p>
        )}
        {thought.pinned && (
          <span style={{ fontSize: 11, color: 'var(--zinc-400)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Pin size={10} fill="currentColor" /> Pinned
          </span>
        )}
      </div>

      {/* Right: timestamp + actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span className="thread-timestamp">{TIME_FMT(thought.createdAt)}</span>
          <span className="thread-timestamp" style={{ fontSize: 10, opacity: 0.7 }}>{DATE_FMT(thought.createdAt)}</span>
        </div>
        {hovered && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => onPin(thought.id)}
              style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--zinc-200)', background: thought.pinned ? 'var(--zinc-900)' : 'var(--white)', color: thought.pinned ? 'white' : 'var(--zinc-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}
            >
              <Pin size={11} fill={thought.pinned ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => onDelete(thought.id)}
              style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--zinc-200)', background: 'var(--white)', color: 'var(--zinc-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#FCA5A5'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--zinc-200)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--zinc-400)' }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Group thoughts by date
function groupByDate(thoughts: Thought[]): Array<{ label: string; items: Thought[] }> {
  const groups: Record<string, Thought[]> = {}
  for (const t of thoughts) {
    const label = DATE_FMT(t.createdAt)
    if (!groups[label]) groups[label] = []
    groups[label].push(t)
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

export default function ThreadView({ thoughts, onPin, onDelete }: Props) {
  const sorted = [...thoughts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const groups = groupByDate(sorted)

  if (!sorted.length) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--zinc-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Pencil size={18} style={{ color: 'var(--zinc-400)' }} />
        </div>
        <p style={{ fontSize: 14, color: 'var(--zinc-400)', margin: 0 }}>No thoughts yet</p>
        <p style={{ fontSize: 12, color: 'var(--zinc-300)', margin: 0 }}>Tap Add below to start</p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0 100px' }} className="no-scroll">
      {/* Centered thread column */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 32px' }}>
        {groups.map(group => (
          <div key={group.label}>
            {/* Date divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 4px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--zinc-100)' }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--zinc-400)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {group.label}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--zinc-100)' }} />
            </div>
            {group.items.map(t => (
              <ThreadItem key={t.id} thought={t} onPin={onPin} onDelete={onDelete} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
