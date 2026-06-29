'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Sparkles, Folder as FolderIcon, Layout as CanvasIcon, ChevronLeft } from 'lucide-react'
import { hydrateThought, serializeThought, type SerializedThought, type Thought } from '@/lib/thought-types'
import ThreadView from './thread-view'
import CanvasView from './canvas-view'
import FolderView from './folder-view'
import DashboardView from './dashboard-view'
import CaptureModal from './capture-modal'
import AISidebar from './ai-sidebar'
import SettingsModal from './settings-modal'
import MoveModal from './move-modal'
import { initShortcuts } from '@/lib/shortcuts-manager'
import { Settings } from 'lucide-react'

const STORAGE_KEY = 'te.thoughts.v4'
const FOLDERS_KEY = 'te.folders.v2'
const CANVASES_KEY = 'te.canvases.v1'

export type Folder = { id: string; name: string; createdAt: string }
export type Canvas = { id: string; name: string; createdAt: string }
export type ViewState =
  | { type: 'dashboard' }
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
      configured?: boolean
      thoughts?: SerializedThought[]
      folders?: Folder[]
      canvases?: Canvas[]
    }
    if (!d.configured) return null
    return {
      thoughts: d.thoughts ? d.thoughts.map(hydrateThought) : null,
      folders: d.folders || null,
      canvases: d.canvases || null,
    }
  } catch { return null }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null
let _pendingSave: { thoughts: Thought[]; folders: Folder[]; canvases: Canvas[] } | null = null

function saveRemote(thoughts: Thought[], folders: Folder[], canvases: Canvas[]) {
  _pendingSave = { thoughts, folders, canvases }
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(async () => {
    const data = _pendingSave
    _pendingSave = null
    _saveTimer = null
    if (!data) return
    try {
      await fetch('/api/thoughts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thoughts: data.thoughts.map(serializeThought),
          folders: data.folders,
          canvases: data.canvases,
        }),
      })
    } catch {}
  }, 800) // 800ms debounce — coalesces rapid consecutive state updates
}

const SEED: Thought[] = [
  { id: '1', type: 'text', content: 'Explore the concept of "Agentic Workflows" for the new framework.', createdAt: new Date(Date.now() - 1000 * 60 * 44), folderId: 'f1', pinned: true },
  { id: '2', type: 'ai', content: 'Agentic workflows involve defining high-level goals and letting the AI dynamically plan and execute steps.', createdAt: new Date(Date.now() - 1000 * 60 * 38), folderId: 'f1' },
  { id: '3', type: 'text', content: 'Need to review the new WebRTC implementation for live audio streaming: https://webrtc.org', createdAt: new Date(Date.now() - 1000 * 60 * 28) },
  { id: '4', type: 'voice', content: 'Design ideas for the new dashboard...', createdAt: new Date(Date.now() - 1000 * 60 * 15), voiceDuration: '1:12', canvasId: 'c1', canvasX: 200, canvasY: 150 },
  { id: '5', type: 'text', content: 'Complexity is often a sign that the model is wrong, not that the idea is hard.', createdAt: new Date(Date.now() - 1000 * 60 * 11) },
]

const SEED_FOLDERS: Folder[] = [
  { id: 'f1', name: 'Cothink ideas', createdAt: new Date().toISOString() },
  { id: 'f2', name: 'Engineering Specs', createdAt: new Date().toISOString() },
]

const SEED_CANVASES: Canvas[] = [
  { id: 'c1', name: 'Architecture Diagram', createdAt: new Date().toISOString() },
  { id: 'c2', name: 'UI/UX Moodboard', createdAt: new Date().toISOString() },
]

