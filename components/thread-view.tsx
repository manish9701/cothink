'use client'

import { type Thought } from '@/lib/thought-types'
import { useState, useRef, useMemo } from 'react'
import { Pin, Trash2, Play, Pause, ArrowRight, Mic, Pencil, Sparkles, Image, Video } from 'lucide-react'

interface Props { thoughts: Thought[]; onPin: (id: string) => void; onDelete: (id: string) => void; onMove: (id: string) => void }

const TYPE_LABEL: Record<string, string> = {
  text: 'Note', voice: 'Voice', ai: 'AI', photo: 'Photo', draw: 'Sketch', video: 'Video',
}

const TYPE_ICON: Record<string, any> = {
  text: Pencil, voice: Mic, ai: Sparkles, photo: Image, draw: Pencil, video: Video,
}

function fmt(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(' ', '')
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--zinc-50)', border: '1px solid var(--zinc-150)', borderRadius: 12 }}>
        {thought.voiceUrl && <audio ref={audio} src={thought.voiceUrl} onEnded={() => setPlaying(false)} preload="metadata" />}
        <button
          onClick={toggle}
          className="scale-on-press"
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: playing ? '#10b981' : 'var(--zinc-900)',
            color: '#fff', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'transform 160ms var(--ease-out), background 160ms var(--ease-out)',
          }}
        >
          {playing ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" style={{ marginLeft: 1 }} />}
        </button>
        {/* Waveform bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 22, flex: 1 }}>
          {[0.3, 0.6, 1, 0.5, 0.8, 0.4, 0.7, 0.3, 0.9, 0.5, 0.65, 0.75, 0.4, 0.85, 0.5].map((h, i) => (
            <div key={i} style={{
              width: 2.5, height: `${h * 22}px`,
              background: playing ? '#10b981' : 'var(--zinc-300)',
              borderRadius: 2,
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--zinc-400)', fontFamily: 'DM Mono, monospace', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {thought.voiceDuration ?? '--'}
        </span>
      </div>
      {/* Show transcript if available */}
      {thought.content && thought.content !== 'Voice memo' && (
        <p style={{
          margin: 0, fontSize: 13, lineHeight: 1.65,
          color: 'var(--zinc-600)', fontStyle: 'italic',
          padding: '8px 12px',
          background: 'var(--zinc-50)',
          borderRadius: 10,
          border: '1px solid var(--zinc-150)',
          borderLeft: '2px solid var(--zinc-300)',
        }}>
          {thought.content.replace('Voice memo: ', '')}
        </p>
      )}
    </div>
  )
}

/* Single thought row */
export function ThoughtRow({ thought, index, onPin, onDelete, onMove }: { thought: Thought; index: number; onPin: (id: string) => void; onDelete: (id: string) => void; onMove: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)
  const TypeIcon = TYPE_ICON[thought.type] ?? Pencil

  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('text/plain', thought.id)}
      style={{
        display: 'flex', gap: 0, padding: '14px 0',
        borderBottom: '1px solid var(--zinc-100)',
        position: 'relative',
        cursor: 'default',
        animation: 'thread-in 0.3s var(--ease-out) both',
        animationDelay: `${Math.min(index * 40, 600)}ms`
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        {thought.type === 'text' && (
          <p style={{
            margin: 0, fontSize: 14, lineHeight: 1.68,
            color: 'var(--zinc-700)', fontWeight: 300,
            fontStyle: 'italic', letterSpacing: '-0.012em',
          }}>
            {thought.content}
          </p>
        )}

        {thought.type === 'ai' && (
          <p style={{
            margin: 0, fontSize: 14, lineHeight: 1.68,
            color: 'var(--zinc-600)', fontStyle: 'italic',
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
                maxWidth: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10,
                display: 'block', marginTop: 4, border: '1px solid var(--zinc-150)',
              }}
            />
            {thought.content && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--zinc-500)', lineHeight: 1.5 }}>{thought.content}</p>
            )}
          </div>
        )}

        {thought.type === 'draw' && thought.mediaUrl && (
          <img
            src={thought.mediaUrl}
            alt="sketch"
            style={{
              maxWidth: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 10,
              display: 'block', marginTop: 4, background: '#fff',
              border: '1px solid var(--zinc-150)',
            }}
          />
        )}

        {thought.type === 'video' && thought.mediaUrl && (
          <video
            src={thought.mediaUrl}
            controls
            style={{
              maxWidth: '100%', maxHeight: 140, borderRadius: 10,
              display: 'block', marginTop: 4, border: '1px solid var(--zinc-150)',
            }}
          />
        )}



      </div>

      {/* Right Column: Hover Actions & Timestamp */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start',
        flexShrink: 0, paddingLeft: 8, gap: 4
      }}>
        <div style={{
          display: 'flex', gap: 2,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
          paddingTop: 2,
          pointerEvents: hovered ? 'auto' : 'none',
        }}>
        <button
          onClick={() => onMove(thought.id)}
          className="section-action-btn scale-on-press"
          title="Move thought"
        >
          <ArrowRight size={16} />
        </button>
        <button
          onClick={() => onPin(thought.id)}
          title={thought.pinned ? 'Unpin' : 'Pin'}
          className={`section-action-btn scale-on-press ${thought.pinned ? 'active' : ''}`}
          style={thought.pinned ? { color: 'var(--zinc-900)' } : undefined}
        >
          <Pin size={16} fill={thought.pinned ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => onDelete(thought.id)}
          title="Delete"
          className="section-action-btn danger scale-on-press"
          style={{ color: 'var(--zinc-400)', width: 32, height: 32 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--zinc-400)'; e.currentTarget.style.background = 'transparent' }}
        >
          <Trash2 size={16} />
        </button>
        </div>
        <div style={{ opacity: hovered || thought.pinned ? 0 : 1, transition: 'opacity 0.15s', position: 'absolute', right: 0, top: 18 }}>
          <span suppressHydrationWarning style={{ fontSize: 11, color: 'var(--zinc-400)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em', paddingRight: 4 }}>
            {fmt(thought.createdAt)}
          </span>
        </div>
        {thought.pinned && (
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--zinc-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2, paddingRight: 4, whiteSpace: 'nowrap' }}>
            Pinned
          </span>
        )}
      </div>
    </div>
  )
}

export default function ThreadView({ thoughts, onPin, onDelete, onMove }: Props) {
  const sorted = useMemo(() => [...thoughts].filter(t => t.type !== 'ai').sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()), [thoughts])

  if (!sorted.length) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'var(--zinc-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Pencil size={20} color="var(--zinc-400)" />
        </div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--zinc-500)', margin: 0 }}>No thoughts yet</p>
        <p style={{ fontSize: 12, color: 'var(--zinc-400)', margin: 0 }}>Start by adding a thought below</p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 32px 0' }} className="no-scroll">
      <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 120 }}>
        <div style={{ marginBottom: 4 }}>
          {sorted.map((t, idx) => (
            <ThoughtRow key={t.id} thought={t} index={idx} onPin={onPin} onDelete={onDelete} onMove={onMove} />
          ))}
        </div>
      </div>
    </div>
  )
}
