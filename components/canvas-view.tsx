'use client'

import { type Thought } from '@/lib/thought-types'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Sparkles, Pin, Mic, Pencil, Maximize, RotateCw } from 'lucide-react'

interface Props { 
  thoughts: Thought[]; 
  onPin: (id: string) => void; 
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Thought>) => void;
}

function useDraggable(initialX: number, initialY: number, onDragEnd: (x: number, y: number) => void) {
  const [pos, setPos] = useState({ x: initialX, y: initialY })
  const dragging = useRef(false)
  const origin = useRef({ mx: 0, my: 0, nx: 0, ny: 0 })

  // Keep internal state in sync with external initial positions if they change externally
  useEffect(() => {
    setPos({ x: initialX, y: initialY })
  }, [initialX, initialY])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
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
    if (dragging.current) {
      dragging.current = false 
      onDragEnd(pos.x, pos.y)
    }
  }, [pos, onDragEnd])

  return { pos, onPointerDown, onPointerMove, onPointerUp }
}

function CanvasCard({ thought, onDelete, onUpdate }: { thought: Thought; onDelete: (id: string) => void; onUpdate: (id: string, updates: Partial<Thought>) => void }) {
  const initX = thought.x ?? Math.random() * 400 + 40
  const initY = thought.y ?? Math.random() * 300 + 40
  
  const handleDragEnd = useCallback((x: number, y: number) => {
    onUpdate(thought.id, { x, y })
  }, [thought.id, onUpdate])

  const { pos, onPointerDown, onPointerMove, onPointerUp } = useDraggable(initX, initY, handleDragEnd)
  const [hovered, setHovered] = useState(false)
  const [rotation, setRotation] = useState(thought.rotation ?? 0)
  const [scale, setScale] = useState(thought.scale ?? 1)

  // Keep state in sync with props
  useEffect(() => {
    setRotation(thought.rotation ?? 0)
  }, [thought.rotation])

  useEffect(() => {
    setScale(thought.scale ?? 1)
  }, [thought.scale])

  const handleRotate = () => {
    const nextR = (rotation + 15) % 360
    setRotation(nextR)
    onUpdate(thought.id, { rotation: nextR })
  }

  const handleScale = () => {
    const nextS = scale >= 2.5 ? 1 : scale + 0.15
    setScale(nextS)
    onUpdate(thought.id, { scale: nextS })
  }

  return (
    <div
      className="canvas-note group"
      style={{ left: pos.x, top: pos.y, cursor: 'grab', transform: `rotate(${rotation}deg) scale(${scale})`, transformOrigin: 'center' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {thought.type === 'text' && (
        <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--zinc-800)', margin: 0, fontWeight: 450, letterSpacing: '-0.01em', cursor: 'inherit' }}>
          {thought.content}
        </p>
      )}
      {thought.type === 'ai' && (
        <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--zinc-500)', fontStyle: 'italic', margin: 0, cursor: 'inherit' }}>
          {thought.content}
        </p>
      )}
      {thought.type === 'voice' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mic size={13} style={{ color: 'var(--zinc-400)' }} />
          <span style={{ fontSize: 12, color: 'var(--zinc-500)' }}>Voice · {thought.voiceDuration}</span>
        </div>
      )}
      {thought.type === 'photo' && thought.mediaUrl && (
        <img src={thought.mediaUrl} alt="photo" style={{ width: 200, borderRadius: 8, display: 'block', pointerEvents: 'none' }} />
      )}
      {thought.type === 'draw' && thought.mediaUrl && (
        <img src={thought.mediaUrl} alt="sketch" style={{ width: 220, opacity: 0.85, display: 'block', pointerEvents: 'none' }} />
      )}

      {/* Delete and modify buttons on hover */}
      {hovered && (
        <>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onDelete(thought.id)}
            style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: 'var(--zinc-800)', color: 'white', border: 'none', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
          
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={handleRotate}
            className="flex items-center justify-center bg-white shadow-md border border-[var(--zinc-200)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
            style={{ position: 'absolute', bottom: -12, left: 'calc(50% - 30px)', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer' }}
          >
            <RotateCw size={12} />
          </button>
          
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={handleScale}
            className="flex items-center justify-center bg-white shadow-md border border-[var(--zinc-200)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
            style={{ position: 'absolute', bottom: -12, left: 'calc(50% + 6px)', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer' }}
          >
            <Maximize size={12} />
          </button>
        </>
      )}
    </div>
  )
}

export default function CanvasView({ thoughts, onPin, onDelete, onUpdate }: Props) {
  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {/* Paper grid */}
      <div className="canvas-surface" style={{ position: 'absolute', inset: 0 }}>
        {thoughts.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, pointerEvents: 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(228,228,231,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pencil size={18} style={{ color: 'var(--zinc-400)' }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--zinc-400)', margin: 0 }}>Canvas is empty</p>
            <p style={{ fontSize: 12, color: 'var(--zinc-300)', margin: 0 }}>Add thoughts and they'll appear here</p>
          </div>
        )}
        {thoughts.map((t, i) => {
          // If the thought already has a saved position, use it! Otherwise, scatter it.
          const x = t.x ?? (60 + (i % 3) * 320 + (Math.sin(i * 3.7) * 30))
          const y = t.y ?? (60 + Math.floor(i / 3) * 200 + (Math.cos(i * 2.3) * 20))
          const r = t.rotation ?? (Math.sin(i * 1.3) * 5)
          const s = t.scale ?? 1
          
          return (
            <CanvasCard 
              key={t.id} 
              thought={{ ...t, x, y, rotation: r, scale: s }} 
              onDelete={onDelete} 
              onUpdate={onUpdate}
            />
          )
        })}
      </div>
      
      {/* Canvas Toolbar */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2 p-2 rounded-xl glass shadow-lg border border-[rgba(255,255,255,0.4)]">
        <button className="h-8 px-3 rounded-lg text-[13px] font-medium text-[var(--ink-2)] hover:bg-white hover:shadow-sm transition-all flex items-center gap-1.5">
          <Pencil size={14} /> Tools
        </button>
      </div>
    </div>
  )
}
