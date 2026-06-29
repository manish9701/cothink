'use client'

import { type Thought } from '@/lib/thought-types'
import { useState, useRef, useMemo } from 'react'
import { Pin, Trash2, Play, Pause, ArrowRight } from 'lucide-react'

interface Props { thoughts: Thought[]; onPin: (id: string) => void; onDelete: (id: string) => void; onMove: (id: string) => void }

const TYPE_EMOJI: Record<string, string> = {
  text: '📝', voice: '🎙️', ai: '✨', photo: '📸', draw: '✏️', video: '🎬',
}

const TYPE_LABEL: Record<string, string> = {
  text: 'Note', voice: 'Voice', ai: 'AI Insight', photo: 'Photo', draw: 'Sketch', video: 'Video',
}

function fmt(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function dateFmt(d: Date) {
  const today = new Date()
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

/* Voice player */
function VoicePlayer({ thought }: { thought: Thought }) {
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const toggle = () => {
    if (!audio.current) { setPlaying(p => !p); return }
    if (playing) { audio.current.pause(); setPlaying(false) }
    else audio.current.play().then(() => setPlaying(true)).catch(() => {})
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
      {thought.voiceUrl && <audio ref={audio} src={thought.voiceUrl} onEnded={() => setPlaying(false)} preload="metadata" />}
      <button
        onClick={toggle}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#0f172a', color: '#fff', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {playing ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
      </button>
      {/* Static waveform bars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 24 }}>
        {[0.3, 0.6, 1, 0.5, 0.8, 0.4, 0.7, 0.3, 0.9, 0.5, 0.65, 0.75, 0.4, 0.85, 0.5].map((h, i) => (
          <div key={i} style={{
            width: 2.5, height: `${h * 24}px`,
            background: playing ? '#6366f1' : '#cbd5e1',
            borderRadius: 2,
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'DM Mono, monospace', letterSpacing: '0.05em' }}>
        {thought.voiceDuration ?? '--'}
      </span>
    </div>
  )
}

/* Single thought row */
export function ThoughtRow({ thought, onPin, onDelete, onMove }: { thought: Thought; onPin: (id: string) => void; onDelete: (id: string) => void; onMove: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('text/plain', thought.id)}
      style={{
        display: 'flex', gap: 14, padding: '16px 0',
        borderBottom: '1px solid #f1f5f9',
        position: 'relative',
        cursor: 'grab'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Emoji type indicator */}
      <div style={{ width: 20, paddingTop: 2, flexShrink: 0 }}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>
          {TYPE_EMOJI[thought.type] ?? '💭'}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {thought.type === 'text' && (
          <p style={{
            margin: 0, fontSize: 15, lineHeight: 1.65,
            color: '#1e293b', fontWeight: 400,
            letterSpacing: '-0.012em',
          }}>
            {thought.content}
          </p>
        )}

        {thought.type === 'ai' && (
          <p style={{
            margin: 0, fontSize: 14, lineHeight: 1.65,
            color: '#7c3aed', fontStyle: 'italic',
            letterSpacing: '-0.01em',
          }}>
            {thought.content}
          </p>
        )}

        {thought.type === 'voice' && <VoicePlayer thought={thought} />}

        {thought.type === 'photo' && thought.mediaUrl && (
          <div>
            <img
              src={thought.mediaUrl}
              alt="photo"
              style={{
                maxWidth: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8,
                display: 'block', marginTop: 4, border: '1px solid #e2e8f0'
              }}
            />
            {thought.content && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>{thought.content}</p>
            )}
          </div>
        )}

        {thought.type === 'draw' && thought.mediaUrl && (
          <img
            src={thought.mediaUrl}
            alt="sketch"
            style={{
              maxWidth: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8,
              display: 'block', marginTop: 4, background: '#fff',
              border: '1px solid #e2e8f0'
            }}
          />
        )}

        {thought.type === 'video' && thought.mediaUrl && (
          <video
            src={thought.mediaUrl}
            controls
            style={{
              maxWidth: '100%', maxHeight: 120, borderRadius: 8,
              display: 'block', marginTop: 4, border: '1px solid #e2e8f0'
            }}
          />
        )}

        {/* Metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span suppressHydrationWarning style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.02em' }}>
            {fmt(thought.createdAt)}
          </span>
          {thought.pinned && (
            <span style={{ fontSize: 11, color: '#f59e0b' }}>📌 Pinned</span>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div style={{ display: 'flex', gap: 6, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
        <button
          onClick={() => onMove(thought.id)}
          style={{
            width: 28, height: 28, borderRadius: 8,
            border: 'none', background: 'transparent',
            color: '#94a3b8', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = '#f1f5f9'
            el.style.color = '#3b82f6'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'transparent'
            el.style.color = '#94a3b8'
          }}
          title="Move thought"
        >
          <ArrowRight size={14} />
        </button>
        <button
          onClick={() => onPin(thought.id)}
          title={thought.pinned ? 'Unpin' : 'Pin'}
          style={{
            width: 28, height: 28, borderRadius: 7,
            border: '1px solid #e2e8f0', background: thought.pinned ? '#fef3c7' : '#fff',
            color: thought.pinned ? '#f59e0b' : '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.1s',
          }}
        >
          <Pin size={13} />
        </button>
        <button
          onClick={() => onDelete(thought.id)}
          title="Delete"
          style={{
            width: 28, height: 28, borderRadius: 7,
            border: '1px solid #e2e8f0', background: '#fff',
            color: '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.1s',
          }}
          onMouseEnter={e => { (e.currentTarget).style.color = '#ef4444'; (e.currentTarget).style.borderColor = '#fca5a5' }}
          onMouseLeave={e => { (e.currentTarget).style.color = '#94a3b8'; (e.currentTarget).style.borderColor = '#e2e8f0' }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

/* Group by date */
function groupByDate(thoughts: Thought[]) {
  const groups: Record<string, Thought[]> = {}
  for (const t of thoughts) {
    const label = dateFmt(t.createdAt)
    if (!groups[label]) groups[label] = []
    groups[label].push(t)
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

export default function ThreadView({ thoughts, onPin, onDelete, onMove }: Props) {
  const sorted = useMemo(() => [...thoughts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()), [thoughts])
  const groups = groupByDate(sorted)

  if (!sorted.length) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 32 }}>💭</span>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>No thoughts yet</p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 40px 0' }} className="no-scroll">
      <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 120 }}>
        {groups.map(group => (
          <div key={group.label} style={{ marginBottom: 8 }}>
            {/* Date header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 4px' }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {group.label}
              </span>
              <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
            </div>

            {group.items.map(t => (
              <ThoughtRow key={t.id} thought={t} onPin={onPin} onDelete={onDelete} onMove={onMove} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