/* ── Compact sidebar for detail views ── */
function Sidebar({
  view,
  thoughts,
  folders,
  canvases,
  onSetView,
  onCreateFolder,
  onCreateCanvas,
  onOpenSettings,
}: {
  view: ViewState
  thoughts: Thought[]
  folders: Folder[]
  canvases: Canvas[]
  onSetView: (v: ViewState) => void
  onCreateFolder: (name: string) => void
  onCreateCanvas: (name: string) => void
  onOpenSettings: () => void
}) {
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [creatingCanvas, setCreatingCanvas] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [canvasName, setCanvasName] = useState('')
  const folderRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (creatingFolder) setTimeout(() => folderRef.current?.focus(), 50) }, [creatingFolder])
  useEffect(() => { if (creatingCanvas) setTimeout(() => canvasRef.current?.focus(), 50) }, [creatingCanvas])

  const navItem = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 8, width: '100%',
        border: 'none', background: active ? '#f1f5f9' : 'none',
        fontSize: 13, fontWeight: active ? 500 : 400,
        color: active ? '#0f172a' : '#64748b',
        textAlign: 'left', cursor: 'pointer', transition: 'all 0.1s',
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget).style.background = '#f8fafc' }}
      onMouseLeave={e => { if (!active) (e.currentTarget).style.background = 'none' }}
    >
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  )

  return (
    <aside style={{
      width: 210,
      background: '#fff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo / back to dashboard */}
      <div
        onClick={() => onSetView({ type: 'dashboard' })}
        style={{
          padding: '16px 14px 10px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer',
        }}
      >
        <ChevronLeft size={14} style={{ color: '#94a3b8' }} />
        <span style={{
          fontSize: 14, fontWeight: 700, color: '#0f172a',
          letterSpacing: '-0.03em',
        }}>
          co<span style={{ color: '#94a3b8' }}>*</span>think
        </span>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }} className="no-scroll">
        {/* All Thoughts */}
        {navItem('All Thoughts', view.type === 'home', () => onSetView({ type: 'home' }))}

        {/* Canvases */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          margin: '12px 4px 4px', padding: '0 4px',
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
            Canvases
          </span>
          <button
            onClick={() => setCreatingCanvas(true)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
          >+</button>
        </div>

        {creatingCanvas && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', marginBottom: 2 }}>
            <CanvasIcon size={14} color="#94a3b8" />
            <input
              ref={canvasRef}
              value={canvasName}
              onChange={e => setCanvasName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && canvasName.trim()) { onCreateCanvas(canvasName.trim()); setCanvasName(''); setCreatingCanvas(false) }
                if (e.key === 'Escape') { setCreatingCanvas(false); setCanvasName('') }
              }}
              onBlur={() => { if (!canvasName.trim()) { setCreatingCanvas(false); setCanvasName('') } }}
              placeholder="Canvas name…"
              style={{ flex: 1, fontSize: 12, color: '#0f172a', borderBottom: '1px solid #94a3b8', padding: '2px 0', background: 'transparent' }}
            />
          </div>
        )}

        {canvases.map(c => {
          const active = view.type === 'canvas' && view.canvasId === c.id
          return (
            <button key={c.id} onClick={() => onSetView({ type: 'canvas', canvasId: c.id })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, width: '100%', border: 'none', background: active ? '#f1f5f9' : 'none', fontSize: 13, fontWeight: active ? 500 : 400, color: active ? '#0f172a' : '#64748b', textAlign: 'left', cursor: 'pointer', transition: 'all 0.1s', letterSpacing: '-0.01em' }} onMouseEnter={e => { if (!active) (e.currentTarget).style.background = '#f8fafc' }} onMouseLeave={e => { if (!active) (e.currentTarget).style.background = 'none' }}>
              <span style={{ flex: 1 }}>{c.name}</span>
            </button>
          )
        })}

        {canvases.length === 0 && !creatingCanvas && (
          <p style={{ margin: '8px 10px', fontSize: 12, color: '#94a3b8' }}>No canvases yet</p>
        )}

        {/* Folders */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          margin: '12px 4px 4px', padding: '0 4px',
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
            Folders
          </span>
          <button
            onClick={() => setCreatingFolder(true)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
          >+</button>
        </div>

        {creatingFolder && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', marginBottom: 2 }}>
            <FolderIcon size={14} color="#94a3b8" />
            <input
              ref={folderRef}
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && folderName.trim()) { onCreateFolder(folderName.trim()); setFolderName(''); setCreatingFolder(false) }
                if (e.key === 'Escape') { setCreatingFolder(false); setFolderName('') }
              }}
              onBlur={() => { if (!folderName.trim()) { setCreatingFolder(false); setFolderName('') } }}
              placeholder="Folder name…"
              style={{ flex: 1, fontSize: 12, color: '#0f172a', borderBottom: '1px solid #94a3b8', padding: '2px 0', background: 'transparent' }}
            />
          </div>
        )}

        {folders.map(f => {
          const active = view.type === 'folder' && view.folderId === f.id
          return (
            <button key={f.id} onClick={() => onSetView({ type: 'folder', folderId: f.id })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, width: '100%', border: 'none', background: active ? '#f1f5f9' : 'none', fontSize: 13, fontWeight: active ? 500 : 400, color: active ? '#0f172a' : '#64748b', textAlign: 'left', cursor: 'pointer', transition: 'all 0.1s', letterSpacing: '-0.01em' }} onMouseEnter={e => { if (!active) (e.currentTarget).style.background = '#f8fafc' }} onMouseLeave={e => { if (!active) (e.currentTarget).style.background = 'none' }}>
              <span style={{ flex: 1 }}>{f.name}</span>
            </button>
          )
        })}

        {folders.length === 0 && !creatingFolder && (
          <div style={{ padding: '4px 10px', fontSize: 11, color: '#94a3b8' }}>No folders</div>
        )}
      </nav>

      <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onOpenSettings}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: 'none', background: 'transparent',
            fontSize: 13, fontWeight: 500, color: '#64748b',
            cursor: 'pointer', transition: 'all 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' }}
        >
          <Settings size={14} /> Settings
        </button>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 0 10px' }}>{thoughts.length} thoughts</p>
      </div>
    </aside>
  )
}

