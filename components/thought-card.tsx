'use client'

import { useRef, useState, type CSSProperties, type ElementType } from 'react'
import { ImageIcon, Mic, Pause, Pencil, Play, Sparkles, Pin, Trash2, Video, FolderInput, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Thought, ThoughtType } from '@/lib/thought-types'

interface Props { thought: Thought; onPin: (id: string) => void; onDelete: (id: string) => void; index: number }

const REL_FMT = (d: Date): string => {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'Now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function WaveformStatic() {
  const bars = [0.35, 0.65, 0.9, 0.5, 0.78, 0.4, 0.7, 0.34, 0.82, 0.48, 0.66, 0.38]
  return (
    <div className="flex h-7 items-center gap-[3px]">
      {bars.map((h, i) => (
        <div key={i} className="wave-bar w-[3px] rounded-full" style={{ height: `${h * 100}%`, background: 'var(--ink-3)', '--d': `${0.7 + (i % 4) * 0.08}s`, '--delay': `${i * 0.05}s` } as CSSProperties} />
      ))}
    </div>
  )
}

function VoicePlayer({ url, duration }: { url?: string; duration?: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const toggle = () => {
    if (!audioRef.current && !url) { setPlaying(!playing); if (!playing) setTimeout(() => setPlaying(false), 3000); return }
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
  }
  return (
    <div className="flex items-center gap-3">
      {url && <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} preload="metadata" />}
      <button onClick={toggle} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all" style={{ background: playing ? 'var(--ink)' : 'var(--surface-2)', color: playing ? 'white' : 'var(--ink-2)' }}>
        {playing ? <Pause size={11} /> : <Play size={11} />}
      </button>
      <div className="min-w-0 flex-1"><WaveformStatic /></div>
      <span className="shrink-0 font-mono text-[10px] tabular-nums" style={{ color: 'var(--ink-4)' }}>{duration ?? '--'}</span>
    </div>
  )
}

const TYPE_CFG: Record<ThoughtType, { label: string; icon: ElementType }> = {
  text: { label: 'Note', icon: Pencil }, voice: { label: 'Voice', icon: Mic },
  ai: { label: 'AI', icon: Sparkles }, photo: { label: 'Photo', icon: ImageIcon },
  video: { label: 'Video', icon: Video }, draw: { label: 'Sketch', icon: Pencil },
}

export default function ThoughtCard({ thought, onPin, onDelete, index }: Props) {
  const [hovered, setHovered] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const cfg = TYPE_CFG[thought.type]
  const Icon = cfg.icon
  const isMedia = thought.type === 'photo' || thought.type === 'video' || thought.type === 'draw'
  const hasBleed = isMedia && !!thought.mediaUrl

  return (
    <article className="card card-in group" style={{ animationDelay: `${Math.min(index * 0.03, 0.2)}s` }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      {/* Pin indicator */}
      {thought.pinned && <div className="absolute left-0 top-0 bottom-0 w-[2.5px] rounded-l-[12px]" style={{ background: 'var(--ink)' }} />}

      {hasBleed && (
        <div className="relative overflow-hidden rounded-t-[23px] m-[1px] mb-0 group-hover:m-0 group-hover:rounded-t-[24px] transition-all" style={{ aspectRatio: thought.type === 'draw' ? '4/3' : '16/10', borderBottom: '1px solid var(--border-default)' }}>
          {thought.type === 'video'
            ? <video src={thought.mediaUrl} controls className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : <img src={thought.mediaUrl} alt={thought.type === 'draw' ? 'sketch' : 'photo'} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" crossOrigin="anonymous" />}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="mb-2.5 flex items-center justify-between">
          <div className="type-badge"><Icon size={9} />{cfg.label}</div>
          <span className="font-mono text-[10px] tabular-nums" style={{ color: 'var(--ink-4)' }}>{REL_FMT(thought.createdAt)}</span>
        </div>

        {/* Text */}
        {thought.type === 'text' && (
          <p className="text-[15px] font-medium leading-[1.6]" style={{ color: 'var(--ink)' }}>{thought.content}</p>
        )}

        {/* AI */}
        {thought.type === 'ai' && (
          <p className="text-[13px] leading-[1.75]" style={{ color: 'var(--ink-2)' }}>{thought.content}</p>
        )}

        {/* Voice */}
        {thought.type === 'voice' && (
          <div className="flex flex-col gap-3">
            <VoicePlayer url={thought.voiceUrl} duration={thought.voiceDuration} />
            {thought.voiceTranscription && (
              <p className="text-[13px] italic leading-[1.6]" style={{ color: 'var(--ink-2)' }}>"{thought.voiceTranscription}"</p>
            )}
          </div>
        )}

        {/* Media caption */}
        {isMedia && thought.content && <p className="mt-2 text-[12px] leading-6" style={{ color: 'var(--ink-3)' }}>{thought.content}</p>}

        {/* AI note */}
        {thought.aiExpanded && (
          <div className="mt-3">
            <button onClick={() => setAiOpen(v => !v)} className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-4)' }}>
              <Sparkles size={9} />{aiOpen ? 'Hide' : 'AI Note'}
            </button>
            {aiOpen && (
              <p className="mt-2 rounded-lg p-2.5 text-[12px] leading-[1.7]" style={{ background: 'var(--surface-2)', color: 'var(--ink-3)' }}>
                {thought.aiExpanded}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={cn('absolute right-2 top-2 flex flex-col items-center gap-1 transition-all', hovered ? 'opacity-100' : 'pointer-events-none opacity-0')}>
        <button onClick={() => onPin(thought.id)} title={thought.pinned ? 'Unpin' : 'Pin'} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white transition-all hover:bg-[var(--surface-2)] shadow-sm" style={{ border: '1px solid var(--border-default)', color: thought.pinned ? 'var(--ink)' : 'var(--ink-4)' }}>
          <Pin size={11} fill={thought.pinned ? 'currentColor' : 'none'} />
        </button>
        <button title="Move to Folder" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white transition-all hover:bg-[var(--surface-2)] shadow-sm" style={{ border: '1px solid var(--border-default)', color: 'var(--ink-4)' }}>
          <FolderInput size={11} />
        </button>
        <button title="Move to Canvas" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white transition-all hover:bg-[var(--surface-2)] shadow-sm" style={{ border: '1px solid var(--border-default)', color: 'var(--ink-4)' }}>
          <Maximize2 size={11} />
        </button>
        <button onClick={() => onDelete(thought.id)} title="Delete" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white transition-all hover:bg-red-50 hover:text-red-500 hover:border-red-200 shadow-sm" style={{ border: '1px solid var(--border-default)', color: 'var(--ink-4)' }}>
          <Trash2 size={11} />
        </button>
      </div>
    </article>
  )
}
