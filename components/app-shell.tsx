'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Sparkles, Folder as FolderIcon, Layout as CanvasIcon, ChevronLeft, Settings, User } from 'lucide-react'
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

const STORAGE_KEY = 'te.thoughts.v4'
const FOLDERS_KEY = 'te.folders.v2'
const CANVASES_KEY = 'te.canvases.v1'

export type Folder = { id: string; name: string; createdAt: string; summary?: string }
export type Canvas = { id: string; name: string; createdAt: string }
export type ViewState =
  | { type: 'dashboard' }
  | { type: 'home' }
  | { type: 'canvas'; canvasId: string }
  | { type: 'folder'; folderId: string }
  | { type: 'folders' }
  | { type: 'canvases' }

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
  // Folder: f1 (Propulsion Research)
  { id: '1', type: 'text', content: 'Need to calculate the optimal mixture ratio for the LOX/Methane bipropellant thruster. Currently leaning towards 3.6:1 but need to check the specific impulse charts.', createdAt: new Date(Date.now() - 1000 * 60 * 44), folderId: 'f1', pinned: true },
  { id: '2', type: 'ai', content: 'A mixture ratio of 3.6:1 for liquid oxygen and liquid methane is typical for maximizing specific impulse, though a slightly fuel-rich mixture is often used to keep engine temperatures lower.', createdAt: new Date(Date.now() - 1000 * 60 * 38), folderId: 'f1' },
  { id: '4', type: 'voice', content: 'Note to self: The injector faceplate needs a different acoustic cavity layout to dampen the high-frequency combustion instability we saw in the last static fire.', createdAt: new Date(Date.now() - 1000 * 60 * 15), voiceDuration: '0:42', folderId: 'f1' },
  { id: 'f1_4', type: 'text', content: 'Reviewing the turbopump shaft seals. We are seeing minor cryogenic leakage past the primary seal under high RPM.', createdAt: new Date(Date.now() - 1000 * 60 * 10), folderId: 'f1' },
  { id: 'f1_5', type: 'ai', content: 'Cryogenic leakage at high RPM is commonly due to thermal contraction of the primary seal. Consider shifting to a labyrinth seal design or using spring-energized PTFE seals designed for cryogenic service.', createdAt: new Date(Date.now() - 1000 * 60 * 9), folderId: 'f1' },
  { id: 'f1_6', type: 'voice', content: 'Let\'s schedule a meeting with the thermal dynamics team to discuss the heat shield ablation rates we measured yesterday.', createdAt: new Date(Date.now() - 1000 * 60 * 8), voiceDuration: '0:18', folderId: 'f1' },
  { id: 'f1_7', type: 'text', content: 'Thrust vector control servos are over-correcting during gimbal limits. Adjust the PID tuning parameters.', createdAt: new Date(Date.now() - 1000 * 60 * 7), folderId: 'f1' },
  { id: 'f1_8', type: 'text', content: 'Check if we can replace the heavy copper-alloy cooling jacket with a 3D printed Inconel structure to save mass.', createdAt: new Date(Date.now() - 1000 * 60 * 6), folderId: 'f1' },
  { id: 'f1_9', type: 'ai', content: '3D printed Inconel 718 is highly suitable for regenerative cooling jackets, offering high tensile strength at extreme temperatures, but thermal conductivity is significantly lower than copper alloys. You will need to compensate with thinner walls or higher coolant flow.', createdAt: new Date(Date.now() - 1000 * 60 * 5), folderId: 'f1' },
  { id: 'f1_10', type: 'text', content: 'Test the pneumatic valves under vacuum conditions to ensure the solenoid actuators don\'t freeze.', createdAt: new Date(Date.now() - 1000 * 60 * 4), folderId: 'f1' },

  // Folder: f2 (Design Engineering)
  { id: '5', type: 'text', content: 'Micro-interactions on the new dashboard are feeling stiff. Let\'s transition them from linear to a custom spring physics curve to make the interface feel more alive.', createdAt: new Date(Date.now() - 1000 * 60 * 11), folderId: 'f2' },
  { id: 'f2_2', type: 'ai', content: 'Using a spring physics curve (e.g., stiffness: 300, damping: 30) instead of a standard CSS ease-out creates a much more natural, fluid response to user inputs.', createdAt: new Date(Date.now() - 1000 * 60 * 10), folderId: 'f2' },
  { id: 'f2_3', type: 'text', content: 'We need to standardize our border radii. Buttons are at 8px, but modals are at 24px. Let\'s make sure nested elements follow the concentric radius formula: outerRadius - padding = innerRadius.', createdAt: new Date(Date.now() - 1000 * 60 * 9), folderId: 'f2' },
  { id: 'f2_4', type: 'voice', content: 'The dark mode contrasts are too harsh. The pure black background is causing eye strain. Let\'s shift it to a deep zinc or slate gray, maybe #0f172a.', createdAt: new Date(Date.now() - 1000 * 60 * 8), voiceDuration: '0:35', folderId: 'f2' },
  { id: 'f2_5', type: 'text', content: 'Add a subtle 1px border with 0.06 opacity on all floating panels to give them crisp definition without heavy drop shadows.', createdAt: new Date(Date.now() - 1000 * 60 * 7), folderId: 'f2' },
  { id: 'f2_6', type: 'ai', content: 'A semi-transparent border (like `rgba(255, 255, 255, 0.1)` in dark mode or `rgba(0, 0, 0, 0.06)` in light mode) creates a physical edge that prevents content from bleeding into the background, enhancing the glassmorphism effect.', createdAt: new Date(Date.now() - 1000 * 60 * 6), folderId: 'f2' },
  { id: 'f2_7', type: 'text', content: 'The empty states feel too barren. Can we add some monochromatic wireframe illustrations and a helpful prompt?', createdAt: new Date(Date.now() - 1000 * 60 * 5), folderId: 'f2' },
  { id: 'f2_8', type: 'voice', content: 'I noticed the focus rings on inputs are cut off by overflow hidden on the parent containers. Need to fix that globally.', createdAt: new Date(Date.now() - 1000 * 60 * 4), voiceDuration: '0:12', folderId: 'f2' },
  { id: 'f2_9', type: 'text', content: 'Typography update: switch the primary headings to Inter with -0.02em tracking, and keep DM Sans for body text with a slightly elevated line-height (1.6).', createdAt: new Date(Date.now() - 1000 * 60 * 3), folderId: 'f2' },
  { id: 'f2_10', type: 'text', content: 'Ensure all hover states have a minimum transition duration of 150ms to prevent flashing.', createdAt: new Date(Date.now() - 1000 * 60 * 2), folderId: 'f2' },

  // Canvas: c1 (Rocket Engine Specs)
  { id: '3', type: 'text', content: 'Review the heat transfer coefficients for the regenerative cooling channels. The inner wall is getting dangerously close to melting point.', createdAt: new Date(Date.now() - 1000 * 60 * 28), canvasId: 'c1', x: 120, y: 150 },
  { id: 'c1_2', type: 'ai', content: 'To improve heat transfer, consider increasing the surface roughness of the cooling channels or utilizing rib roughening to trip the boundary layer and enhance turbulence.', createdAt: new Date(Date.now() - 1000 * 60 * 27), canvasId: 'c1', x: 150, y: 350 },
  { id: 'c1_3', type: 'text', content: 'Injector plate mass needs to drop by 15% before flight. Can we bore out the central hub?', createdAt: new Date(Date.now() - 1000 * 60 * 25), canvasId: 'c1', x: 450, y: 120 },
  { id: 'c1_4', type: 'voice', content: 'The current piping routing for the oxidizer is causing a pressure drop of 40 psi. We need smoother bends, maybe a larger diameter pipe before the manifold.', createdAt: new Date(Date.now() - 1000 * 60 * 20), voiceDuration: '0:50', canvasId: 'c1', x: 500, y: 300 },
  { id: 'c1_5', type: 'text', content: 'Chamber pressure targets: 250 bar nominally, 300 bar max expected during transients.', createdAt: new Date(Date.now() - 1000 * 60 * 18), canvasId: 'c1', x: 800, y: 150 },
  { id: 'c1_6', type: 'text', content: 'Gimbal range is currently limited to 6 degrees by the flexible hoses. If we switch to bellows, we might squeeze out 8 degrees.', createdAt: new Date(Date.now() - 1000 * 60 * 16), canvasId: 'c1', x: 820, y: 350 },
  { id: 'c1_7', type: 'ai', content: 'Flexible braided bellows offer excellent axial and angular deflection capabilities, but require careful analysis to prevent flow-induced vibrations at high propellant velocities.', createdAt: new Date(Date.now() - 1000 * 60 * 15), canvasId: 'c1', x: 850, y: 500 },
  { id: 'c1_8', type: 'text', content: 'The ignition system requires a redundant spark exciter. Single point failure here is unacceptable.', createdAt: new Date(Date.now() - 1000 * 60 * 12), canvasId: 'c1', x: 100, y: 550 },
  { id: 'c1_9', type: 'voice', content: 'Make sure the telemetry sampling rate on the turbine tachometer is at least 5 kilohertz, we missed the startup transient spike last time.', createdAt: new Date(Date.now() - 1000 * 60 * 10), voiceDuration: '0:22', canvasId: 'c1', x: 450, y: 550 },
  { id: 'c1_10', type: 'text', content: 'Overall engine dry mass goal is currently sitting at 450 kg. We are 15 kg overweight.', createdAt: new Date(Date.now() - 1000 * 60 * 8), canvasId: 'c1', x: 1100, y: 200 },

  // Canvas: c2 (UI/UX Moodboard)
  { id: '6', type: 'voice', content: 'Thinking about the new navigation modal. Instead of a hard drop, what if we blur the background slightly and animate it in with a soft scale? Should feel way more premium.', createdAt: new Date(Date.now() - 1000 * 60 * 5), voiceDuration: '0:28', canvasId: 'c2', x: 200, y: 100 },
  { id: '7', type: 'text', content: 'Remember to check Emil\'s design guidelines on optical alignment and font smoothing for the typography overhaul.', createdAt: new Date(Date.now() - 1000 * 60 * 2), canvasId: 'c2', x: 400, y: 300 },
  { id: 'c2_3', type: 'ai', content: 'To achieve optimal font smoothing on macOS and iOS, you can apply `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`. This makes the type appear slightly thinner and much sharper.', createdAt: new Date(Date.now() - 1000 * 60 * 1), canvasId: 'c2', x: 450, y: 450 },
  { id: 'c2_4', type: 'text', content: 'We need to design a system for "toast" notifications. They should slide in from the bottom right, stack neatly, and auto-dismiss after 4 seconds.', createdAt: new Date(Date.now() - 1000 * 60 * 10), canvasId: 'c2', x: 800, y: 150 },
  { id: 'c2_5', type: 'text', content: 'Experiment with using tabular numbers (`font-variant-numeric: tabular-nums`) for any UI components that display live data or counters. It prevents the width from shifting rapidly.', createdAt: new Date(Date.now() - 1000 * 60 * 9), canvasId: 'c2', x: 850, y: 350 },
  { id: 'c2_6', type: 'voice', content: 'The drag-and-drop ghost element is fully opaque. It looks clunky. It should be semi-transparent and slightly rotated to feel like it has momentum.', createdAt: new Date(Date.now() - 1000 * 60 * 8), voiceDuration: '0:15', canvasId: 'c2', x: 150, y: 550 },
  { id: 'c2_7', type: 'text', content: 'For the primary accent color, the `#8b5cf6` (violet) looks fantastic in dark mode, but we might need a slightly darker shade for contrast compliance in light mode.', createdAt: new Date(Date.now() - 1000 * 60 * 7), canvasId: 'c2', x: 500, y: 650 },
  { id: 'c2_8', type: 'ai', content: 'Using `#7c3aed` (violet-600) for light mode and `#8b5cf6` (violet-500) for dark mode ensures WCAG AA compliance for contrast against standard backgrounds while maintaining brand identity.', createdAt: new Date(Date.now() - 1000 * 60 * 6), canvasId: 'c2', x: 800, y: 600 },
  { id: 'c2_9', type: 'text', content: 'Implement skeleton loaders for the dashboard panels. A subtle shimmer effect using linear gradients traversing left to right creates a great perception of speed.', createdAt: new Date(Date.now() - 1000 * 60 * 5), canvasId: 'c2', x: 1100, y: 250 },
  { id: 'c2_10', type: 'text', content: 'Ensure the scrollbars on the canvases are completely hidden or custom-styled. The default browser scrollbars break the immersion completely.', createdAt: new Date(Date.now() - 1000 * 60 * 4), canvasId: 'c2', x: 1150, y: 450 },
]

