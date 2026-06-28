'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { LayoutList, FolderOpen, Frame, Plus, Sparkles, FolderPlus, ChevronRight, Hexagon } from 'lucide-react'
import { hydrateThought, serializeThought, type SerializedThought, type Thought } from '@/lib/thought-types'
import ThreadView from './thread-view'
import CanvasView from './canvas-view'
import FolderView from './folder-view'
import CaptureModal from './capture-modal'
import AIModal from './ai-modal'

const STORAGE_KEY = 'te.thoughts.v4'
const FOLDERS_KEY = 'te.folders.v2'
const CANVASES_KEY = 'te.canvases.v1'

export type Folder = { id: string; name: string; createdAt: string }
export type Canvas = { id: string; name: string; createdAt: string }
export type ViewState =
  | { type: 'home' }
  | { type: 'canvas'; canvasId: string }
  | { type: 'folder'; folderId: string }

function deserialize(raw: string | null): Thought[] | null {
  if (!raw) return null
  try { return (JSON.parse(raw) as SerializedThought[]).map(hydrateThought) } catch { return null }
}

async function loadRemote() {
  try {
    const res = await fetch('/api/thoughts', { cache: 'no-store' })
    if (!res.ok) return null
    const d = await res.json() as { 
      configured?: boolean; 
      thoughts?: SerializedThought[]; 
      folders?: Folder[];
      canvases?: Canvas[];
    }
    if (!d.configured) return null
    return {
      thoughts: d.thoughts ? d.thoughts.map(hydrateThought) : null,
      folders: d.folders || null,
      canvases: d.canvases || null,
    }
  } catch { return null }
}

async function saveRemote(thoughts: Thought[], folders: Folder[], canvases: Canvas[]) {
  try { 
    await fetch('/api/thoughts', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        thoughts: thoughts.map(serializeThought),
        folders,
        canvases,
      }) 
    }) 
  } catch {}
}

const SEED: Thought[] = [
  { id: '1', type: 'text', content: 'The best ideas arrive when the room gets quieter than the urge to respond.', createdAt: new Date(Date.now() - 1000 * 60 * 44), pinned: true },
  { id: '2', type: 'ai', content: 'You are circling a pattern, not a single answer. The system should help you see structure.', createdAt: new Date(Date.now() - 1000 * 60 * 38) },
  { id: '3', type: 'voice', content: 'Voice memo', createdAt: new Date(Date.now() - 1000 * 60 * 28), voiceDuration: '0:22' },
  { id: '5', type: 'text', content: 'Complexity is often a sign that the model is wrong, not that the idea is hard.', createdAt: new Date(Date.now() - 1000 * 60 * 11) },
]

