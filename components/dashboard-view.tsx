'use client'

import { useState, useRef, useEffect } from 'react'
import { Folder as FolderIcon, Layout as CanvasIcon, MessageSquare, Plus, Sparkles, User, Trash2, ArrowRight, Mic, ArrowUp } from 'lucide-react'
import type { Folder, Canvas, ViewState } from './app-shell'
import type { Thought } from '@/lib/thought-types'
import { ThoughtRow } from './thread-view'

interface Props {
  thoughts: Thought[]
  folders: Folder[]
  canvases: Canvas[]
  onSetView: (v: ViewState) => void
  onPin: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (t: Omit<Thought, 'id' | 'createdAt'>) => void
  onUpdate: (id: string, updates: Partial<Thought>) => void
  onCreateFolder: (name: string) => void
  onCreateCanvas: (name: string) => void
  onDeleteFolder: (id: string) => void
  onDeleteCanvas: (id: string) => void
  onOpenCapture: () => void
  onOpenAI: () => void
  onMove: (id: string) => void
}

function timeAgo(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  return `${Math.round(mins / 1440)}d`
}

function Section({
  icon: Icon,
  title,
  onOpen,
  onCreate,
  children,
}: {
  icon: any
  title: string
  onOpen: () => void
  onCreate: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      minWidth: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <Icon size={20} color="#64748b" />
        <span style={{
          fontSize: 16, fontWeight: 600,
          color: '#0f172a', letterSpacing: '-0.02em',
          flex: 1,
        }}>{title}</span>
        <button
          onClick={onCreate}
          style={{
            height: 30, padding: '0 12px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#fff',
            fontSize: 13, fontWeight: 500, color: '#475569',
            transition: 'all 0.12s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => { (e.currentTarget).style.background = '#e2e8f0' }}
          onMouseLeave={e => { (e.currentTarget).style.background = '#f1f5f9' }}
          title="Create"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={onOpen}
          style={{
            background: '#0f172a', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 12, fontWeight: 500,
            padding: '4px 8px', cursor: 'pointer', transition: 'background 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onMouseEnter={e => { (e.currentTarget).style.background = '#1e293b' }}
          onMouseLeave={e => { (e.currentTarget).style.background = '#0f172a' }}
          title="Open"
        >
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }} className="no-scroll">
        {children}
      </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 80,
      color: '#94a3b8', fontSize: 13,
      border: '1px dashed #e2e8f0', borderRadius: 12,
      background: '#f8fafc',
    }}>
      {label}
    </div>
  )
}

