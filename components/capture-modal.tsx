'use client'

import { useState, useRef, useEffect, useCallback, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { X, Pencil, Mic, MicOff, Camera, Video, VideoOff, Image as ImageIcon, ArrowUp, RotateCcw, Check, Eraser } from 'lucide-react'
import type { Thought } from '@/lib/thought-types'
import { cn } from '@/lib/utils'

type Tool = 'write' | 'voice' | 'photo' | 'video' | 'draw' | 'upload'

interface Props { onAdd: (t: Omit<Thought, 'id' | 'createdAt'>) => void; onClose: () => void }

function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

/* ── Voice ── */
function VoicePanel({ onSave, onCancel }: { onSave: (blob: Blob, dur: string) => void; onCancel: () => void }) {
  const [state, setState] = useState<'idle' | 'rec' | 'done'>('idle')
  const [secs, setSecs] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [dur, setDur] = useState('0:00')
  const [err, setErr] = useState(false)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<BlobPart[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stream = useRef<MediaStream | null>(null)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); stream.current?.getTracks().forEach(t => t.stop()) }, [])

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = s; chunks.current = []
      const mr = new MediaRecorder(s); mrRef.current = mr
      mr.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
      mr.onstop = () => { setBlob(new Blob(chunks.current, { type: 'audio/webm' })); setState('done'); s.getTracks().forEach(t => t.stop()) }
      mr.start(); setState('rec'); setSecs(0)
      timer.current = setInterval(() => setSecs(s => s + 1), 1000)
    } catch { setErr(true) }
  }
  const stop = () => { if (timer.current) clearInterval(timer.current); setDur(fmt(secs)); mrRef.current?.stop() }

  if (err) return <div style={{ textAlign: 'center', padding: '24px 0' }}><p style={{ fontSize: 13, color: 'var(--zinc-500)' }}>Microphone access denied.</p><button onClick={onCancel} style={{ marginTop: 12, fontSize: 13, color: 'var(--zinc-500)', background: 'none', border: '1px solid var(--zinc-200)', borderRadius: 8, padding: '6px 16px' }}>Dismiss</button></div>

  if (state === 'idle') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
      <button onClick={start} style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--zinc-900)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'transform 0.14s' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'}>
        <div className="pulse-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--zinc-400)' }} />
        <Mic size={26} />
      </button>
      <p style={{ fontSize: 13, color: 'var(--zinc-400)', margin: 0 }}>Tap to record · Space to toggle</p>
    </div>
  )

  if (state === 'rec') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'think-dot 1s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zinc-500)' }}>Recording</span>
        </div>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 500, color: 'var(--zinc-900)' }}>{fmt(secs)}</span>
      </div>
      <button onClick={stop} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--zinc-900)', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <MicOff size={15} /> Stop recording
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--zinc-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Mic size={15} style={{ color: 'var(--zinc-600)' }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--zinc-900)' }}>Recording done</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--zinc-500)' }}>{dur}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setState('idle'); setBlob(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', fontSize: 13, fontWeight: 500, color: 'var(--zinc-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <RotateCcw size={13} /> Redo
        </button>
        <button onClick={() => blob && onSave(blob, dur)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-900)', border: 'none', fontSize: 13, fontWeight: 500, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Check size={13} /> Save
        </button>
      </div>
    </div>
  )
}

/* ── Upload ── */
function UploadPanel({ onSave, onCancel }: { onSave: (url: string) => void; onCancel: () => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!preview ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          style={{ padding: '40px 20px', borderRadius: 16, border: `2px dashed ${dragging ? 'var(--zinc-500)' : 'var(--zinc-300)'}`, background: dragging ? 'var(--zinc-100)' : 'var(--zinc-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.14s' }}
        >
          <ImageIcon size={22} style={{ color: 'var(--zinc-400)' }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--zinc-700)' }}>Drop an image</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--zinc-400)' }}>or click to browse</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--zinc-200)' }}>
          <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { if (!preview) onCancel(); else setPreview(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', fontSize: 13, fontWeight: 500, color: 'var(--zinc-600)' }}>
          {preview ? 'Change' : 'Cancel'}
        </button>
        <button onClick={() => preview && onSave(preview)} disabled={!preview} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-900)', border: 'none', fontSize: 13, fontWeight: 500, color: 'white', opacity: preview ? 1 : 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Check size={13} /> Add photo
        </button>
      </div>
    </div>
  )
}