const SEED_FOLDERS: Folder[] = [
  { id: 'f1', name: 'Propulsion Research', createdAt: new Date().toISOString() },
  { id: 'f2', name: 'Design Engineering', createdAt: new Date().toISOString() },
]

const SEED_CANVASES: Canvas[] = [
  { id: 'c1', name: 'Rocket Engine Specs', createdAt: new Date().toISOString() },
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
      className="scale-on-press"
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

  const sectionLabel = (label: string, onPlus?: () => void) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 10px', margin: '14px 0 4px',
      gap: 6,
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--zinc-400)' }}>
        {label}
      </span>
      {onPlus && (
        <button
          onClick={onPlus}
          className="scale-on-press"
          style={{
            border: 'none', background: 'none', padding: '2px', cursor: 'pointer',
            color: 'var(--zinc-400)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title={`Add ${label.slice(0, -1)}`}
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  )

  return (
    <aside style={{
      width: 216,
      background: '#fff',
      borderRight: '1px solid var(--zinc-150)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo / back to dashboard */}
      <div
        onClick={() => onSetView({ type: 'dashboard' })}
        style={{
          padding: '16px 14px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer',
          borderBottom: '1px solid var(--zinc-100)',
        }}
      >
        <ChevronLeft size={18} style={{ color: 'var(--zinc-400)' }} />
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 24, fontWeight: 300, color: '#000000',
          letterSpacing: '-0.02em',
        }}>
          co<span style={{ color: '#000000' }}>*</span>think
        </span>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }} className="no-scroll">
        {/* Captures */}
        {navItem('Captures', view.type === 'home', () => onSetView({ type: 'home' }))}

        {/* Canvases */}
        {sectionLabel('Canvases', () => setCreatingCanvas(true))}
        <div style={{ padding: '0 0 0 2px' }}>
          {creatingCanvas && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', marginBottom: 2 }}>
              <CanvasIcon size={16} color="var(--zinc-400)" />
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
                style={{ flex: 1, fontSize: 12, color: 'var(--zinc-900)', borderBottom: '1px solid var(--zinc-300)', padding: '2px 0', background: 'transparent' }}
              />
            </div>
          )}
          {canvases.map(c => {
            const active = view.type === 'canvas' && view.canvasId === c.id
            return (
              <button
                key={c.id}
                onClick={() => onSetView({ type: 'canvas', canvasId: c.id })}
                className={`nav-item scale-on-press ${active ? 'active' : ''}`}
                style={{ marginBottom: 1 }}
              >
                <span style={{ flex: 1 }}>{c.name}</span>
              </button>
            )
          })}
        </div>

        {/* Folders */}
        {sectionLabel('Folders', () => setCreatingFolder(true))}
        <div style={{ padding: '0 0 0 2px' }}>
          {creatingFolder && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', marginBottom: 2 }}>
              <FolderIcon size={16} color="var(--zinc-400)" />
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
                style={{ flex: 1, fontSize: 12, color: 'var(--zinc-900)', borderBottom: '1px solid var(--zinc-300)', padding: '2px 0', background: 'transparent' }}
              />
            </div>
          )}
          {folders.map(f => {
            const active = view.type === 'folder' && view.folderId === f.id
            return (
              <button
                key={f.id}
                onClick={() => onSetView({ type: 'folder', folderId: f.id })}
                className={`nav-item scale-on-press ${active ? 'active' : ''}`}
                style={{ marginBottom: 1 }}
              >
                <span style={{ flex: 1 }}>{f.name}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Bottom: Settings only */}
      <div style={{ padding: '10px 8px 12px', borderTop: '1px solid var(--zinc-100)' }}>
        <button
          onClick={onOpenSettings}
          className="nav-item scale-on-press"
          style={{ width: '100%' }}
        >
          <Settings size={18} style={{ color: 'var(--zinc-400)', flexShrink: 0 }} />
          <span>Settings</span>
        </button>
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
    loadRemote().then(r => {
      if (r) {
        const hasThoughts = r.thoughts && r.thoughts.length >= 5
        const hasFolders = r.folders && r.folders.length > 0
        const hasCanvases = r.canvases && r.canvases.length > 0

        if (hasThoughts && hasFolders && hasCanvases) {
          if (r.thoughts) setThoughts(r.thoughts)
          if (r.folders) setFolders(r.folders)
          if (r.canvases) setCanvases(r.canvases)
        } else {
          // If the PostgreSQL database doesn't have the full SEED, push it.
          setThoughts(SEED)
          setFolders(SEED_FOLDERS)
          setCanvases(SEED_CANVASES)
          saveRemote(SEED, SEED_FOLDERS, SEED_CANVASES)
        }
      }
    }).finally(() => { hydrated.current = true })
  }, [])

  useEffect(() => {
    if (hydrated.current) saveRemote(thoughts, folders, canvases)
  }, [thoughts, folders, canvases])

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
      update(movingThoughtId, { canvasId: id, folderId: undefined, x: 100, y: 100 })
    }
    setMovingThoughtId(null)
  }

  const createFolder = (name: string) => {
    const f: Folder = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
    setFolders(prev => [...prev, f])
    setView({ type: 'folder', folderId: f.id })
  }

  const updateFolder = (id: string, updates: Partial<Folder>) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
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

  const unattendedThoughts = useMemo(() => thoughts.filter(t => !t.folderId && !t.canvasId), [thoughts])

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
            <div style={{
              padding: '16px 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
              borderBottom: '1px solid var(--zinc-100)',
              background: 'var(--white)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--zinc-900)', margin: 0, letterSpacing: '-0.02em' }}>
                  Captures
                </h1>
                <span style={{ fontSize: 12, color: 'var(--zinc-400)', fontWeight: 400 }}>
                  {unattendedThoughts.filter(t => t.type !== 'ai').length} captured
                </span>
              </div>
              <div
                className="icon-btn scale-on-press"
                style={{ width: 36, height: 36, borderRadius: '50%' }}
              >
                <User size={18} />
              </div>
            </div>
            <ThreadView thoughts={unattendedThoughts} onPin={pin} onDelete={del} onMove={moveThought} />
          </div>
        )}

        {view.type === 'canvas' && activeCanvas && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
              borderBottom: '1px solid var(--zinc-100)',
              background: 'var(--white)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CanvasIcon size={16} style={{ color: 'var(--zinc-400)' }} />
                <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--zinc-900)', margin: 0, letterSpacing: '-0.02em' }}>{activeCanvas.name}</h1>
              </div>
              <div className="icon-btn scale-on-press" style={{ width: 36, height: 36, borderRadius: '50%' }}>
                <User size={18} />
              </div>
            </div>
            <CanvasView thoughts={canvasThoughts} allThoughts={thoughts} folders={folders} canvasId={activeCanvas.id} onAdd={add} onDelete={del} onUpdate={update} onOpenCapture={() => setShowCapture(true)} />
          </div>
        )}

        {view.type === 'folder' && activeFolder && (
          <FolderView folder={activeFolder} thoughts={folderThoughts} onPin={pin} onDelete={del} onMove={moveThought} onUpdate={update} onUpdateFolder={updateFolder} />
        )}

        {view.type === 'folders' && (
          <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: 'var(--page)' }} className="no-scroll">
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--zinc-900)', marginBottom: 24, letterSpacing: '-0.03em' }}>All Folders</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {folders.map(f => (
                <div
                  key={f.id}
                  onClick={() => setView({ type: 'folder', folderId: f.id })}
                  className="scale-on-press"
                  style={{
                    padding: '20px', borderRadius: 16, background: '#fff', border: '1px solid var(--zinc-150)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  <FolderIcon size={24} color="var(--zinc-400)" />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--zinc-800)' }}>{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view.type === 'canvases' && (
          <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: 'var(--page)' }} className="no-scroll">
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--zinc-900)', marginBottom: 24, letterSpacing: '-0.03em' }}>All Canvases</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {canvases.map(c => (
                <div
                  key={c.id}
                  onClick={() => setView({ type: 'canvas', canvasId: c.id })}
                  className="scale-on-press"
                  style={{
                    padding: '20px', borderRadius: 16, background: '#fff', border: '1px solid var(--zinc-150)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  <CanvasIcon size={24} color="var(--zinc-400)" />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--zinc-800)' }}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Dock ── */}
        <div style={{
          position: 'absolute', bottom: 24, right: 32,
          display: 'flex', justifyContent: 'flex-end',
          pointerEvents: 'none', zIndex: 40,
        }}>
          <div style={{
            display: 'flex', gap: 8, padding: '6px',
            background: 'var(--white)',
            border: '1px solid var(--zinc-200)',
            borderRadius: 999,
            boxShadow: '0 8px 30px rgba(0,0,0,0.1), 0 2px 10px rgba(0,0,0,0.06)',
            pointerEvents: 'auto',
          }}>
            {view.type !== 'canvas' && (
              <button
                onClick={() => setShowCapture(true)}
                className="scale-on-press"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 36, padding: '0 18px',
                  borderRadius: 999, border: 'none',
                  background: 'var(--zinc-900)', color: '#fff',
                  fontSize: 13, fontWeight: 500,
                  letterSpacing: '-0.01em',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget).style.background = 'var(--zinc-700)'}
                onMouseLeave={e => (e.currentTarget).style.background = 'var(--zinc-900)'}
              >
                <Plus size={18} /> Add
              </button>
            )}
            <button
              onClick={() => setShowAI(prev => !prev)}
              className="scale-on-press"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 36, padding: '0 18px',
                borderRadius: 999,
                border: '1px solid var(--zinc-200)',
                background: showAI ? 'var(--zinc-100)' : 'transparent',
                color: showAI ? 'var(--zinc-900)' : 'var(--zinc-500)',
                fontSize: 13, fontWeight: 500,
                letterSpacing: '-0.01em',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget).style.background = 'var(--zinc-100)'; (e.currentTarget).style.color = 'var(--zinc-800)' }}
              onMouseLeave={e => { (e.currentTarget).style.background = showAI ? 'var(--zinc-100)' : 'transparent'; (e.currentTarget).style.color = showAI ? 'var(--zinc-900)' : 'var(--zinc-500)' }}
            >
              <Sparkles size={18} /> Think
            </button>
          </div>
        </div>
      </main>

      {/* ── Modals ── */}
      {showCapture && <CaptureModal onAdd={add} onClose={() => setShowCapture(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {movingThoughtId && (
        <MoveModal 
          thought={thoughts.find(t => t.id === movingThoughtId)} 
          folders={folders} 
          canvases={canvases} 
          onClose={() => setMovingThoughtId(null)} 
          onSelect={executeMove} 
        />
      )}
      <AISidebar isOpen={showAI} thoughts={thoughts} onAdd={add} onClose={() => setShowAI(false)} />
    </div>
  )
}