export default function DashboardView({
  thoughts, folders, canvases, onSetView, onPin, onDelete, onAdd, onUpdate, onMove,
  onCreateFolder, onCreateCanvas, onDeleteFolder, onDeleteCanvas,
  onOpenCapture, onOpenAI
}: Props) {
  const [newFolder, setNewFolder] = useState('')
  const [newCanvas, setNewCanvas] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [creatingCanvas, setCreatingCanvas] = useState(false)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const canvasInputRef = useRef<HTMLInputElement>(null)
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  
  const [greeting, setGreeting] = useState('Good Day')

  useEffect(() => {
    const hr = new Date().getHours()
    if (hr < 12) setGreeting('Good Morning')
    else if (hr < 18) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')
  }, [])

  const thread = [...thoughts]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20)

  const confirmDeleteFolder = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete folder "${name}"?`)) {
      onDeleteFolder(id)
    }
  }

  const confirmDeleteCanvas = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete canvas "${name}"?`)) {
      onDeleteCanvas(id)
    }
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '40px 40px',
      gap: 32,
      height: '100%',
      overflowY: 'auto',
      background: '#f8fafc',
    }} className="no-scroll">
      
      {/* Header with Greeting & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 700,
            color: '#0f172a', margin: 0, letterSpacing: '-0.03em',
          }}>
            {greeting}
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0', fontWeight: 400 }}>
            Here is your thinking workspace.
          </p>
        </div>
        
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#64748b', cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <User size={20} />
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{
        display: 'flex', gap: 24, flex: 1, minHeight: 0,
        alignItems: 'stretch',
      }}>
        
        {/* Left Column: Folders & Canvases */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Folders */}
          <Section
            icon={FolderIcon}
            title="Folders"
            onOpen={() => {
              if (folders.length > 0) onSetView({ type: 'folder', folderId: folders[0].id })
              else setCreatingFolder(true)
            }}
            onCreate={() => {
              setCreatingFolder(true)
              setTimeout(() => folderInputRef.current?.focus(), 60)
            }}
          >
            {creatingFolder && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 10,
                border: '1px solid #cbd5e1', background: '#fff', marginBottom: 6,
              }}>
                <FolderIcon size={16} color="#94a3b8" />
                <input
                  ref={folderInputRef}
                  value={newFolder}
                  onChange={e => setNewFolder(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newFolder.trim()) {
                      onCreateFolder(newFolder.trim())
                      setNewFolder('')
                      setCreatingFolder(false)
                    }
                    if (e.key === 'Escape') { setCreatingFolder(false); setNewFolder('') }
                  }}
                  onBlur={() => { if (!newFolder.trim()) { setCreatingFolder(false); setNewFolder('') } }}
                  placeholder="Folder name…"
                  style={{ flex: 1, fontSize: 14, color: '#0f172a', background: 'transparent', padding: 0, border: 'none', outline: 'none' }}
                  autoFocus
                />
              </div>
            )}

            {folders.length === 0 && !creatingFolder ? (
              <Empty label="No folders yet" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {folders.map(f => {
                  const count = thoughts.filter(t => t.folderId === f.id).length
                  return (
                    <div
                      key={f.id}
                      onClick={() => onSetView({ type: 'folder', folderId: f.id })}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault()
                        const tId = e.dataTransfer.getData('text/plain')
                        if (tId) onUpdate(tId, { folderId: f.id })
                      }}
                      className="dashboard-item"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 12,
                        background: '#f8fafc', border: '1px solid transparent',
                        cursor: 'pointer', transition: 'all 0.15s',
                        position: 'relative'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'transparent' }}
                    >
                      <FolderIcon size={18} color="#64748b" />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{f.name}</span>
                      
                      <button 
                        onClick={(e) => confirmDeleteFolder(e, f.id, f.name)}
                        className="delete-btn"
                        style={{
                          background: 'none', border: 'none', color: '#ef4444', padding: '4px', cursor: 'pointer',
                          opacity: 0, transition: 'opacity 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                        title="Delete Folder"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Canvases */}
          <Section
            icon={CanvasIcon}
            title="Canvases"
            onOpen={() => {
              if (canvases.length > 0) onSetView({ type: 'canvas', canvasId: canvases[0].id })
              else setCreatingCanvas(true)
            }}
            onCreate={() => {
              setCreatingCanvas(true)
              setTimeout(() => canvasInputRef.current?.focus(), 60)
            }}
          >
            {creatingCanvas && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 10,
                border: '1px solid #cbd5e1', background: '#fff', marginBottom: 6,
              }}>
                <CanvasIcon size={16} color="#94a3b8" />
                <input
                  ref={canvasInputRef}
                  value={newCanvas}
                  onChange={e => setNewCanvas(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newCanvas.trim()) {
                      onCreateCanvas(newCanvas.trim())
                      setNewCanvas('')
                      setCreatingCanvas(false)
                    }
                    if (e.key === 'Escape') { setCreatingCanvas(false); setNewCanvas('') }
                  }}
                  onBlur={() => { if (!newCanvas.trim()) { setCreatingCanvas(false); setNewCanvas('') } }}
                  placeholder="Canvas name…"
                  style={{ flex: 1, fontSize: 14, color: '#0f172a', background: 'transparent', padding: 0, border: 'none', outline: 'none' }}
                  autoFocus
                />
              </div>
            )}

            {canvases.length === 0 && !creatingCanvas ? (
              <Empty label="No canvases yet" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {canvases.map(c => {
                  const count = thoughts.filter(t => t.canvasId === c.id).length
                  return (
                    <div
                      key={c.id}
                      onClick={() => onSetView({ type: 'canvas', canvasId: c.id })}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault()
                        const tId = e.dataTransfer.getData('text/plain')
                        if (tId) onUpdate(tId, { canvasId: c.id, canvasX: 100, canvasY: 100 })
                      }}
                      className="dashboard-item"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 12,
                        background: '#f8fafc', border: '1px solid transparent',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'transparent' }}
                    >
                      <CanvasIcon size={18} color="#64748b" />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{c.name}</span>
                      
                      <button 
                        onClick={(e) => confirmDeleteCanvas(e, c.id, c.name)}
                        className="delete-btn"
                        style={{
                          background: 'none', border: 'none', color: '#ef4444', padding: '4px', cursor: 'pointer',
                          opacity: 0, transition: 'opacity 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                        title="Delete Canvas"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        </div>

        {/* Right Column: Thread & Toolbar */}
        <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Section
            icon={MessageSquare}
            title="Thread"
            onOpen={() => onSetView({ type: 'home' })}
            onCreate={() => onSetView({ type: 'home' })}
          >
            {thread.length === 0 ? (
              <Empty label="No thoughts yet" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {thread.map(t => (
                  <ThoughtRow key={t.id} thought={t} onPin={onPin} onDelete={onDelete} onMove={onMove} />
                ))}
              </div>
            )}
          </Section>
          
          {/* Redesigned Input Bar placed right under the thread */}
          <div style={{
            marginTop: 24,
            display: 'flex', gap: 12,
            alignItems: 'center'
          }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 999,
              padding: '4px 8px 4px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <button
                onClick={() => setIsRecording(!isRecording)}
                style={{
                  background: 'none', border: 'none', padding: 8, cursor: 'pointer',
                  color: isRecording ? '#ef4444' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Mic size={18} />
              </button>
              
              <input 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && inputText.trim()) {
                    onAdd({ type: 'text', content: inputText.trim() })
                    setInputText('')
                  }
                }}
                placeholder={isRecording ? 'Listening...' : 'Type a thought...'}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  padding: '8px 12px', fontSize: 14, color: '#0f172a'
                }}
              />

              {inputText.trim() && (
                <button
                  onClick={() => {
                    onAdd({ type: 'text', content: inputText.trim() })
                    setInputText('')
                  }}
                  style={{
                    background: '#3b82f6', border: 'none', borderRadius: '50%',
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', cursor: 'pointer', marginRight: 4, transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                  onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
                  title="Send"
                >
                  <ArrowUp size={16} />
                </button>
              )}
              
              <button
                onClick={onOpenCapture}
                style={{
                  background: '#0f172a', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', cursor: 'pointer'
                }}
                title="Add Media / Canvas Tool"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <button
              onClick={onOpenAI}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                height: 42, padding: '0 20px',
                borderRadius: 999,
                border: '1px solid #e2e8f0',
                background: '#fff', color: '#0f172a',
                fontSize: 14, fontWeight: 500,
                transition: 'all 0.12s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
              }}
              onMouseEnter={e => { (e.currentTarget).style.background = '#f8fafc'; (e.currentTarget).style.borderColor = '#cbd5e1' }}
              onMouseLeave={e => { (e.currentTarget).style.background = '#fff'; (e.currentTarget).style.borderColor = '#e2e8f0' }}
            >
              <Sparkles size={16} color="#8b5cf6" /> AI
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
