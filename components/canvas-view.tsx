'use client'

import { type Thought } from '@/lib/thought-types'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Type, Sparkles, Mic, Camera, Pen, Video, X, RotateCw, Maximize2, Play, Pause, Plus } from 'lucide-react'

interface Props {
  thoughts: Thought[]
  onAdd: (t: Omit<Thought, 'id' | 'createdAt'>) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Thought>) => void
}

function useDraggable(initialX: number, initialY: number, onDragEnd: (x: number, y: number) => void) {
  const [pos, setPos] = useState({ x: initialX, y: initialY })
  const dragging = useRef(false)
  const origin = useRef({ mx: 0, my: 0, nx: 0, ny: 0 })

  useEffect(() => { setPos({ x: initialX, y: initialY }) }, [initialX, initialY])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    origin.current = { mx: e.clientX, my: e.clientY, nx: pos.x, ny: pos.y }
    e.stopPropagation()
  }, [pos])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    setPos({ x: origin.current.nx + e.clientX - origin.current.mx, y: origin.current.ny + e.clientY - origin.current.my })
  }, [])

  const onPointerUp = useCallback(() => {
    if (dragging.current) { dragging.current = false; onDragEnd(pos.x, pos.y) }
  }, [pos, onDragEnd])

  return { pos, onPointerDown, onPointerMove, onPointerUp }
}

/* Minimal floating audio player */
function MiniAudioPlayer({ thought }: { thought: Thought }) {
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const toggle = () => {
    if (!audio.current) { setPlaying(p => !p); return }
    if (playing) { audio.current.pause(); setPlaying(false) }
    else audio.current.play().then(() => setPlaying(true)).catch(() => {})
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {thought.voiceUrl && <audio ref={audio} src={thought.voiceUrl} onEnded={() => setPlaying(false)} preload="metadata" />}
      <button
        data-no-drag="true"
        onClick={toggle}
        style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'rgba(15,23,42,0.85)', color: 'white',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}
      >
        {playing ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: 2 }} />}
      </button>
      <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'rgba(15,23,42,0.5)', letterSpacing: '0.05em' }}>
        {thought.voiceDuration ?? '0:00'}
      </span>
    </div>
  )
}

