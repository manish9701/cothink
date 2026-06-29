'use client'

import { useState, useRef, useEffect, useCallback, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { X, MicOff, Check, Eraser, RotateCcw, Type, Mic, Camera, Image as ImageIcon, Pen, Video, ArrowUp } from 'lucide-react'
import type { Thought } from '@/lib/thought-types'
import { cn, blobToBase64 } from '@/lib/utils'

type Tool = 'write' | 'voice' | 'photo' | 'video' | 'draw' | 'upload'

interface Props { onAdd: (t: Omit<Thought, 'id' | 'createdAt'>) => void; onClose: () => void }

function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

/* ── Voice ── */
function VoicePanel({ onSave, onCancel }: { onSave: (blob: Blob, dur: string, caption: string) => void; onCancel: () => void }) {
  const [state, setState] = useState<'idle' | 'rec' | 'done'>('idle')
  const [secs, setSecs] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [dur, setDur] = useState('0:00')
  const [err, setErr] = useState(false)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<BlobPart[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const [caption, setCaption] = useState('')

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

      // Start Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.onresult = (e: any) => {
          let t = ''
          for (let i = e.resultIndex; i < e.results.length; ++i) t += e.results[i][0].transcript
          setTranscript(prev => prev + ' ' + t)
        }
        recognition.start()
        recognitionRef.current = recognition
      }
    } catch { setErr(true) }
  }
  const stop = () => { 
    if (timer.current) clearInterval(timer.current)
    setDur(fmt(secs))
    mrRef.current?.stop()
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  if (err) return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <MicOff size={32} style={{ margin: '0 auto 10px', color: 'var(--zinc-400)' }} />
      <p style={{ fontSize: 13, color: 'var(--zinc-500)' }}>Microphone access denied.</p>
      <button onClick={onCancel} style={{ marginTop: 12, fontSize: 13, color: 'var(--zinc-500)', background: 'none', border: '1px solid var(--zinc-200)', borderRadius: 8, padding: '6px 16px' }}>Dismiss</button>
    </div>
  )

  if (state === 'idle') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '28px 0' }}>
      <button
        onClick={start}
        style={{
          width: 76, height: 76, borderRadius: '50%',
          background: 'var(--zinc-900)', border: 'none', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'transform 0.14s, box-shadow 0.14s',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)' }}
      >
        <div className="pulse-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--zinc-400)' }} />
        <Mic size={36} />
      </button>
      <p style={{ fontSize: 13, color: 'var(--zinc-400)', margin: 0, fontWeight: 400 }}>Tap to start recording</p>
    </div>
  )

  if (state === 'rec') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', animation: 'think-dot 1s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zinc-500)' }}>Recording</span>
        </div>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 600, color: 'var(--zinc-900)', letterSpacing: '0.02em' }}>{fmt(secs)}</span>
      </div>
      {/* Live transcript preview */}
      {transcript && (
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: 'var(--zinc-50)', border: '1px solid var(--zinc-150)',
          borderLeft: '2px solid var(--zinc-300)',
          minHeight: 44,
        }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--zinc-600)', fontStyle: 'italic' }}>
            {transcript.trim()}
          </p>
        </div>
      )}
      {!transcript && (
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: 'var(--zinc-50)', border: '1px solid var(--zinc-150)',
          minHeight: 44, display: 'flex', alignItems: 'center',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--zinc-400)', fontStyle: 'italic' }}>Listening for speech…</p>
        </div>
      )}
      <button onClick={stop} className="btn btn-primary" style={{ width: '100%', height: 44, borderRadius: 12, fontSize: 14 }}>
        <MicOff size={18} /> Stop recording
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--zinc-50)', border: '1px solid var(--zinc-150)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--zinc-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mic size={20} color="var(--zinc-500)" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--zinc-900)', letterSpacing: '-0.01em' }}>Recording complete</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--zinc-400)', fontFamily: 'DM Mono, monospace' }}>{dur}</p>
        </div>
      </div>
      {transcript && (
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: 'var(--zinc-50)', border: '1px solid var(--zinc-150)',
          borderLeft: '2px solid var(--zinc-300)',
        }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: 'var(--zinc-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Transcript</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--zinc-700)', fontStyle: 'italic' }}>{transcript.trim()}</p>
        </div>
      )}
      <input
        type="text"
        value={caption}
        onChange={e => setCaption(e.target.value)}
        placeholder="Add context or caption (optional)…"
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
          border: '1px solid var(--zinc-200)', background: 'var(--zinc-50)',
          color: 'var(--zinc-900)', fontFamily: 'inherit', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setState('idle'); setBlob(null); setTranscript(''); setCaption('') }} className="btn btn-secondary" style={{ flex: 1, height: 40, borderRadius: 10 }}>
          <RotateCcw size={16} /> Redo
        </button>
        <button
          onClick={() => blob && onSave(blob, transcript.trim() || dur, caption.trim())}
          className="btn btn-primary"
          style={{ flex: 1, height: 40, borderRadius: 10 }}
        >
          <Check size={16} /> Save
        </button>
      </div>
    </div>
  )
}