export default function AppShell() {
  const [thoughts, setThoughts] = useState<Thought[]>(SEED)
  const [folders, setFolders] = useState<Folder[]>([])
  const [canvases, setCanvases] = useState<Canvas[]>([])
  const [view, setView] = useState<ViewState>({ type: 'home' })
  const [showCapture, setShowCapture] = useState(false)
  const [showAI, setShowAI] = useState(false)
  
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [newCanvasName, setNewCanvasName] = useState('')
  const [creatingCanvas, setCreatingCanvas] = useState(false)
  const canvasInputRef = useRef<HTMLInputElement>(null)

  const hydrated = useRef(false)

  useEffect(() => {
    const localThoughts = deserialize(localStorage.getItem(STORAGE_KEY))
    if (localThoughts?.length) setThoughts(localThoughts)
    const fRaw = localStorage.getItem(FOLDERS_KEY)
    if (fRaw) try { setFolders(JSON.parse(fRaw)) } catch {}
    const cRaw = localStorage.getItem(CANVASES_KEY)
    if (cRaw) try { setCanvases(JSON.parse(cRaw)) } catch {}
    
    loadRemote().then(r => { 
      if (r) {
        if (r.thoughts?.length) setThoughts(r.thoughts)
        if (r.folders?.length) setFolders(r.folders)
        if (r.canvases?.length) setCanvases(r.canvases)
      }
    }).finally(() => { hydrated.current = true })
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thoughts.map(serializeThought)))
    if (hydrated.current) saveRemote(thoughts, folders, canvases)
  }, [thoughts])

  useEffect(() => {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
    if (hydrated.current) saveRemote(thoughts, folders, canvases)
  }, [folders])

  useEffect(() => {
    localStorage.setItem(CANVASES_KEY, JSON.stringify(canvases))
    if (hydrated.current) saveRemote(thoughts, folders, canvases)
  }, [canvases])

  useEffect(() => {
    if (creatingFolder) setTimeout(() => folderInputRef.current?.focus(), 60)
  }, [creatingFolder])

  useEffect(() => {
    if (creatingCanvas) setTimeout(() => canvasInputRef.current?.focus(), 60)
  }, [creatingCanvas])

  const add = (partial: Omit<Thought, 'id' | 'createdAt'>) => {
    const newThought: Thought = { 
      ...partial, 
      id: crypto.randomUUID(), 
      createdAt: new Date() 
    }
    
    // Auto-associate with current folder or canvas if inside one
    if (view.type === 'folder') {
      newThought.folderId = view.folderId
    } else if (view.type === 'canvas') {
      newThought.canvasId = view.canvasId
    }

    setThoughts(prev => [newThought, ...prev])
  }

  const update = (id: string, updates: Partial<Thought>) => {
    setThoughts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const pin = (id: string) => setThoughts(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t))
  const del = (id: string) => setThoughts(prev => prev.filter(t => t.id !== id))

  const createFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    const folder: Folder = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
    setFolders(prev => [...prev, folder])
    setNewFolderName('')
    setCreatingFolder(false)
    setView({ type: 'folder', folderId: folder.id })
  }

  const createCanvas = () => {
    const name = newCanvasName.trim()
    if (!name) return
    const canvas: Canvas = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
    setCanvases(prev => [...prev, canvas])
    setNewCanvasName('')
    setCreatingCanvas(false)
    setView({ type: 'canvas', canvasId: canvas.id })
  }

  const folderThoughts = useMemo(() => {
    if (view.type !== 'folder') return []
    return thoughts.filter(t => t.folderId === view.folderId)
  }, [thoughts, view])

  const canvasThoughts = useMemo(() => {
    if (view.type !== 'canvas') return []
    return thoughts.filter(t => t.canvasId === view.canvasId)
  }, [thoughts, view])

  const activeFolder = view.type === 'folder' ? folders.find(f => f.id === view.folderId) : null
  const activeCanvas = view.type === 'canvas' ? canvases.find(c => c.id === view.canvasId) : null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--page)' }}>

      {/* ── Sidebar ── */}
      <aside className="sidebar" style={{ flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--zinc-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Hexagon size={14} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Thinking Engine</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }} className="no-scroll">
          <button className={`nav-item ${view.type === 'home' ? 'active' : ''}`} onClick={() => setView({ type: 'home' })}>
            <LayoutList size={15} strokeWidth={1.8} />
            <span>All Thoughts</span>
            <span className="badge">{thoughts.length}</span>
          </button>

          {/* Canvases section */}
          <div style={{ margin: '14px 0 4px', padding: '0 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)' }}>Canvases</span>
            <button onClick={() => setCreatingCanvas(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: 'none', border: 'none', color: 'var(--ink-4)', transition: 'all 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--zinc-100)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <Plus size={12} />
            </button>
          </div>

          {creatingCanvas && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', marginBottom: 2 }}>
              <Frame size={13} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
              <input
                ref={canvasInputRef}
                value={newCanvasName}
                onChange={e => setNewCanvasName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createCanvas(); if (e.key === 'Escape') { setCreatingCanvas(false); setNewCanvasName('') } }}
                onBlur={() => { if (!newCanvasName.trim()) { setCreatingCanvas(false); setNewCanvasName('') } }}
                placeholder="Canvas name…"
                style={{ flex: 1, fontSize: 13, color: 'var(--ink)', padding: '3px 0', borderBottom: '1px solid var(--zinc-300)' }}
              />
            </div>
          )}

          {canvases.map(c => (
            <button key={c.id} className={`nav-item ${view.type === 'canvas' && view.canvasId === c.id ? 'active' : ''}`} onClick={() => setView({ type: 'canvas', canvasId: c.id })}>
              <Frame size={15} strokeWidth={1.8} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span className="badge">{thoughts.filter(t => t.canvasId === c.id).length || ''}</span>
            </button>
          ))}

          {canvases.length === 0 && !creatingCanvas && (
            <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-4)' }}>No canvases yet</div>
          )}

          {/* Folders section */}
          <div style={{ margin: '14px 0 4px', padding: '0 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)' }}>Folders</span>
            <button onClick={() => setCreatingFolder(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: 'none', border: 'none', color: 'var(--ink-4)', transition: 'all 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--zinc-100)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <Plus size={12} />
            </button>
          </div>

          {creatingFolder && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', marginBottom: 2 }}>
              <FolderOpen size={13} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
              <input
                ref={folderInputRef}
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') } }}
                onBlur={() => { if (!newFolderName.trim()) { setCreatingFolder(false); setNewFolderName('') } }}
                placeholder="Folder name…"
                style={{ flex: 1, fontSize: 13, color: 'var(--ink)', padding: '3px 0', borderBottom: '1px solid var(--zinc-300)' }}
              />
            </div>
          )}

          {folders.map(f => (
            <button key={f.id} className={`nav-item ${view.type === 'folder' && view.folderId === f.id ? 'active' : ''}`} onClick={() => setView({ type: 'folder', folderId: f.id })}>
              <FolderOpen size={15} strokeWidth={1.8} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span className="badge">{thoughts.filter(t => t.folderId === f.id).length || ''}</span>
            </button>
          ))}

          {folders.length === 0 && !creatingFolder && (
            <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-4)' }}>No folders yet</div>
          )}
        </nav>

        {/* Bottom hint */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--zinc-100)' }}>
          <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: 0 }}>{thoughts.length} thoughts</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {view.type === 'home' && (
          <ThreadView thoughts={thoughts} onPin={pin} onDelete={del} />
        )}
        {view.type === 'canvas' && activeCanvas && (
          <CanvasView thoughts={canvasThoughts} onPin={pin} onDelete={del} onUpdate={update} />
        )}
        {view.type === 'folder' && activeFolder && (
          <FolderView folder={activeFolder} thoughts={folderThoughts} onPin={pin} onDelete={del} />
        )}

        {/* ── Bottom dock: 2 buttons ── */}
        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 40 }}>
          <div className="dock-bar" style={{ pointerEvents: 'auto' }}>
            <button className="dock-btn dock-btn-add" onClick={() => setShowCapture(true)}>
              <Plus size={15} strokeWidth={2.5} />
              Add
            </button>
            <button className="dock-btn dock-btn-ai" onClick={() => setShowAI(true)}>
              <Sparkles size={14} strokeWidth={1.8} />
              AI
            </button>
          </div>
        </div>
      </main>

      {/* ── Modals ── */}
      {showCapture && (
        <CaptureModal
          onAdd={add}
          onClose={() => setShowCapture(false)}
        />
      )}
      {showAI && (
        <AIModal thoughts={thoughts} onAdd={add} onClose={() => setShowAI(false)} />
      )}
    </div>
  )
}