/* ── Single canvas node — no card box, just raw content ── */
function CanvasNode({ thought, onDelete, onUpdate }: {
  thought: Thought
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Thought>) => void
}) {
  const initX = thought.x ?? 80
  const initY = thought.y ?? 80

  const handleDragEnd = useCallback((x: number, y: number) => {
    onUpdate(thought.id, { x, y })
  }, [thought.id, onUpdate])

  const { pos, onPointerDown, onPointerMove, onPointerUp } = useDraggable(initX, initY, handleDragEnd)
  const [hovered, setHovered] = useState(false)
  const [rotation, setRotation] = useState(thought.rotation ?? 0)
  const [scale, setScale] = useState(thought.scale ?? 1)

  useEffect(() => { setRotation(thought.rotation ?? 0) }, [thought.rotation])
  useEffect(() => { setScale(thought.scale ?? 1) }, [thought.scale])

  const handleRotate = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    const el = e.currentTarget.closest('[data-canvas-node]') as HTMLElement
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
    const startRot = rotation
    const move = (ev: PointerEvent) => {
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx)
      setRotation(startRot + (a - startAngle) * 180 / Math.PI)
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx)
      onUpdate(thought.id, { rotation: startRot + (a - startAngle) * 180 / Math.PI })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [rotation, onUpdate, thought.id])

  const handleScale = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    const startY = e.clientY
    const startScale = scale
    const move = (ev: PointerEvent) => setScale(Math.max(0.4, Math.min(3, startScale - (ev.clientY - startY) * 0.008)))
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onUpdate(thought.id, { scale: Math.max(0.4, Math.min(3, startScale - (ev.clientY - startY) * 0.008)) })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [scale, onUpdate, thought.id])

  return (
    <div
      data-canvas-node="true"
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        transformOrigin: 'top left',
        cursor: 'grab',
        userSelect: 'none',
        zIndex: hovered ? 10 : 1,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Content — zero card chrome ── */}
      <div style={{ position: 'relative' }}>
        {thought.type === 'text' && (
          <p style={{
            margin: 0, maxWidth: 280, fontSize: 14, lineHeight: 1.6,
            color: '#0f172a', fontWeight: 400, letterSpacing: '-0.015em',
            fontFamily: 'DM Sans, Inter, sans-serif',
            textShadow: hovered ? 'none' : 'none',
          }}>
            {thought.content}
          </p>
        )}

        {thought.type === 'ai' && (
          <p style={{
            margin: 0, maxWidth: 260, fontSize: 13, lineHeight: 1.65,
            color: '#6d28d9', fontStyle: 'italic', letterSpacing: '-0.01em',
          }}>
            {thought.content}
          </p>
        )}

        {thought.type === 'voice' && <MiniAudioPlayer thought={thought} />}

        {thought.type === 'photo' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 260 }}>
            {thought.mediaUrls ? thought.mediaUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt="photo"
                style={{
                  maxWidth: '100%', maxHeight: 200, display: 'block',
                  borderRadius: 10, pointerEvents: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                }}
              />
            )) : thought.mediaUrl ? (
              <img
                src={thought.mediaUrl}
                alt="photo"
                style={{
                  maxWidth: 260, maxHeight: 200, display: 'block',
                  borderRadius: 10, pointerEvents: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                }}
              />
            ) : null}
          </div>
        )}

        {thought.type === 'draw' && thought.mediaUrl && (
          <img
            src={thought.mediaUrl}
            alt="sketch"
            style={{
              maxWidth: 240, display: 'block',
              borderRadius: 8, pointerEvents: 'none', background: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          />
        )}

        {thought.type === 'video' && thought.mediaUrl && (
          <video
            src={thought.mediaUrl}
            controls
            style={{
              maxWidth: 240, borderRadius: 10, display: 'block',
              pointerEvents: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}
            onClick={e => e.stopPropagation()}
          />
        )}

        {/* ── Hover handles ── */}
        {hovered && (
          <>
            {/* Delete */}
            <div
              data-no-drag="true"
              onClick={(e) => { e.stopPropagation(); onDelete(thought.id) }}
              style={{
                position: 'absolute', top: -10, right: -10,
                width: 24, height: 24, borderRadius: '50%',
                background: '#ffffff', border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 30, color: '#ef4444',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0' }}
            >
              <X size={12} />
            </div>

            {/* Rotate */}
            <div
              data-no-drag="true"
              onPointerDown={handleRotate}
              style={{
                position: 'absolute', top: -10, left: -10,
                width: 24, height: 24, borderRadius: '50%',
                background: '#ffffff', border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'grab', zIndex: 30, color: '#64748b',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b' }}
            >
              <RotateCw size={12} />
            </div>

            {/* Scale */}
            <div
              data-no-drag="true"
              onPointerDown={handleScale}
              style={{
                position: 'absolute', bottom: -10, right: -10,
                width: 24, height: 24, borderRadius: '50%',
                background: '#ffffff', border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'nwse-resize', zIndex: 30, color: '#64748b',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b' }}
            >
              <Maximize2 size={12} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Canvas View ── */
export default function CanvasView({ thoughts, onAdd, onDelete, onUpdate }: Props) {
  const TOOLBAR_ITEMS = [
    {
      label: 'Add Thought',
      icon: <Plus size={16} />,
      action: () => onAdd({
        type: 'text',
        content: 'New thought…',
        x: 120 + Math.random() * 300,
        y: 80 + Math.random() * 200,
      }),
    },
    {
      label: 'AI Agent',
      icon: <Sparkles size={16} color="#8b5cf6" />,
      action: () => onAdd({
        type: 'ai',
        content: 'What pattern am I circling?',
        x: 200 + Math.random() * 200,
        y: 100 + Math.random() * 200,
      }),
    }
  ]

  return (
    <div 
      style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        const tId = e.dataTransfer.getData('text/plain')
        if (tId) {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left - 50
          const y = e.clientY - rect.top - 50
          // Use onUpdate to set canvasId, canvasX and canvasY
          onUpdate(tId, { canvasX: x, canvasY: y })
        }
      }}
    >
      {/* Dot-grid surface */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#f8fafc',
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        overflow: 'hidden',
      }}>
        {thoughts.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 36 }}>🖼️</span>
            <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Canvas is empty</p>
            <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0 }}>Add a text or image node below</p>
          </div>
        )}

        {thoughts.map((t, i) => (
          <CanvasNode
            key={t.id}
            thought={{
              ...t,
              x: t.x ?? (60 + (i % 3) * 320 + Math.sin(i * 3.7) * 20),
              y: t.y ?? (60 + Math.floor(i / 3) * 220 + Math.cos(i * 2.3) * 20),
              rotation: t.rotation ?? 0,
              scale: t.scale ?? 1,
            }}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {/* Toolbar pill */}
      <div style={{
        position: 'absolute', bottom: 24, right: 24,
        display: 'flex', alignItems: 'center', gap: 8,
        zIndex: 20,
      }}>
        {TOOLBAR_ITEMS.map(item => (
          <button
            key={item.label}
            onClick={item.action}
            style={{
              height: 44, padding: '0 20px',
              borderRadius: 999, border: '1px solid rgba(15,23,42,0.1)',
              background: '#fff',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 500,
              color: '#0f172a',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.transform = 'translateY(-2px)'
              el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.transform = 'translateY(0)'
              el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
            }}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