/* ── Camera (live webcam snap) ── */
function CameraPanel({ onSave, onCancel }: { onSave: (url: string, caption: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [err, setErr] = useState(false)
  const [ready, setReady] = useState(false)
  const [captionPhoto, setCaptionPhoto] = useState('')

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(s => {
        setStream(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play().then(() => setReady(true)).catch(() => setReady(true))
        }
      })
      .catch(() => setErr(true))
    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const snap = useCallback(() => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    const url = canvas.toDataURL('image/jpeg', 0.88)
    setCaptured(url)
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
  }, [stream])

  if (err) return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <Camera size={32} style={{ margin: '0 auto 10px', color: 'var(--zinc-400)' }} />
      <p style={{ fontSize: 13, color: 'var(--zinc-500)', margin: '0 0 16px' }}>Camera access denied or unavailable.</p>
      <button onClick={onCancel} style={{ fontSize: 13, color: 'var(--zinc-600)', background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', borderRadius: 8, padding: '7px 18px' }}>Back</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!captured ? (
        <>
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {!ready && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={32} color="rgba(255,255,255,0.4)" />
              </div>
            )}
            {/* Viewfinder corners */}
            <div style={{ position: 'absolute', inset: 12, border: '2px solid rgba(255,255,255,0.3)', borderRadius: 8, pointerEvents: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{ flex: '0 0 auto', padding: '10px 16px', borderRadius: 10, background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', fontSize: 13, fontWeight: 500, color: 'var(--zinc-600)' }}>Cancel</button>
            <button
              onClick={snap}
              disabled={!ready}
              style={{ flex: 1, padding: '10px', borderRadius: 10, background: ready ? 'var(--zinc-900)' : 'var(--zinc-200)', border: 'none', fontSize: 14, fontWeight: 600, color: ready ? 'white' : 'var(--zinc-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}
            >
              <Camera size={20} />
              Snap Photo
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--zinc-200)' }}>
            <img src={captured} alt="captured" style={{ width: '100%', display: 'block' }} />
          </div>
          <input
            type="text"
            value={captionPhoto}
            onChange={e => setCaptionPhoto(e.target.value)}
            placeholder="Add context or caption (optional)…"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
              border: '1px solid var(--zinc-200)', background: 'var(--zinc-50)',
              color: 'var(--zinc-900)', fontFamily: 'inherit', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setCaptured(null); setErr(false); setReady(false); navigator.mediaDevices.getUserMedia({ video: true }).then(s => { setStream(s); if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().then(() => setReady(true)) } }) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', fontSize: 13, fontWeight: 500, color: 'var(--zinc-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <RotateCcw size={13} /> Retake
            </button>
            <button onClick={() => onSave(captured, captionPhoto.trim())} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-900)', border: 'none', fontSize: 13, fontWeight: 500, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={13} /> Use Photo
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Video Recording ── */
function VideoPanel({ onSave, onCancel }: { onSave: (blob: Blob, dur: string, caption: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playbackRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'idle' | 'rec' | 'done'>('idle')
  const [secs, setSecs] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [dur, setDur] = useState('0:00')
  const [err, setErr] = useState(false)
  const [ready, setReady] = useState(false)
  const [captionVideo, setCaptionVideo] = useState('')
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<BlobPart[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stream = useRef<MediaStream | null>(null)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(s => {
        stream.current = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play().then(() => setReady(true)).catch(() => setReady(true))
        }
      })
      .catch(() => setErr(true))
    return () => {
      if (timer.current) clearInterval(timer.current)
      stream.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  useEffect(() => {
    if (state === 'done' && blob && playbackRef.current) {
      playbackRef.current.src = URL.createObjectURL(blob)
    }
  }, [state, blob])

  const startRec = () => {
    if (!stream.current) return
    chunks.current = []
    const mr = new MediaRecorder(stream.current, { mimeType: 'video/webm;codecs=vp9' })
    mrRef.current = mr
    mr.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
    mr.onstop = () => {
      const b = new Blob(chunks.current, { type: 'video/webm' })
      setBlob(b)
      setState('done')
    }
    mr.start()
    setState('rec')
    setSecs(0)
    timer.current = setInterval(() => setSecs(s => s + 1), 1000)
  }

  const stopRec = () => {
    if (timer.current) clearInterval(timer.current)
    setDur(fmt(secs))
    mrRef.current?.stop()
    stream.current?.getTracks().forEach(t => t.stop())
  }

  if (err) return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <Video size={32} style={{ margin: '0 auto 10px', color: 'var(--zinc-400)' }} />
      <p style={{ fontSize: 13, color: 'var(--zinc-500)', margin: '0 0 16px' }}>Camera / microphone access denied.</p>
      <button onClick={onCancel} style={{ fontSize: 13, color: 'var(--zinc-600)', background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', borderRadius: 8, padding: '7px 18px' }}>Back</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
        {state !== 'done' ? (
          <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <video ref={playbackRef} controls style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        {state === 'rec' && (
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 20 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', animation: 'think-dot 1s ease-in-out infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'white', fontFamily: 'DM Mono, monospace' }}>{fmt(secs)}</span>
          </div>
        )}
      </div>

      {state === 'idle' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: '0 0 auto', padding: '10px 16px', borderRadius: 10, background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', fontSize: 13, fontWeight: 500, color: 'var(--zinc-600)' }}>Cancel</button>
          <button onClick={startRec} disabled={!ready} style={{ flex: 1, padding: '10px', borderRadius: 10, background: ready ? '#EF4444' : 'var(--zinc-200)', border: 'none', fontSize: 13, fontWeight: 600, color: ready ? 'white' : 'var(--zinc-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Video size={16} />
            Record
          </button>
        </div>
      )}

      {state === 'rec' && (
        <button onClick={stopRec} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'var(--zinc-900)', border: 'none', fontSize: 13, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Stop Recording
        </button>
      )}

      {state === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            value={captionVideo}
            onChange={e => setCaptionVideo(e.target.value)}
            placeholder="Add context or caption (optional)…"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
              border: '1px solid var(--zinc-200)', background: 'var(--zinc-50)',
              color: 'var(--zinc-900)', fontFamily: 'inherit', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setBlob(null); setState('idle'); setReady(false); setErr(false); setCaptionVideo('') }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', fontSize: 13, fontWeight: 500, color: 'var(--zinc-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <RotateCcw size={13} /> Redo
            </button>
            <button onClick={() => blob && onSave(blob, dur, captionVideo.trim())} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-900)', border: 'none', fontSize: 13, fontWeight: 500, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={13} /> Save Video
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Upload ── */
function UploadPanel({ onSave, onCancel }: { onSave: (urls: string[], caption: string) => void; onCancel: () => void }) {
  const [previews, setPreviews] = useState<string[]>([])
  const [captionUpload, setCaptionUpload] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | File[]) => {
    const newPreviews: string[] = []
    let loaded = 0
    const targetCount = Array.from(files).filter(f => f.type.startsWith('image/')).length
    if (targetCount === 0) return

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = e => {
        if (e.target?.result) newPreviews.push(e.target.result as string)
        loaded++
        if (loaded === targetCount) {
          setPreviews(prev => [...prev, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {previews.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files) }}
          style={{ padding: '40px 20px', borderRadius: 16, border: `2px dashed ${dragging ? 'var(--zinc-500)' : 'var(--zinc-300)'}`, background: dragging ? 'var(--zinc-100)' : 'var(--zinc-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.14s' }}
        >
          <ImageIcon size={32} style={{ color: 'var(--zinc-400)' }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--zinc-700)' }}>Drop images</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--zinc-400)' }}>or click to browse</p>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => e.target.files?.length && handleFiles(e.target.files)} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, borderRadius: 12, overflow: 'hidden' }}>
            {previews.map((p, i) => (
              <img key={i} src={p} alt="preview" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block', borderRadius: 8, border: '1px solid var(--zinc-200)' }} />
            ))}
            <div
              onClick={() => fileRef.current?.click()}
              style={{ width: '100%', height: 100, border: '2px dashed var(--zinc-300)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--zinc-50)' }}
            >
              <ImageIcon size={20} color="var(--zinc-400)" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => e.target.files?.length && handleFiles(e.target.files)} />
          </div>
          <input
            type="text"
            value={captionUpload}
            onChange={e => setCaptionUpload(e.target.value)}
            placeholder="Add context or caption (optional)…"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
              border: '1px solid var(--zinc-200)', background: 'var(--zinc-50)',
              color: 'var(--zinc-900)', fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { if (previews.length === 0) onCancel(); else setPreviews([]) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', fontSize: 13, fontWeight: 500, color: 'var(--zinc-600)' }}>
          {previews.length > 0 ? 'Clear' : 'Cancel'}
        </button>
        <button onClick={() => previews.length > 0 && onSave(previews, captionUpload.trim())} disabled={previews.length === 0} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-900)', border: 'none', fontSize: 13, fontWeight: 500, color: 'white', opacity: previews.length > 0 ? 1 : 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Check size={13} /> Add {previews.length} Image{previews.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}

/* ── Draw ── */
function DrawPanel({ onSave, onCancel }: { onSave: (url: string, caption: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [size, setSize] = useState(4)
  const [color, setColor] = useState('#18181B')
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const last = useRef<{ x: number; y: number } | null>(null)
  const [drawCaption, setDrawCaption] = useState('')

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

  const colors = ['#18181B', '#71717A', '#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899']
  const sizes = [2, 4, 8, 16]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', flexWrap: 'wrap' }}>
        {[{ t: 'pen', icon: Pen }, { t: 'eraser', icon: Eraser }].map(({ t, icon: Icon }) => (
          <button key={t} onClick={() => setTool(t as 'pen' | 'eraser')} style={{ width: 32, height: 32, borderRadius: 8, background: tool === t ? 'white' : 'transparent', border: tool === t ? '1px solid var(--zinc-300)' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: tool === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', color: 'var(--zinc-700)' }}>
            <Icon size={16} />
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--zinc-300)' }} />
        {sizes.map(s => (
          <button key={s} onClick={() => setSize(s)} style={{ width: 30, height: 30, borderRadius: 7, background: size === s ? 'white' : 'transparent', border: size === s ? '1px solid var(--zinc-300)' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: size === s ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            <div style={{ width: s / 1.4 + 2, height: s / 1.4 + 2, borderRadius: '50%', background: 'var(--zinc-700)' }} />
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--zinc-300)' }} />
        {colors.map(c => (
          <button key={c} onClick={() => { setColor(c); setTool('pen') }} style={{ width: 18, height: 18, borderRadius: '50%', background: c, outline: color === c && tool === 'pen' ? `2.5px solid ${c}` : 'none', outlineOffset: 2, border: 'none', transition: 'transform 0.1s' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'} />
        ))}
        <button onClick={clear} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 7, fontSize: 12, color: 'var(--zinc-500)', background: 'none', border: 'none' }}>
          <RotateCcw size={14} />
        </button>
      </div>

      <canvas ref={ref} className="draw-canvas" style={{ width: '100%', aspectRatio: '800/440', borderRadius: 12, border: '1px solid var(--zinc-200)', background: 'white' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} />

      <input
        type="text"
        value={drawCaption}
        onChange={e => setDrawCaption(e.target.value)}
        placeholder="Add context or caption (optional)…"
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
          border: '1px solid var(--zinc-200)', background: 'var(--zinc-50)',
          color: 'var(--zinc-900)', fontFamily: 'inherit', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-100)', border: '1px solid var(--zinc-200)', fontSize: 13, fontWeight: 500, color: 'var(--zinc-600)' }}>Cancel</button>
        <button onClick={() => ref.current && onSave(ref.current.toDataURL(), drawCaption.trim())} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--zinc-900)', border: 'none', fontSize: 13, fontWeight: 500, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Check size={13} /> Save Sketch
        </button>
      </div>
    </div>
  )
}

/* ── Tool definitions ── */
const TOOLS: { id: Tool; icon: any; label: string }[] = [
  { id: 'write',  icon: Type,      label: 'Write'  },
  { id: 'voice',  icon: Mic,       label: 'Voice'  },
  { id: 'photo',  icon: Camera,    label: 'Camera' },
  { id: 'video',  icon: Video,     label: 'Video'  },
  { id: 'draw',   icon: Pen,       label: 'Sketch' },
  { id: 'upload', icon: ImageIcon, label: 'Upload' },
]

const TITLES: Record<Tool, string> = {
  write: 'New Thought', voice: 'Voice Memo', photo: 'Camera', upload: 'Add Image', draw: 'Sketch', video: 'Record Video',
}

export default function CaptureModal({ onAdd, onClose }: Props) {
  const [tool, setTool] = useState<Tool | null>(null)
  const [text, setText] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (tool) setTool(null); else onClose() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, tool])

  useEffect(() => {
    if (tool === 'write') setTimeout(() => textRef.current?.focus(), 60)
  }, [tool])

  const submitText = () => {
    if (!text.trim()) return
    onAdd({ type: 'text', content: text.trim() })
    onClose()
  }

  const ActiveIcon = tool ? TOOLS.find(t => t.id === tool)?.icon : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      
      <div style={{
        position: 'relative', width: 440,
        background: '#ffffff', borderRadius: 24, border: '1px solid var(--zinc-200)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', animation: 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: tool ? '1px solid var(--zinc-100)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {tool && (
              <button onClick={() => setTool(null)} style={{ background: 'var(--zinc-100)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--zinc-500)', transition: 'background 0.15s ease' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--zinc-200)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--zinc-100)'}>
                <X size={14} style={{ transform: 'rotate(-45deg)' }} /> {/* Back indicator */}
              </button>
            )}
            {!tool && ActiveIcon && <ActiveIcon size={24} color="var(--zinc-700)" />}
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--zinc-900)', letterSpacing: '-0.02em' }}>
              {tool ? TITLES[tool] : 'New Capture'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--zinc-100)', border: 'none', color: 'var(--zinc-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--zinc-200)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--zinc-100)'}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px', maxHeight: '75vh', overflowY: 'auto' }} className="no-scroll">
          {!tool && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {TOOLS.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.id} className="scale-on-press" onClick={() => setTool(t.id)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 10px',
                    background: 'var(--zinc-50)', border: '1px solid var(--zinc-200)', borderRadius: 16,
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--zinc-100)'; e.currentTarget.style.borderColor = 'var(--zinc-300)' }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--zinc-50)'; e.currentTarget.style.borderColor = 'var(--zinc-200)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <Icon size={20} color="var(--zinc-600)" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--zinc-700)' }}>{t.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {tool === 'write' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <textarea
                ref={textRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText() } }}
                placeholder="What's on your mind…"
                rows={5}
                style={{
                  width: '100%', fontSize: 15.5, lineHeight: 1.7,
                  color: 'var(--zinc-900)', resize: 'none',
                  letterSpacing: '-0.01em', padding: '4px 0',
                  borderBottom: '1px solid var(--zinc-200)',
                  fontFamily: 'inherit', fontWeight: 400,
                }}
                className="no-scroll"
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--zinc-400)', letterSpacing: '-0.005em' }}>
                  {text.trim() ? `${text.trim().split(/\s+/).length} word${text.trim().split(/\s+/).length !== 1 ? 's' : ''}` : 'Shift+Enter for new line'}
                </span>
                <button
                  onClick={submitText}
                  disabled={!text.trim()}
                  className="btn btn-primary btn-icon"
                  style={{ borderRadius: '50%', width: 36, height: 36 }}
                >
                  <ArrowUp size={15} />
                </button>
              </div>
            </div>
          )}

          {tool === 'voice' && (
            <VoicePanel
              onSave={async (blob, transcriptOrDur, caption) => {
                const url = await blobToBase64(blob)
                const hasTranscript = transcriptOrDur && transcriptOrDur.length > 3 && !transcriptOrDur.match(/^\d+:\d+$/)
                onAdd({
                  type: 'voice',
                  content: caption || (hasTranscript ? transcriptOrDur : 'Voice memo'),
                  voiceUrl: url,
                  voiceDuration: hasTranscript ? undefined : transcriptOrDur,
                })
                onClose()
              }}
              onCancel={() => setTool(null)}
            />
          )}

          {tool === 'photo' && (
            <CameraPanel
              onSave={(url, caption) => { onAdd({ type: 'photo', content: caption, mediaUrl: url }); onClose() }}
              onCancel={() => setTool(null)}
            />
          )}

          {tool === 'draw' && <DrawPanel onSave={(u, c) => { onAdd({ type: 'draw', content: c, mediaUrl: u }); onClose() }} onCancel={() => setTool(null)} />}
          {tool === 'upload' && <UploadPanel onSave={(urls, c) => {
            if (urls.length === 1) onAdd({ type: 'photo', mediaUrl: urls[0], content: c })
            else onAdd({ type: 'photo', mediaUrls: urls, content: c })
            onClose()
          }} onCancel={() => setTool(null)} />}

          {tool === 'video' && (
            <VideoPanel
              onSave={async (blob, dur, caption) => { const url = await blobToBase64(blob); onAdd({ type: 'video', content: caption || 'Video clip', mediaUrl: url, voiceDuration: dur }); onClose() }}
              onCancel={() => setTool(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
