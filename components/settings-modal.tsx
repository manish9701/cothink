'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getCustomKeys, updateShortcut } from '@/lib/shortcuts-manager'

interface Props {
  onClose: () => void
}

const DEFAULT_SHORTCUTS = [
  { id: 'new-thought', label: 'New Thought', defaultKey: 'cmd+n' },
  { id: 'open-ai', label: 'Open AI Agent', defaultKey: 'cmd+j' },
  { id: 'dashboard', label: 'Go to Dashboard', defaultKey: 'cmd+d' },
  { id: 'search', label: 'Search', defaultKey: 'cmd+k' },
]

export default function SettingsModal({ onClose }: Props) {
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [recordingId, setRecordingId] = useState<string | null>(null)

  useEffect(() => {
    setKeys(getCustomKeys())
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      
      if (recordingId) {
        e.preventDefault()
        const parts = []
        if (e.ctrlKey || e.metaKey) parts.push('cmd')
        if (e.shiftKey) parts.push('shift')
        if (e.altKey) parts.push('alt')
        
        // Ignore just modifier keys
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

        parts.push(e.key.toLowerCase())
        const newKey = parts.join('+')
        
        updateShortcut(recordingId, newKey)
        setKeys(prev => ({ ...prev, [recordingId]: newKey }))
        setRecordingId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, recordingId])

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--zinc-900)', margin: 0 }}>Settings & Shortcuts</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--zinc-400)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--zinc-400)', letterSpacing: '0.05em', marginBottom: 16 }}>Keyboard Shortcuts</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DEFAULT_SHORTCUTS.map(sc => {
              const currentKey = keys[sc.id] || sc.defaultKey
              const isRecording = recordingId === sc.id
              
              return (
                <div key={sc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, color: 'var(--zinc-700)' }}>{sc.label}</span>
                  <button
                    onClick={() => setRecordingId(isRecording ? null : sc.id)}
                    style={{
                      background: isRecording ? 'var(--blue-50)' : 'var(--zinc-50)',
                      border: `1px solid ${isRecording ? 'var(--blue-200)' : 'var(--zinc-200)'}`,
                      color: isRecording ? 'var(--blue-600)' : 'var(--zinc-600)',
                      padding: '4px 8px', borderRadius: 6, fontSize: 12,
                      fontFamily: 'DM Mono, monospace', minWidth: 60, cursor: 'pointer'
                    }}
                  >
                    {isRecording ? 'Recording...' : currentKey}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
