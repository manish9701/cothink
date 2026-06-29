'use client'

import { X, Folder as FolderIcon, Layout as CanvasIcon } from 'lucide-react'
import type { Folder, Canvas } from './app-shell'

interface Props {
  folders: Folder[]
  canvases: Canvas[]
  onClose: () => void
  onSelect: (type: 'folder' | 'canvas' | 'thread', id?: string) => void
}

export default function MoveModal({ folders, canvases, onClose, onSelect }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet" style={{ maxWidth: 400, padding: 0 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>Move Thought</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
          <button
            onClick={() => onSelect('thread')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff',
              cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            <span style={{ fontSize: 18 }}>💬</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>Main Thread</span>
          </button>

          {folders.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 8px' }}>Folders</p>
              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => onSelect('folder', f.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    borderRadius: 12, border: 'none', background: 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <FolderIcon size={16} color="#64748b" />
                  <span style={{ fontSize: 14, color: '#1e293b' }}>{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {canvases.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 8px' }}>Canvases</p>
              {canvases.map(c => (
                <button
                  key={c.id}
                  onClick={() => onSelect('canvas', c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    borderRadius: 12, border: 'none', background: 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <CanvasIcon size={16} color="#64748b" />
                  <span style={{ fontSize: 14, color: '#1e293b' }}>{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
