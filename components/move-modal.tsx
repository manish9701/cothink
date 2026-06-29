'use client'

import { useState } from 'react'
import { X, Folder as FolderIcon, Layout as CanvasIcon, MessageSquare, Image as ImageIcon, Video, Mic, Pen, ArrowRight } from 'lucide-react'
import type { Folder, Canvas } from './app-shell'
import type { Thought } from '@/lib/thought-types'

interface Props {
  thought?: Thought
  folders: Folder[]
  canvases: Canvas[]
  onClose: () => void
  onSelect: (type: 'folder' | 'canvas' | 'thread', id?: string) => void
}

function ThoughtPreview({ thought }: { thought: Thought }) {
  if (thought.type === 'text' || thought.type === 'ai') {
    return (
      <div style={{
        padding: 24, background: 'var(--zinc-50)', borderRadius: 16, height: '100%',
        border: '1px solid var(--zinc-100)', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--zinc-400)' }}>
          {thought.type === 'ai' ? <MessageSquare size={16} /> : <Pen size={16} />}
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {thought.type === 'ai' ? 'AI Agent' : 'Text Note'}
          </span>
        </div>
        <p style={{
          fontSize: 15, lineHeight: 1.6, color: thought.type === 'ai' ? '#6d28d9' : 'var(--zinc-800)',
          margin: 0, fontStyle: thought.type === 'ai' ? 'italic' : 'normal',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1, overflowY: 'auto'
        }} className="no-scroll">
          {thought.content}
        </p>
      </div>
    )
  }

  if (thought.type === 'photo') {
    return (
      <div style={{
        padding: 24, background: 'var(--zinc-50)', borderRadius: 16, height: '100%',
        border: '1px solid var(--zinc-100)', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--zinc-400)' }}>
          <ImageIcon size={16} />
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Photo</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {(thought.mediaUrls && thought.mediaUrls.length > 0) ? (
            <div style={{ display: 'grid', gap: 4, gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
              {thought.mediaUrls.map((url, i) => (
                <img key={i} src={url} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
              ))}
            </div>
          ) : thought.mediaUrl ? (
            <img src={thought.mediaUrl} alt="photo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }} />
          ) : null}
        </div>
      </div>
    )
  }

  if (thought.type === 'draw') {
    return (
      <div style={{
        padding: 24, background: 'var(--zinc-50)', borderRadius: 16, height: '100%',
        border: '1px solid var(--zinc-100)', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--zinc-400)' }}>
          <Pen size={16} />
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sketch</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {thought.mediaUrl && <img src={thought.mediaUrl} alt="sketch" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
        </div>
      </div>
    )
  }

  if (thought.type === 'voice') {
    return (
      <div style={{
        padding: 24, background: 'var(--zinc-50)', borderRadius: 16, height: '100%',
        border: '1px solid var(--zinc-100)', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--zinc-400)' }}>
          <Mic size={16} />
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voice Memo</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--zinc-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--zinc-500)' }}>
            <Mic size={24} />
          </div>
          {thought.voiceDuration && <span style={{ fontSize: 14, fontFamily: 'DM Mono, monospace', color: 'var(--zinc-500)' }}>{thought.voiceDuration}</span>}
          {thought.content && <p style={{ fontSize: 14, color: 'var(--zinc-700)', textAlign: 'center' }}>{thought.content}</p>}
        </div>
      </div>
    )
  }

  return null
}

export default function MoveModal({ thought, folders, canvases, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('')

  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
  const filteredCanvases = canvases.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      
      <div style={{
        position: 'relative', width: 720, height: 480,
        background: '#ffffff', borderRadius: 24, border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.04)', display: 'flex',
        overflow: 'hidden', animation: 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'DM Sans, Inter, sans-serif'
      }}>
        
        {/* Left Pane: Preview */}
        <div style={{
          width: 320, minWidth: 0, flexShrink: 0, background: '#fafafa', borderRight: '1px solid rgba(0,0,0,0.04)',
          padding: '28px 24px', display: 'flex', flexDirection: 'column'
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--zinc-900)', margin: '0 0 20px 0', letterSpacing: '-0.02em' }}>Move Item</h2>
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {thought ? <ThoughtPreview thought={thought} /> : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--zinc-400)' }}>
                Item not found
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Destinations */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
          <div style={{ padding: '28px 24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ position: 'relative', flex: 1, marginRight: 16 }}>
              <input
                type="text"
                placeholder="Search destinations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--zinc-200)',
                  background: 'var(--zinc-50)', fontSize: 14, outline: 'none', color: 'var(--zinc-800)',
                  transition: 'border-color 0.15s ease', fontFamily: 'inherit'
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--zinc-300)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--zinc-200)'}
              />
            </div>
            <button onClick={onClose} style={{ background: 'var(--zinc-100)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--zinc-500)', transition: 'background 0.15s ease', flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.background = 'var(--zinc-200)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--zinc-100)'}>
              <X size={14} />
            </button>
          </div>

          <div style={{ padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flex: 1 }} className="no-scroll">
            <button
              onClick={() => onSelect('thread')}
              className="scale-on-press"
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderRadius: 12, border: '1px solid transparent', background: 'transparent',
                cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left',
                justifyContent: 'space-between'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--zinc-50)'; e.currentTarget.style.borderColor = 'var(--zinc-200)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--zinc-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={16} color="var(--zinc-500)" />
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--zinc-900)', display: 'block' }}>All Captures</span>
                  <span style={{ fontSize: 12, color: 'var(--zinc-500)' }}>Move to root thread</span>
                </div>
              </div>
              <ArrowRight size={16} color="var(--zinc-400)" />
            </button>

            {filteredFolders.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--zinc-400)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px 16px' }}>Folders</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredFolders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => onSelect('folder', f.id)}
                      className="scale-on-press"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderRadius: 12, border: '1px solid transparent', background: 'transparent',
                        cursor: 'pointer', transition: 'all 0.15s ease', width: '100%', textAlign: 'left',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--zinc-50)'; e.currentTarget.style.borderColor = 'var(--zinc-200)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--zinc-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FolderIcon size={16} color="var(--zinc-500)" />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--zinc-900)' }}>{f.name}</span>
                      </div>
                      <ArrowRight size={16} color="var(--zinc-400)" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredCanvases.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--zinc-400)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px 16px' }}>Canvases</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredCanvases.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onSelect('canvas', c.id)}
                      className="scale-on-press"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderRadius: 12, border: '1px solid transparent', background: 'transparent',
                        cursor: 'pointer', transition: 'all 0.15s ease', width: '100%', textAlign: 'left',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--zinc-50)'; e.currentTarget.style.borderColor = 'var(--zinc-200)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--zinc-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CanvasIcon size={16} color="var(--zinc-500)" />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--zinc-900)' }}>{c.name}</span>
                      </div>
                      <ArrowRight size={16} color="var(--zinc-400)" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
