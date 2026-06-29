'use client'

import {
  useState, useRef, useEffect, useCallback,
  type CSSProperties,
  type DragEvent,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { cn, blobToBase64 } from '@/lib/utils'
import {
  Pencil, Mic, MicOff, Camera, Video, VideoOff,
  Sparkles, X, ArrowUp, RotateCcw, Check,
  Eraser, Image as ImageIcon, Plus,
} from 'lucide-react'
import type { Thought } from '@/lib/thought-types'

interface ToolDockProps {
  onAdd: (thought: Omit<Thought, 'id' | 'createdAt'>) => void
  recentThoughts?: Thought[]
}

type Tool = 'write' | 'voice' | 'photo' | 'video' | 'draw' | 'ai' | 'upload' | null

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/* ─── Thinking dots ───────────────────────────────────────── */
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="think-dot w-2 h-2 rounded-full"
          style={{ background: 'var(--amber)', animationDelay: `${i * 0.22}s` }}
        />
      ))}
    </div>
  )
}

/* ─── Voice Recorder ──────────────────────────────────────── */
function VoiceRecorder({
  onSave, onCancel,
}: { onSave: (dataUrl: string, durationStr: string, caption: string) => void; onCancel: () => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'done'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [durationStr, setDurationStr] = useState('0:00')
  const [caption, setCaption] = useState('')
  const [permError, setPermError] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const bars = Array.from({ length: 24 }, (_, i) => ({
    h: 0.2 + Math.abs(Math.sin(i * 0.7 + 0.5)) * 0.78,
    d: `${0.5 + (i % 5) * 0.09}s`,
    delay: `${i * 0.038}s`,
  }))

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'audio/webm' })
        setBlobUrl(URL.createObjectURL(b))
        setState('done')
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      setPermError(true)
    }
  }

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setDurationStr(fmt(seconds))
    mediaRef.current?.stop()
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        if (state === 'idle') start()
        else if (state === 'recording') stop()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, start, stop])

  if (permError) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--rose-pale)' }}>
          <MicOff size={20} style={{ color: 'var(--rose)' }} />
        </div>
        <p className="text-[13px] text-center leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          Microphone access denied. Allow access in your browser settings.
        </p>
        <button
          onClick={onCancel}
          className="px-5 py-2 rounded-full text-[13px] font-medium"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--border-light)' }}
        >
          Dismiss
        </button>
      </div>
    )
  }

  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center gap-6 py-4">
        <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>Tap to start recording</p>
        <button
          onClick={start}
          className="w-20 h-20 rounded-full flex items-center justify-center relative transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'var(--sky)', boxShadow: '0 8px 24px rgba(59,130,196,0.35)' }}
        >
          <div className="pulse-ring absolute inset-0 rounded-full" style={{ border: '2px solid var(--sky)' }} />
          <Mic size={28} color="white" />
        </button>
        <p className="text-[12px]" style={{ color: 'var(--ink-4)' }}>Hold space or tap</p>
      </div>
    )
  }

  if (state === 'recording') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--ink-3)' }}>
              Recording
            </span>
          </div>
          <span className="text-[16px] font-mono tabular-nums font-semibold" style={{ color: 'var(--ink)' }}>
            {fmt(seconds)}
          </span>
        </div>
        <div className="flex items-end justify-center gap-[3px] h-12 px-2">
          {bars.map((b, i) => (
            <div
              key={i}
              className="wave-bar rounded-full"
              style={{
                width: '3px',
                height: `${b.h * 100}%`,
                background: 'var(--sky)',
                '--d': b.d,
                '--delay': b.delay,
              } as CSSProperties}
            />
          ))}
        </div>
        <button
          onClick={stop}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-[14px] font-semibold transition-opacity hover:opacity-85"
          style={{ background: 'var(--sky)', color: 'white' }}
        >
          <MicOff size={15} />
          Stop recording
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--sky-pale)', border: '1px solid var(--sky-border)' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--sky)' }}>
          <Mic size={15} color="white" />
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Recording complete</p>
          <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>{durationStr}</p>
        </div>
      </div>
      <input
        type="text"
        placeholder="Add context (optional)..."
        value={caption}
        onChange={e => setCaption(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-[13px]"
        style={{ background: 'var(--surface-3)', border: '1px solid var(--border-light)', color: 'var(--ink)' }}
      />
      <div className="flex gap-2">
        <button
          onClick={() => { setState('idle'); setBlobUrl(null); setCaption('') }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-medium"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--border-light)' }}
        >
          <RotateCcw size={13} /> Redo
        </button>
        <button
          onClick={() => blobUrl && onSave(blobUrl, durationStr, caption.trim() || 'Voice memo')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold"
          style={{ background: 'var(--sky)', color: 'white' }}
        >
          <Check size={13} /> Save memo
        </button>
      </div>
    </div>
  )
}

/* ─── Camera Capture ──────────────────────────────────────── */
function CameraCapture({
  onSave, onCancel,
}: { onSave: (dataUrl: string, caption: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [captured, setCaptured] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [permError, setPermError] = useState(false)

  useEffect(() => {
    let mounted = true
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => { if (mounted) setReady(true) }
        }
      })
      .catch(() => setPermError(true))
    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const snap = () => {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')?.drawImage(v, 0, 0)
    setCaptured(c.toDataURL('image/jpeg', 0.92))
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  if (permError) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--rose-pale)' }}>
          <Camera size={20} style={{ color: 'var(--rose)' }} />
        </div>
        <p className="text-[13px] text-center leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          Camera access denied. Allow access in your browser settings.
        </p>
        <button onClick={onCancel} className="px-5 py-2 rounded-full text-[13px] font-medium"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--border-light)' }}>
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl overflow-hidden relative bg-black" style={{ aspectRatio: '4/3', border: '1px solid var(--border-light)' }}>
        {!captured && (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
        {captured && (
          <img src={captured} alt="captured" className="w-full h-full object-cover" />
        )}
        {!ready && !captured && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'white' }} />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      {captured && (
        <input
          type="text"
          placeholder="Add context (optional)..."
          value={caption}
          onChange={e => setCaption(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-[13px]"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border-light)', color: 'var(--ink)' }}
        />
      )}
      <div className="flex gap-2">
        {!captured ? (
          <>
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-2xl text-[13px] font-medium"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--border-light)' }}
            >
              Cancel
            </button>
            <button
              onClick={snap}
              disabled={!ready}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold disabled:opacity-40"
              style={{ background: 'var(--ink)', color: 'white' }}
            >
              <Camera size={13} /> Take photo
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setCaptured(null); setCaption('') }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-medium"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--border-light)' }}
            >
              <RotateCcw size={13} /> Retake
            </button>
            <button
              onClick={() => onSave(captured, caption.trim())}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold"
              style={{ background: 'var(--ink)', color: 'white' }}
            >
              <Check size={13} /> Save photo
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Video Recorder ──────────────────────────────────────── */
function VideoRecorder({
  onSave, onCancel,
}: { onSave: (url: string, durationStr: string, caption: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [state, setState] = useState<'idle' | 'recording' | 'done'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [url, setUrl] = useState<string | null>(null)
  const [durationStr, setDurationStr] = useState('0:00')
  const [caption, setCaption] = useState('')
  const [permError, setPermError] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => { if (mounted) setReady(true) }
        }
      })
      .catch(() => setPermError(true))
    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRec = () => {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    const mr = new MediaRecorder(stream)
    mediaRef.current = mr
    mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      blobToBase64(blob).then(b64 => {
        setUrl(b64)
      })
      setState('done')
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
    mr.start()
    setState('recording')
    setSeconds(0)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const stopRec = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setDurationStr(fmt(seconds))
    mediaRef.current?.stop()
  }

  if (permError) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--rose-pale)' }}>
          <VideoOff size={20} style={{ color: 'var(--rose)' }} />
        </div>
        <p className="text-[13px] text-center leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          Camera or microphone access denied.
        </p>
        <button onClick={onCancel} className="px-5 py-2 rounded-full text-[13px] font-medium"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--border-light)' }}>
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl overflow-hidden relative bg-black" style={{ aspectRatio: '4/3', border: '1px solid var(--border-light)' }}>
        {state !== 'done' && (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
        {state === 'done' && url && (
          <video src={url} controls className="w-full h-full object-cover" />
        )}
        {!ready && state === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin border-white" />
          </div>
        )}
        {state === 'recording' && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.65)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse bg-red-500" />
            <span className="text-[12px] font-mono text-white tabular-nums font-semibold">{fmt(seconds)}</span>
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-col">
        {state === 'done' && (
          <input
            type="text"
            placeholder="Add context (optional)..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-[13px]"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border-light)', color: 'var(--ink)' }}
          />
        )}
        <div className="flex gap-2">
          {state === 'idle' && (
            <button
              onClick={startRec}
              disabled={!ready}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[14px] font-semibold disabled:opacity-40"
              style={{ background: '#EF4444', color: 'white' }}
            >
              <Video size={15} /> Start recording
            </button>
          )}
          {state === 'recording' && (
            <button
              onClick={stopRec}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[14px] font-semibold"
              style={{ background: 'var(--ink)', color: 'white' }}
            >
              <VideoOff size={15} /> Stop
            </button>
          )}
          {state === 'done' && (
            <>
              <button
                onClick={() => { setState('idle'); setUrl(null); setCaption('') }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-medium"
                style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--border-light)' }}
              >
                <RotateCcw size={13} /> Redo
              </button>
              <button
                onClick={() => url && onSave(url, durationStr, caption.trim())}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold"
                style={{ background: 'var(--ink)', color: 'white' }}
              >
                <Check size={13} /> Save video
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Draw Canvas ─────────────────────────────────────────── */
function DrawCanvas({
  onSave, onCancel,
}: { onSave: (dataUrl: string, caption: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [caption, setCaption] = useState('')
  const [brushSize, setBrushSize] = useState(3)
  const [brushColor, setBrushColor] = useState('#1A1916')
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const lastRef = useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height),
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrawing(true)
    const pos = getPos(e)
    lastRef.current = pos
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = tool === 'eraser' ? '#FAFAF8' : brushColor
    ctx.fill()
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    const ctx = canvasRef.current?.getContext('2d')
    const last = lastRef.current
    if (!ctx || !last) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = tool === 'eraser' ? '#FAFAF8' : brushColor
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastRef.current = pos
  }

  const onPointerUp = () => { setDrawing(false); lastRef.current = null }

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !canvasRef.current) return
    ctx.fillStyle = '#FAFAF8'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    c.width = 800
    c.height = 520
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#FAFAF8'
    ctx.fillRect(0, 0, c.width, c.height)
  }, [])

  const colors = ['#1A1916', '#D97A3A', '#3B82C4', '#4A8A68', '#E05050', '#8B5CF6']
  const sizes = [2, 4, 8, 14]

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 rounded-xl flex-wrap" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-light)' }}>
        <button
          onClick={() => setTool('pen')}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: tool === 'pen' ? 'white' : 'transparent',
            color: tool === 'pen' ? 'var(--ink)' : 'var(--ink-3)',
            boxShadow: tool === 'pen' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
          title="Pen"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => setTool('eraser')}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: tool === 'eraser' ? 'white' : 'transparent',
            color: tool === 'eraser' ? 'var(--ink)' : 'var(--ink-3)',
            boxShadow: tool === 'eraser' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
          title="Eraser"
        >
          <Eraser size={13} />
        </button>

        <div className="w-px h-5 mx-0.5" style={{ background: 'var(--border-light)' }} />

        <div className="flex items-center gap-1">
          {sizes.map(s => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
              style={{
                background: brushSize === s ? 'white' : 'transparent',
                boxShadow: brushSize === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <div
                className="rounded-full"
                style={{ width: s / 1.5 + 2, height: s / 1.5 + 2, background: 'var(--ink-2)' }}
              />
            </button>
          ))}
        </div>

        <div className="w-px h-5 mx-0.5" style={{ background: 'var(--border-light)' }} />

        <div className="flex items-center gap-1">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => { setBrushColor(c); setTool('pen') }}
              className="transition-transform hover:scale-110 active:scale-95"
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: c,
                outline: brushColor === c && tool === 'pen' ? `2.5px solid ${c}` : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>

        <button
          onClick={clear}
          className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
          style={{ background: 'transparent', color: 'var(--ink-3)' }}
          title="Clear canvas"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="draw-canvas w-full rounded-2xl"
        style={{ aspectRatio: '800/520', border: '1px solid var(--border-light)', background: '#FAFAF8' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      <input
        type="text"
        placeholder="Add context (optional)..."
        value={caption}
        onChange={e => setCaption(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-[13px]"
        style={{ background: 'var(--surface-3)', border: '1px solid var(--border-light)', color: 'var(--ink)' }}
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-2xl text-[13px] font-medium"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--border-light)' }}
        >
          Cancel
        </button>
        <button
          onClick={() => canvasRef.current && onSave(canvasRef.current.toDataURL('image/png'), caption.trim())}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold"
          style={{ background: 'var(--ink)', color: 'white' }}
        >
          <Check size={13} /> Save sketch
        </button>
      </div>
    </div>
  )
}

/* ─── Image Upload ────────────────────────────────────────── */
function ImageUpload({
  onSave, onCancel,
}: { onSave: (dataUrl: string, caption: string) => void; onCancel: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [caption, setCaption] = useState('')

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex flex-col gap-3">
      {!preview ? (
        <div
          className="relative flex flex-col items-center justify-center gap-4 py-12 rounded-2xl transition-all cursor-pointer"
          style={{
            border: `2px dashed ${dragging ? 'var(--ink-3)' : 'var(--border-strong)'}`,
            background: dragging ? 'var(--amber-pale)' : 'var(--surface-3)',
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--amber-pale)', border: '1px solid var(--amber-border)' }}>
            <ImageIcon size={20} style={{ color: 'var(--amber)' }} />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
              Drop an image here
            </p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--ink-3)' }}>
              or click to browse files
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="rounded-2xl overflow-hidden relative" style={{ border: '1px solid var(--border-light)' }}>
            <img src={preview} alt="upload preview" className="w-full object-cover max-h-64" />
          </div>
          <input
            type="text"
            placeholder="Add context (optional)..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-[13px]"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border-light)', color: 'var(--ink)' }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setPreview(null); setCaption('') }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-medium"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--border-light)' }}
            >
              <RotateCcw size={13} /> Change
            </button>
            <button
              onClick={() => preview && onSave(preview, caption.trim())}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[13px] font-semibold"
              style={{ background: 'var(--ink)', color: 'white' }}
            >
              <Check size={13} /> Save photo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Dock ───────────────────────────────────────────── */
const DOCK_TOOLS: {
  id: NonNullable<Tool>
  icon: ElementType
  label: string
  activeColor: string
  activeBg: string
}[] = [
  { id: 'write',  icon: Pencil,    label: 'Write',  activeColor: '#ffffff', activeBg: '#18181B' },
  { id: 'voice',  icon: Mic,       label: 'Voice',  activeColor: '#ffffff', activeBg: '#18181B' },
  { id: 'photo',  icon: Camera,    label: 'Photo',  activeColor: '#ffffff', activeBg: '#18181B' },
  { id: 'video',  icon: Video,     label: 'Video',  activeColor: '#ffffff', activeBg: '#18181B' },
  { id: 'draw',   icon: Pencil,    label: 'Draw',   activeColor: '#ffffff', activeBg: '#18181B' },
  { id: 'upload', icon: ImageIcon, label: 'Upload', activeColor: '#ffffff', activeBg: '#18181B' },
  { id: 'ai',     icon: Sparkles,  label: 'Think',  activeColor: '#ffffff', activeBg: '#18181B' },
]

const AI_PROMPTS = [
  'What am I missing?',
  'Find the pattern',
  'Opposite view',
  'First principles',
  'Simplify this',
  'What should I do next?',
]

const MODAL_TITLES: Record<NonNullable<Tool>, string> = {
  write:  'New thought',
  voice:  'Voice memo',
  photo:  'Take a photo',
  video:  'Record video',
  draw:   'Sketch an idea',
  upload: 'Add image',
  ai:     'Think with AI',
}

export default function ToolDock({ onAdd, recentThoughts }: ToolDockProps) {
  const [active, setActive] = useState<Tool>(null)
  const [text, setText] = useState('')
  const [aiQuery, setAiQuery] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const aiInputRef = useRef<HTMLInputElement>(null)

  const open = (tool: Tool) => setActive(tool)
  const close = useCallback(() => {
    setActive(null)
    setText('')
    setAiQuery('')
    setStreamedText('')
    setStreaming(false)
  }, [])

  useEffect(() => {
    if (active === 'write') setTimeout(() => textareaRef.current?.focus(), 60)
    if (active === 'ai') setTimeout(() => aiInputRef.current?.focus(), 60)
  }, [active])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 220) + 'px'
    }
  }, [text])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  const submitText = () => {
    if (!text.trim()) return
    onAdd({ type: 'text', content: text.trim() })
    close()
  }

  const submitAI = async (prompt?: string) => {
    const q = (prompt ?? aiQuery).trim()
    if (!q) return
    setStreaming(true)
    setAiQuery('')
    setStreamedText('')

    // Build context from recent thoughts
    const ctx = recentThoughts
      ?.slice(0, 5)
      .filter(t => t.type === 'text')
      .map(t => t.content)
      .join('\n')

    try {
      const res = await fetch('/api/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: q, context: ctx }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let full = ''

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
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'text-delta' && parsed.delta) {
              full += parsed.delta
              setStreamedText(full)
            }
          } catch {}
        }
      }

      if (full) {
        onAdd({ type: 'ai', content: full, tags: ['ai-insight'] })
      }
    } catch {
      onAdd({
        type: 'ai',
        content: `Thinking about "${q}" — this connects to a deeper pattern. When you strip away the noise, a simpler truth usually emerges.`,
        tags: ['ai-insight'],
      })
    }

    setStreaming(false)
    close()
  }

  const activeTool = DOCK_TOOLS.find(t => t.id === active)

  return (
    <>
      {/* Modal overlay */}
      {active && (
        <div
          className="modal-overlay fixed inset-0 z-40 flex items-end justify-center pb-28 px-4 sm:items-center sm:pb-0"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) close() }}
        >
          <div
            className="modal-panel w-full max-w-lg rounded-3xl p-6 flex flex-col gap-4"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {activeTool && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--surface-2)' }}
                  >
                    <activeTool.icon size={14} style={{ color: 'var(--ink-2)' }} />
                  </div>
                )}
                <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
                  {active && MODAL_TITLES[active]}
                </span>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--surface-3)]"
                style={{ background: 'var(--surface-2)', color: 'var(--ink-3)' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* ── Write ── */}
            {active === 'write' && (
              <div className="flex flex-col gap-4">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText() }
                  }}
                  placeholder="What's on your mind..."
                  rows={3}
                  className="text-[17px] leading-relaxed resize-none w-full no-scroll placeholder:text-[var(--ink-4)]"
                  style={{ color: 'var(--ink)', minHeight: 90, maxHeight: 220 }}
                />
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: '1px solid var(--border-light)' }}
                >
                  <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
                    {text.trim()
                      ? `${text.trim().split(/\s+/).length} words`
                      : 'Enter to save · Shift+Enter for new line'}
                  </span>
                  <button
                    onClick={submitText}
                    disabled={!text.trim()}
                    className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-25 transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'var(--ink)', color: 'white' }}
                  >
                    <ArrowUp size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Voice ── */}
            {active === 'voice' && (
              <VoiceRecorder
                onSave={(url, duration, caption) => { onAdd({ type: 'voice', content: caption || 'Voice memo', voiceUrl: url, voiceDuration: duration }); close() }}
                onCancel={close}
              />
            )}

            {/* ── Photo ── */}
            {active === 'photo' && (
              <CameraCapture
                onSave={(dataUrl, caption) => { onAdd({ type: 'photo', content: caption, mediaUrl: dataUrl }); close() }}
                onCancel={close}
              />
            )}

            {/* ── Video ── */}
            {active === 'video' && (
              <VideoRecorder
                onSave={(url, duration, caption) => { onAdd({ type: 'video', content: caption, mediaUrl: url, voiceDuration: duration }); close() }}
                onCancel={close}
              />
            )}

            {/* ── Draw ── */}
            {active === 'draw' && (
              <DrawCanvas
                onSave={(dataUrl, caption) => { onAdd({ type: 'draw', content: caption, mediaUrl: dataUrl }); close() }}
                onCancel={close}
              />
            )}

            {/* ── Upload ── */}
            {active === 'upload' && (
              <ImageUpload
                onSave={(dataUrl, caption) => { onAdd({ type: 'photo', content: caption, mediaUrl: dataUrl }); close() }}
                onCancel={close}
              />
            )}

            {/* ── AI ── */}
            {active === 'ai' && (
              <div className="flex flex-col gap-4">
                {streaming ? (
                  <div className="flex flex-col items-center gap-5 py-6">
                    <ThinkingDots />
                    <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
                      {streamedText
                        ? <span className="font-serif italic" style={{ color: 'var(--ink-2)' }}>{streamedText}<span className="ai-cursor" /></span>
                        : 'Thinking...'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {AI_PROMPTS.map(p => (
                        <button
                          key={p}
                          onClick={() => submitAI(p)}
                          className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all hover:scale-[1.02]"
                          style={{
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--ink-2)',
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <div
                      className="flex items-center gap-3 pt-3"
                      style={{ borderTop: '1px solid var(--border-light)' }}
                    >
                      <input
                        ref={aiInputRef}
                        value={aiQuery}
                        onChange={e => setAiQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitAI() }}
                        placeholder="Or ask anything about your ideas..."
                        className="flex-1 text-[14px] placeholder:text-[var(--ink-4)]"
                        style={{ color: 'var(--ink)' }}
                      />
                      <button
                        onClick={() => submitAI()}
                        disabled={!aiQuery.trim()}
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-25 transition-all hover:scale-105 active:scale-95"
                        style={{ background: 'var(--ink)', color: 'white' }}
                      >
                        <ArrowUp size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dock */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
        <div className="dock flex items-center gap-0.5 px-2 py-1.5 pointer-events-auto">
          {DOCK_TOOLS.map(({ id, icon: Icon, label, activeBg }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                onClick={() => open(id)}
                title={label}
                className={cn(
                  'relative flex flex-col items-center justify-center w-11 h-11 rounded-full transition-all duration-200',
                  isActive ? 'scale-90' : 'hover:scale-110',
                )}
                style={{
                  background: isActive ? activeBg : 'transparent',
                  color: isActive ? 'white' : 'var(--ink-3)',
                }}
              >

                <Icon size={16} />
              </button>
            )
          })}
          <div className="w-px h-5 mx-1" style={{ background: 'var(--border-strong)' }} />
          <button
            onClick={() => open('write')}
            className="flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] font-semibold transition-all hover:opacity-85 ml-0.5"
            style={{ background: 'var(--ink)', color: 'white' }}
          >
            <Plus size={14} />
            Capture
          </button>
        </div>
      </div>
    </>
  )
}
