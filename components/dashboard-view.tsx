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
  onCreate?: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      borderRadius: 16,
      border: '1px solid var(--zinc-150)',
      overflow: 'hidden',
      minWidth: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--zinc-100)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <Icon size={18} color="var(--zinc-400)" />
        <span style={{
          fontSize: 14, fontWeight: 600,
          color: 'var(--zinc-800)', letterSpacing: '-0.018em',
          flex: 1,
        }}>{title}</span>
        {onCreate && (
          <button
            onClick={onCreate}
            className="section-action-btn scale-on-press"
            title="Create"
          >
            <Plus size={18} />
          </button>
        )}
        <button
          onClick={onOpen}
          className="section-action-btn scale-on-press"
          title="Open"
        >
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }} className="no-scroll">
        {children}
      </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 72,
      color: 'var(--zinc-400)', fontSize: 13, fontWeight: 400,
      border: '1px dashed var(--zinc-200)', borderRadius: 10,
      background: 'var(--zinc-50)',
      letterSpacing: '-0.005em',
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
  

  const thread = [...thoughts]
    .filter(t => !t.folderId && !t.canvasId && t.type !== 'ai')
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
      padding: '32px 40px',
      gap: 28,
      height: '100%',
      overflowY: 'auto',
      background: 'var(--page)',
    }} className="no-scroll">
      
      {/* Header with Greeting & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 28, fontWeight: 300, color: '#000000',
            letterSpacing: '-0.02em',
          }}>
            co<span style={{ color: '#000000' }}>*</span>think
          </span>
        </div>
        
        <div 
          className="icon-btn scale-on-press"
          style={{
            width: 36, height: 36, borderRadius: '50%',
          }}
        >
          <User size={18} />
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
              onSetView({ type: 'folders' })
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
                <FolderIcon size={18} color="#94a3b8" />
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
                    >
                      <FolderIcon size={20} color="#64748b" />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{f.name}</span>
                      
                      <button 
                        onClick={(e) => confirmDeleteFolder(e, f.id, f.name)}
                        className="delete-btn"
                        title="Delete Folder"
                      >
                        <Trash2 size={16} />
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
              onSetView({ type: 'canvases' })
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
                <CanvasIcon size={18} color="#94a3b8" />
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
                        if (tId) onUpdate(tId, { canvasId: c.id, x: 100, y: 100 })
                      }}
                      className="dashboard-item"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 12,
                        background: '#f8fafc', border: '1px solid transparent',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <CanvasIcon size={20} color="#64748b" />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{c.name}</span>
                      
                      <button 
                        onClick={(e) => confirmDeleteCanvas(e, c.id, c.name)}
                        className="delete-btn"
                        title="Delete Canvas"
                      >
                        <Trash2 size={16} />
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
            title="Captures"
            onOpen={() => onSetView({ type: 'home' })}
          >
            {thread.length === 0 ? (
              <Empty label="No thoughts yet" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {thread.map((t, idx) => (
                  <ThoughtRow key={t.id} thought={t} index={idx} onPin={onPin} onDelete={onDelete} onMove={onMove} />
                ))}
              </div>
            )}
          </Section>
          

        </div>

      </div>
    </div>
  )
}