/* ── Main shell ── */
export default function AppShell() {
  const [thoughts, setThoughts] = useState<Thought[]>(SEED)
  const [folders, setFolders] = useState<Folder[]>(SEED_FOLDERS)
  const [canvases, setCanvases] = useState<Canvas[]>(SEED_CANVASES)
  const [view, setView] = useState<ViewState>({ type: 'dashboard' })
  const [showCapture, setShowCapture] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [movingThoughtId, setMovingThoughtId] = useState<string | null>(null)
  const hydrated = useRef(false)

  /* ── Persistence ── */
  useEffect(() => {
    const seeded = localStorage.getItem('te.seeded')
    if (seeded !== 'v5') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED.map(serializeThought)))
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(SEED_FOLDERS))
      localStorage.setItem(CANVASES_KEY, JSON.stringify(SEED_CANVASES))
      localStorage.setItem('te.seeded', 'v5')
      setThoughts(SEED)
      setFolders(SEED_FOLDERS)
      setCanvases(SEED_CANVASES)
      hydrated.current = true
    } else {
      const t = deserialize(localStorage.getItem(STORAGE_KEY))
      if (t?.length) setThoughts(t)
      try { const f = localStorage.getItem(FOLDERS_KEY); if (f) setFolders(JSON.parse(f)) } catch {}
      try { const c = localStorage.getItem(CANVASES_KEY); if (c) setCanvases(JSON.parse(c)) } catch {}

      loadRemote().then(r => {
        if (r) {
          if (r.thoughts?.length) setThoughts(r.thoughts)
          if (r.folders?.length) setFolders(r.folders)
          if (r.canvases?.length) setCanvases(r.canvases)
        }
      }).finally(() => { hydrated.current = true })
    }
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
    return initShortcuts([
      { id: 'new-thought', label: 'New Thought', defaultKey: 'cmd+n', action: () => setShowCapture(true) },
      { id: 'open-ai', label: 'Open AI Agent', defaultKey: 'cmd+j', action: () => setShowAI(prev => !prev) },
      { id: 'dashboard', label: 'Go to Dashboard', defaultKey: 'cmd+d', action: () => setView({ type: 'dashboard' }) },
      { id: 'search', label: 'Search', defaultKey: 'cmd+k', action: () => { /* implement search later */ } },
    ])
  }, [])

  /* ── Actions ── */
  const add = (partial: Omit<Thought, 'id' | 'createdAt'>) => {
    const t: Thought = { ...partial, id: crypto.randomUUID(), createdAt: new Date() }
    if (t.type !== 'ai') {
      if (view.type === 'folder') t.folderId = view.folderId
      else if (view.type === 'canvas') t.canvasId = view.canvasId
    }
    setThoughts(prev => [t, ...prev])
  }

  const update = (id: string, updates: Partial<Thought>) =>
    setThoughts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))

  const pin = (id: string) => setThoughts(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t))
  const del = (id: string) => setThoughts(prev => prev.filter(t => t.id !== id))
  
  const moveThought = (id: string) => {
    setMovingThoughtId(id)
  }

  const executeMove = (type: 'folder' | 'canvas' | 'thread', id?: string) => {
    if (!movingThoughtId) return
    if (type === 'thread') {
      update(movingThoughtId, { folderId: undefined, canvasId: undefined })
    } else if (type === 'folder' && id) {
      update(movingThoughtId, { folderId: id, canvasId: undefined })
    } else if (type === 'canvas' && id) {
      update(movingThoughtId, { canvasId: id, folderId: undefined, canvasX: 100, canvasY: 100 })
    }
    setMovingThoughtId(null)
  }

  const createFolder = (name: string) => {
    const f: Folder = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
    setFolders(prev => [...prev, f])
    setView({ type: 'folder', folderId: f.id })
  }

  const deleteFolder = (id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id))
    if (view.type === 'folder' && view.folderId === id) setView({ type: 'dashboard' })
  }

  const deleteCanvas = (id: string) => {
    setCanvases(prev => prev.filter(c => c.id !== id))
    if (view.type === 'canvas' && view.canvasId === id) setView({ type: 'dashboard' })
  }

  const createCanvas = (name: string) => {
    const c: Canvas = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
    setCanvases(prev => [...prev, c])
    setView({ type: 'canvas', canvasId: c.id })
  }

  const folderThoughts = useMemo(() =>
    view.type === 'folder' ? thoughts.filter(t => t.folderId === view.folderId) : [],
  [thoughts, view])

  const canvasThoughts = useMemo(() =>
    view.type === 'canvas' ? thoughts.filter(t => t.canvasId === view.canvasId) : [],
  [thoughts, view])

  const activeFolder = view.type === 'folder' ? folders.find(f => f.id === view.folderId) : null
  const activeCanvas = view.type === 'canvas' ? canvases.find(c => c.id === view.canvasId) : null

  const showSidebar = view.type !== 'dashboard'

  /* ── For "home" (All Thoughts), use a minimal full-bleed wrapper ── */
  const isFullBleed = view.type === 'dashboard' || view.type === 'home'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>

      {/* ── Sidebar (detail views only) ── */}
      {showSidebar && (
        <Sidebar
          view={view}
          thoughts={thoughts}
          folders={folders}
          canvases={canvases}
          onSetView={setView}
          onCreateFolder={createFolder}
          onCreateCanvas={createCanvas}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* ── Main ── */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, position: 'relative', overflow: 'hidden',
        marginRight: showAI ? 380 : 0,
        transition: 'margin-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* ── Full-bleed views header ── */}

        {/* ── Views ── */}
        {view.type === 'dashboard' && (
          <DashboardView
            thoughts={thoughts}
            folders={folders}
            canvases={canvases}
            onSetView={setView}
            onPin={pin}
            onDelete={del}
            onMove={moveThought}
            onAdd={add}
            onUpdate={update}
            onCreateFolder={createFolder}
            onCreateCanvas={createCanvas}
            onDeleteFolder={deleteFolder}
            onDeleteCanvas={deleteCanvas}
            onOpenCapture={() => setShowCapture(true)}
            onOpenAI={() => setShowAI(true)}
          />
        )}

        {view.type === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Minimal full-bleed thread header */}
            <div style={{
              padding: '20px 40px 0',
              display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
            }}>
              <span style={{ fontSize: 22 }}>💬</span>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>
                All Thoughts
              </h1>
            </div>
            <ThreadView thoughts={thoughts} onPin={pin} onDelete={del} onMove={moveThought} />
          </div>
        )}

        {view.type === 'canvas' && activeCanvas && (
          <CanvasView thoughts={canvasThoughts} onAdd={add} onDelete={del} onUpdate={update} />
        )}

        {view.type === 'folder' && activeFolder && (
          <FolderView folder={activeFolder} thoughts={folderThoughts} onPin={pin} onDelete={del} onMove={moveThought} onUpdate={update} />
        )}

        {/* ── Dock ── */}
        {view.type !== 'dashboard' && (
        <div style={{
          position: 'absolute', bottom: 24, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 40,
        }}>
          <div style={{
            display: 'flex', gap: 8, padding: '6px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 999,
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            pointerEvents: 'auto',
          }}>
            <button
              onClick={() => setShowCapture(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 38, padding: '0 20px',
                borderRadius: 999, border: 'none',
                background: '#0f172a', color: '#fff',
                fontSize: 13, fontWeight: 500,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget).style.background = '#334155'}
              onMouseLeave={e => (e.currentTarget).style.background = '#0f172a'}
            >
              <Plus size={15} /> Add
            </button>
            <button
              onClick={() => setShowAI(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 38, padding: '0 20px',
                borderRadius: 999,
                border: '1px solid #e2e8f0',
                background: '#f8fafc', color: '#475569',
                fontSize: 13, fontWeight: 500,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget).style.background = '#f1f5f9'}
              onMouseLeave={e => (e.currentTarget).style.background = '#f8fafc'}
            >
              <Sparkles size={15} /> AI
            </button>
          </div>
        </div>
        )}
      </main>

      {/* ── Modals ── */}
      {showCapture && <CaptureModal onAdd={add} onClose={() => setShowCapture(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {movingThoughtId && <MoveModal folders={folders} canvases={canvases} onClose={() => setMovingThoughtId(null)} onSelect={executeMove} />}
      <AISidebar isOpen={showAI} thoughts={thoughts} onAdd={add} onClose={() => setShowAI(false)} />
    </div>
  )
}