/* ── Draw ── */
function DrawPanel({ onSave, onCancel }: { onSave: (url: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [size, setSize] = useState(3)
  const [color, setColor] = useState('#18181B')
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const c = ref.current; if (!c) return
    c.width = 800; c.height = 440
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, c.width, c.height)
  }, [])

  const getPos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (ref.current!.width / r.width), y: (e.clientY - r.top) * (ref.current!.height / r.height) }
  }
  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId); setDrawing(true)
    const p = getPos(e); last.current = p
    const ctx = ref.current?.getContext('2d'); if (!ctx) return
    ctx.beginPath(); ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2)
    ctx.fillStyle = tool === 'eraser' ? '#FFFFFF' : color; ctx.fill()
  }
  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !last.current) return
    const ctx = ref.current?.getContext('2d'); if (!ctx) return
    const p = getPos(e)
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color
    ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
    last.current = p
  }
  const onUp = () => { setDrawing(false); last.current = null }
  const clear = () => { const ctx = ref.current?.getContext('2d'); if (!ctx || !ref.current) return; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, ref.current.width, ref.current.height) }

  const colors = ['#18181B', '#71717A', '#EF4444', '#3B82F6', '#22C55E', '#F59E0B']
  const sizes = [2, 4, 8, 14]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', flexWrap: 'wrap' }}>
        {[{ t: 'pen', icon: <Pencil size={13} /> }, { t: 'eraser', icon: <Eraser size={13} /> }].map(({ t, icon }) => (
          <button key={t} onClick={() => setTool(t as 'pen' | 'eraser')} style={{ width: 30, height: 30, borderRadius: 8, background: tool === t ? 'white' : 'transparent', border: tool === t ? '1px solid var(--zinc-300)' : '1px solid transparent', color: 'var(--zinc-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: tool === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>{icon}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--zinc-300)' }} />
        {sizes.map(s => (
          <button key={s} onClick={() => setSize(s)} style={{ width: 28, height: 28, borderRadius: 7, background: size === s ? 'white' : 'transparent', border: size === s ? '1px solid var(--zinc-300)' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: size === s ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            <div style={{ width: s / 1.4 + 2, height: s / 1.4 + 2, borderRadius: '50%', background: 'var(--zinc-700)' }} />
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--zinc-300)' }} />
        {colors.map(c => (
          <button key={c} onClick={() => { setColor(c); setTool('pen') }} style={{ width: 18, height: 18, borderRadius: '50%', background: c, outline: color === c && tool === 'pen' ? `2.5px solid ${c}` : 'none', outlineOffset: 2, border: 'none', transition: 'transform 0.1s' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'} />
        ))}
        <button onClick={clear} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 7, fontSize: 11, color: 'var(--zinc-500)', background: 'none', border: 'none' }}><RotateCcw size={12} /></button>
      </div>

      <canvas ref={ref} className="draw-canvas" style={{ width: '100%', aspectRatio: '800/440', borderRadius: 12, border: '1px solid var(--zinc-200)', background: 'white' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', fontSize: 13, fontWeight: 500, color: 'var(--zinc-600)' }}>Cancel</button>
        <button onClick={() => ref.current && onSave(ref.current.toDataURL())} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-900)', border: 'none', fontSize: 13, fontWeight: 500, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Check size={13} /> Save sketch
        </button>
      </div>
    </div>
  )
}

/* ── Tool list ── */
const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: 'write',  icon: <Pencil size={18} strokeWidth={1.8} />,    label: 'Write' },
  { id: 'voice',  icon: <Mic size={18} strokeWidth={1.8} />,       label: 'Voice' },
  { id: 'photo',  icon: <Camera size={18} strokeWidth={1.8} />,    label: 'Camera' },
  { id: 'upload', icon: <ImageIcon size={18} strokeWidth={1.8} />, label: 'Upload' },
  { id: 'draw',   icon: <Pencil size={18} strokeWidth={1.8} />,    label: 'Sketch' },
  { id: 'video',  icon: <Video size={18} strokeWidth={1.8} />,     label: 'Video' },
]



const TITLES: Record<Tool, string> = {
  write: 'New thought', voice: 'Voice memo', photo: 'Camera', upload: 'Add image', draw: 'Sketch', video: 'Record video',
}

export default function CaptureModal({ onAdd, onClose }: Props) {
  const [tool, setTool] = useState<Tool | null>(null)
  const [text, setText] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (tool === 'write') setTimeout(() => textRef.current?.focus(), 60)
  }, [tool])

  const submitText = () => {
    if (!text.trim()) return
    onAdd({ type: 'text', content: text.trim() })
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet" style={{ margin: '0 16px' }}>
        {/* Header */}
        <div className="modal-header">
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--zinc-900)', letterSpacing: '-0.02em' }}>
            {tool ? TITLES[tool] : 'Capture'}
          </span>
          <button
            onClick={tool ? () => setTool(null) : onClose}
            style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--zinc-100)', border: 'none', color: 'var(--zinc-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--zinc-200)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--zinc-100)'}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {!tool && (
            <div className="capture-grid">
              {TOOLS.map(t => (
                <button key={t.id} className="capture-tool-btn" onClick={() => setTool(t.id)}>
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {tool === 'write' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <textarea
                ref={textRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText() } }}
                placeholder="What's on your mind…"
                rows={5}
                style={{ width: '100%', fontSize: 16, lineHeight: 1.65, color: 'var(--zinc-900)', resize: 'none', letterSpacing: '-0.01em', padding: '12px 0', borderBottom: '1px solid var(--zinc-200)' }}
                className="no-scroll"
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--zinc-400)' }}>
                  {text.trim() ? `${text.trim().split(/\s+/).length} words` : 'Enter to save'}
                </span>
                <button
                  onClick={submitText}
                  disabled={!text.trim()}
                  style={{ width: 36, height: 36, borderRadius: '50%', background: text.trim() ? 'var(--zinc-900)' : 'var(--zinc-200)', border: 'none', color: text.trim() ? 'white' : 'var(--zinc-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.14s' }}
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          )}

          {tool === 'voice' && (
            <VoicePanel
              onSave={(blob, dur) => { onAdd({ type: 'voice', content: 'Voice memo', voiceUrl: URL.createObjectURL(blob), voiceDuration: dur }); onClose() }}
              onCancel={() => setTool(null)}
            />
          )}

          {tool === 'upload' && (
            <UploadPanel onSave={url => { onAdd({ type: 'photo', content: '', mediaUrl: url }); onClose() }} onCancel={() => setTool(null)} />
          )}

          {tool === 'draw' && (
            <DrawPanel onSave={url => { onAdd({ type: 'draw', content: '', mediaUrl: url }); onClose() }} onCancel={() => setTool(null)} />
          )}

          {tool === 'photo' && (
            <p style={{ fontSize: 13, color: 'var(--zinc-400)', textAlign: 'center', padding: '24px 0' }}>Camera capture available on mobile</p>
          )}

          {tool === 'video' && (
            <p style={{ fontSize: 13, color: 'var(--zinc-400)', textAlign: 'center', padding: '24px 0' }}>Video recording available on mobile</p>
          )}
        </div>
      </div>
    </div>
  )
}
