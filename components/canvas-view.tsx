'use client'

import { type Thought } from '@/lib/thought-types'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Type, Sparkles, Mic, Camera, Pen, Video, X, RotateCw, Maximize2, Play, Pause, Plus, ChevronLeft, Folder as FolderIcon, Check, Eraser } from 'lucide-react'

interface Props {
  thoughts: Thought[]
  onAdd: (t: Omit<Thought, 'id' | 'createdAt'>) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Thought>) => void
  onOpenCapture: () => void
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
function CanvasNode({ thought, onDelete, onUpdate, isEraserMode }: {
  thought: Thought
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Thought>) => void
  isEraserMode?: boolean
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
        transformOrigin: 'center',
        cursor: isEraserMode ? 'crosshair' : 'grab',
        userSelect: 'none',
        zIndex: hovered ? 10 : 1,
      }}
      onPointerDown={e => {
        if (isEraserMode && thought.type === 'draw') {
          e.stopPropagation()
          onDelete(thought.id)
        } else if (!isEraserMode || thought.type !== 'draw') {
          onPointerDown(e)
        }
      }}
      onPointerMove={(!isEraserMode || thought.type !== 'draw') ? onPointerMove : undefined}
      onPointerUp={(!isEraserMode || thought.type !== 'draw') ? onPointerUp : undefined}
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
              display: 'block',
              pointerEvents: 'none',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))',
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
        {hovered && !isEraserMode && thought.type !== 'draw' && (
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
                transition: 'background 0.15s ease, border-color 0.15s ease', pointerEvents: 'auto',
                transform: `scale(${1 / scale})`,
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
                transition: 'background 0.15s ease, color 0.15s ease', pointerEvents: 'auto',
                transform: `scale(${1 / scale})`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b' }}
            >
              <RotateCw size={14} />
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
                transition: 'background 0.15s ease, color 0.15s ease', pointerEvents: 'auto',
                transform: `scale(${1 / scale})`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b' }}
            >
              <Maximize2 size={14} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function LibraryItem({ t, canvasId, onUpdate }: { t: Thought, canvasId: string, onUpdate: (id: string, updates: Partial<Thought>) => void }) {
  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('text/plain', t.id)}
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--zinc-50)',
        border: '1px solid var(--zinc-150)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'grab',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
        {t.type === 'photo' && t.mediaUrl && (
          <img src={t.mediaUrl} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
        )}
        {t.type === 'draw' && t.mediaUrl && (
          <img src={t.mediaUrl} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain', background: 'white' }} />
        )}
        {t.type === 'video' && t.mediaUrl && (
          <div style={{ width: 24, height: 24, borderRadius: 4, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Video size={12} color="white" />
          </div>
        )}
        {t.type === 'voice' && (
          <div style={{ width: 24, height: 24, borderRadius: 4, background: 'var(--zinc-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={12} color="var(--zinc-600)" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--zinc-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.content || `${t.type.toUpperCase()} item`}
          </p>
          <span style={{ fontSize: 10, color: 'var(--zinc-400)' }}>{t.type}</span>
        </div>
      </div>
      <button
        onClick={() => onUpdate(t.id, { canvasId, x: 100 + Math.random() * 100, y: 100 + Math.random() * 100 })}
        className="scale-on-press"
        style={{
          width: 24, height: 24, borderRadius: 6, border: 'none', background: 'var(--zinc-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

/* ── Canvas View ── */
export default function CanvasView({ thoughts, allThoughts = [], folders = [], canvasId, onAdd, onDelete, onUpdate, onOpenCapture }: Props & { allThoughts?: Thought[]; folders?: { id: string, name: string }[]; canvasId: string }) {
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawHovered, setDrawHovered] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Drawing state
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const drawCtx = useRef<CanvasRenderingContext2D | null>(null)
  const isPointerDown = useRef(false)
  const [drawColor, setDrawColor] = useState('#000000')
  const [drawSize, setDrawSize] = useState(3)
  const [isErasing, setIsErasing] = useState(false)
  const [editingText, setEditingText] = useState<{ x: number, y: number } | null>(null)
  const [libView, setLibView] = useState<'root' | 'captures' | string>('root')
  const [isNodeEraserActive, setIsNodeEraserActive] = useState(false)

  // Initialize drawing canvas
  useEffect(() => {
    if (isDrawing && drawCanvasRef.current) {
      const cvs = drawCanvasRef.current
      cvs.width = cvs.offsetWidth
      cvs.height = cvs.offsetHeight
      const ctx = cvs.getContext('2d')
      if (ctx) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        drawCtx.current = ctx
      }
    }
  }, [isDrawing])

  const startDraw = (e: React.PointerEvent) => {
    if (!drawCtx.current || !drawCanvasRef.current) return
    isPointerDown.current = true
    const rect = drawCanvasRef.current.getBoundingClientRect()
    drawCtx.current.beginPath()
    drawCtx.current.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }
  const draw = (e: React.PointerEvent) => {
    if (!isPointerDown.current || !drawCtx.current || !drawCanvasRef.current) return
    const rect = drawCanvasRef.current.getBoundingClientRect()
    drawCtx.current.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over'
    drawCtx.current.strokeStyle = isErasing ? 'rgba(0,0,0,1)' : drawColor
    drawCtx.current.lineWidth = isErasing ? drawSize * 4 : drawSize
    drawCtx.current.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    drawCtx.current.stroke()
  }
  const endDraw = () => {
    if (!drawCtx.current) return
    isPointerDown.current = false
    drawCtx.current.closePath()
  }
  const saveDrawing = () => {
    if (drawCanvasRef.current) {
      const cvs = drawCanvasRef.current
      const ctx = cvs.getContext('2d')
      if (ctx) {
        const w = cvs.width
        const h = cvs.height
        const imgData = ctx.getImageData(0, 0, w, h)
        let minX = w, minY = h, maxX = 0, maxY = 0
        
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (imgData.data[(y * w + x) * 4 + 3] > 0) {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }
        
        if (maxX >= minX && maxY >= minY) {
          const cropW = maxX - minX + 1
          const cropH = maxY - minY + 1
          const temp = document.createElement('canvas')
          temp.width = cropW
          temp.height = cropH
          const tCtx = temp.getContext('2d')
          if (tCtx) {
            tCtx.putImageData(ctx.getImageData(minX, minY, cropW, cropH), 0, 0)
            onAdd({
              type: 'draw',
              content: '',
              mediaUrl: temp.toDataURL('image/png'),
              canvasId,
              x: minX,
              y: minY,
            })
          }
        }
      }
    }
    setIsDrawing(false)
  }


  // Filter thoughts to only show those that are NOT already on the current canvas
  const captures = allThoughts.filter(t => t.canvasId !== canvasId && !t.folderId && t.type !== 'ai')
  const folderItems = folders.map(f => ({
    ...f,
    items: allThoughts.filter(t => t.folderId === f.id && t.canvasId !== canvasId && t.type !== 'ai')
  }))

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onAdd({
          type: 'photo',
          content: file.name,
          mediaUrl: reader.result,
          canvasId,
          x: 100 + Math.random() * 200,
          y: 100 + Math.random() * 200,
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const TOOLBAR_ITEMS = [
    {
      label: 'Text',
      icon: <Type size={18} />,
      action: () => {
        setEditingText({ x: window.innerWidth / 2 - 140, y: window.innerHeight / 2 - 80 })
      },
    },
    {
      label: 'Photo',
      icon: <Camera size={18} />,
      action: () => fileInputRef.current?.click(),
    },
    {
      label: 'Draw',
      icon: <Pen size={18} />,
      action: () => {
        if (isDrawing) {
          saveDrawing()
        } else {
          setIsDrawing(true)
        }
      },
    },
    {
      label: 'Erase Node',
      icon: <Eraser size={18} color={isNodeEraserActive ? '#ef4444' : 'currentColor'} />,
      action: () => setIsNodeEraserActive(prev => !prev),
    },
    {
      label: 'Library',
      icon: <Sparkles size={18} color="#8b5cf6" />,
      action: () => setLibraryOpen(prev => !prev),
    }
  ]

  return (
    <div 
      style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        const tId = e.dataTransfer.getData('text/plain')
        if (tId) {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left - 50
          const y = e.clientY - rect.top - 50
          onUpdate(tId, { canvasId, x, y })
        }
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Dot-grid surface */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: '#f8fafc',
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        overflow: 'hidden',
        cursor: isNodeEraserActive ? 'crosshair' : 'default',
      }}>
        {thoughts.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 36 }}>🖼️</span>
            <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Canvas is empty</p>
            <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0 }}>Add a note or image node below</p>
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
            isEraserMode={isNodeEraserActive}
          />
        ))}

        {/* Drawing Overlay */}
        {isDrawing && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 30,
            background: 'transparent',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 12, alignItems: 'center', padding: '10px 16px',
              background: 'white', borderRadius: 999, border: '1px solid var(--zinc-200)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 40
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map(c => (
                  <button key={c} onClick={() => { setDrawColor(c); setIsErasing(false) }} style={{
                    width: 24, height: 24, borderRadius: '50%', background: c,
                    border: drawColor === c && !isErasing ? '2px solid white' : 'none',
                    boxShadow: drawColor === c && !isErasing ? `0 0 0 2px ${c}` : 'none'
                  }} />
                ))}
              </div>
              <div style={{ width: 1, height: 20, background: 'var(--zinc-200)' }} />
              <button onClick={() => setIsErasing(true)} style={{
                width: 28, height: 28, borderRadius: 6, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isErasing ? 'var(--zinc-200)' : 'transparent',
                color: 'var(--zinc-600)', cursor: 'pointer', transition: 'background 0.15s ease'
              }} title="Eraser">
                <Eraser size={16} />
              </button>
              <div style={{ width: 1, height: 20, background: 'var(--zinc-200)' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                {[2, 4, 8].map(s => (
                  <button key={s} onClick={() => setDrawSize(s)} style={{
                    width: 24, height: 24, borderRadius: '50%', background: 'var(--zinc-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: drawSize === s ? '1px solid var(--zinc-400)' : 'none',
                    color: 'var(--zinc-600)'
                  }}>
                    <div style={{ width: s, height: s, borderRadius: '50%', background: 'currentColor' }} />
                  </button>
                ))}
              </div>
              <div style={{ width: 1, height: 20, background: 'var(--zinc-200)' }} />
              <button onClick={() => { setIsDrawing(false); setIsErasing(false) }} style={{
                width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--zinc-200)', background: 'white', color: 'var(--zinc-600)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }} title="Cancel">
                <X size={14} />
              </button>
              <button onClick={saveDrawing} style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--zinc-900)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }} title="Done">
                <Check size={14} />
              </button>
            </div>
            
            <canvas
              ref={drawCanvasRef}
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
              style={{ width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Library Central Modal */}
      {libraryOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }} onClick={() => setLibraryOpen(false)} />
          <div style={{
            position: 'relative', width: 800, height: 540,
            background: '#ffffff', borderRadius: 24, border: '1px solid var(--zinc-200)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex',
            overflow: 'hidden', animation: 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Left Sidebar */}
            <div style={{ width: 220, minWidth: 0, flexShrink: 0, borderRight: '1px solid var(--zinc-150)', background: 'var(--zinc-50)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--zinc-150)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--zinc-900)' }}>Library</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 4 }} className="no-scroll">
                <button
                  onClick={() => setLibView('captures')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: libView === 'captures' ? 'var(--zinc-200)' : 'transparent',
                    borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                    border: 'none', color: 'var(--zinc-800)', fontSize: 14, fontWeight: 500,
                  }}
                >
                  <Sparkles size={16} color="var(--zinc-500)" /> Captures
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--zinc-400)' }}>{captures.length}</span>
                </button>
                <div style={{ marginTop: 12, marginBottom: 4, padding: '0 12px', fontSize: 12, fontWeight: 600, color: 'var(--zinc-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Folders
                </div>
                {folderItems.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setLibView(f.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: libView === f.id ? 'var(--zinc-200)' : 'transparent',
                      borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                      border: 'none', color: 'var(--zinc-800)', fontSize: 14, fontWeight: 500,
                    }}
                  >
                    <FolderIcon size={16} color="var(--zinc-500)" /> {f.name}
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--zinc-400)' }}>{f.items.length}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Content */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--zinc-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <input
                  type="text"
                  placeholder="Search thoughts..."
                  style={{
                    width: '60%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--zinc-200)',
                    background: 'var(--zinc-50)', fontSize: 14, outline: 'none', color: 'var(--zinc-800)'
                  }}
                />
                <button onClick={() => setLibraryOpen(false)} style={{ background: 'var(--zinc-100)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--zinc-500)' }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }} className="no-scroll">
                {(libView === 'root' || libView === 'captures') ? (
                  <>
                    {captures.map(t => <div key={t.id} onClick={() => setLibraryOpen(false)}><LibraryItem t={t} canvasId={canvasId} onUpdate={onUpdate} /></div>)}
                    {captures.length === 0 && <div style={{ fontSize: 13, color: 'var(--zinc-400)', textAlign: 'center', padding: '40px 0' }}>No captures available.</div>}
                  </>
                ) : (
                  <>
                    {folderItems.find(f => f.id === libView)?.items.map(t => <div key={t.id} onClick={() => setLibraryOpen(false)}><LibraryItem t={t} canvasId={canvasId} onUpdate={onUpdate} /></div>)}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar pill */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20,
      }}>
        <div style={{
          display: 'flex', gap: 6, padding: '6px',
          background: 'var(--white)',
          border: '1px solid var(--zinc-200)',
          borderRadius: 999,
          boxShadow: '0 8px 30px rgba(0,0,0,0.1), 0 2px 10px rgba(0,0,0,0.06)',
        }}>
          {TOOLBAR_ITEMS.map(item => {
            if (item.label === 'Draw') {
              return (
                <div key={item.label} style={{ position: 'relative' }}
                  onMouseEnter={() => setDrawHovered(true)}
                  onMouseLeave={() => setDrawHovered(false)}
                >
                  {/* Hover picker */}
                  {drawHovered && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                      marginBottom: 8, padding: '10px 14px',
                      background: 'white', borderRadius: 14, border: '1px solid var(--zinc-200)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160,
                      zIndex: 100,
                    }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'].map(c => (
                          <button key={c} onClick={() => { setDrawColor(c); setIsDrawing(true); setIsErasing(false) }} style={{
                            width: 20, height: 20, borderRadius: '50%', background: c,
                            border: drawColor === c && !isErasing ? '2px solid white' : 'none',
                            outline: drawColor === c && !isErasing ? `2px solid ${c}` : 'none',
                            outlineOffset: 1, cursor: 'pointer', flexShrink: 0,
                          }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {[2, 4, 8].map(s => (
                          <button key={s} onClick={() => { setDrawSize(s); setIsDrawing(true) }} style={{
                            width: 28, height: 28, borderRadius: 8, background: drawSize === s ? 'var(--zinc-100)' : 'transparent',
                            border: drawSize === s ? '1px solid var(--zinc-300)' : '1px solid transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          }}>
                            <div style={{ width: s + 2, height: s + 2, borderRadius: '50%', background: isErasing ? '#ccc' : drawColor }} />
                          </button>
                        ))}
                        <span style={{ fontSize: 11, color: 'var(--zinc-400)', marginLeft: 4 }}>size</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={item.action}
                    className="scale-on-press"
                    style={{
                      height: 36, padding: '0 16px',
                      borderRadius: 999, border: 'none',
                      background: 'transparent',
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 13, fontWeight: 500,
                      color: 'var(--zinc-700)', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--zinc-100)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    {item.icon} {item.label}
                  </button>
                </div>
              )
            }
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="scale-on-press"
                style={{
                  height: 36, padding: '0 16px',
                  borderRadius: 999, border: 'none',
                  background: 'transparent',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 500,
                  color: 'var(--zinc-700)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'var(--zinc-100)'
                  el.style.color = 'var(--zinc-900)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'transparent'
                  el.style.color = 'var(--zinc-700)'
                }}
              >
                {item.icon} {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Inline Text Input */}
      {editingText && (
        <div style={{
          position: 'absolute', left: editingText.x, top: editingText.y, zIndex: 50,
          background: 'white', borderRadius: 12, padding: '12px 16px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          border: '1px solid var(--zinc-200)',
        }}>
          <textarea
            autoFocus
            style={{ 
              width: 260, minHeight: 80, border: 'none', outline: 'none', resize: 'none', 
              fontFamily: 'DM Sans, Inter, sans-serif', fontSize: 14, color: 'var(--zinc-900)',
              lineHeight: 1.6, letterSpacing: '-0.015em'
            }}
            placeholder="Type your note here... (Enter to save)"
            onBlur={(e) => {
              const val = e.target.value.trim()
              if (val) {
                onAdd({
                  type: 'text',
                  content: val,
                  canvasId,
                  x: editingText.x,
                  y: editingText.y,
                })
              }
              setEditingText(null)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.blur()
              }
              if (e.key === 'Escape') {
                e.currentTarget.value = ''
                setEditingText(null)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
