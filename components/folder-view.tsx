'use client'

import { useState, useEffect } from 'react'
import type { Folder } from './app-shell'
import type { Thought } from '@/lib/thought-types'
import ThreadView from './thread-view'
import { FolderOpen, Sparkles, User } from 'lucide-react'

interface Props { 
  folder: Folder; 
  thoughts: Thought[]; 
  onPin: (id: string) => void; 
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Thought>) => void;
  onMove: (id: string) => void;
  onUpdateFolder?: (id: string, updates: Partial<Folder>) => void;
}

export default function FolderView({ folder, thoughts, onPin, onDelete, onMove, onUpdate, onUpdateFolder }: Props) {
  const [localSummary, setLocalSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const summaryToDisplay = folder.summary || localSummary

  // Auto-generate summary when reaching 5 thoughts and no summary exists
  useEffect(() => {
    if (thoughts.length >= 5 && !summaryToDisplay && !loading) {
      generateSummary()
    }
  }, [thoughts.length, folder.summary])

  const generateSummary = async () => {
    if (loading) return
    setLoading(true)
    setLocalSummary('')
    let newSummary = ''
    try {
      const res = await fetch('/api/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Summarize the core themes and key points of this folder (named: "${folder.name}") in one short, insightful paragraph.`,
          context: JSON.stringify(thoughts)
        })
      })
      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\\n')
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.delta) {
                setLocalSummary(s => s + parsed.delta)
                newSummary += parsed.delta
              }
            } catch {}
          }
        }
      }
      if (onUpdateFolder && newSummary) {
        onUpdateFolder(folder.id, { summary: newSummary })
      }
    } finally {
      setLoading(false)
    }
  }
  return (
    <div 
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        const tId = e.dataTransfer.getData('text/plain')
        if (tId) onUpdate(tId, { folderId: folder.id, canvasId: undefined })
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--zinc-100)', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FolderOpen size={16} style={{ color: 'var(--zinc-400)' }} />
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--zinc-900)', margin: 0, letterSpacing: '-0.02em', flex: 1 }}>{folder.name}</h1>
        </div>
        <div 
          className="icon-btn scale-on-press"
          style={{ width: 36, height: 36, borderRadius: '50%' }}
        >
          <User size={18} />
        </div>
      </div>

      {summaryToDisplay && (
        <div style={{ padding: '24px 32px 0' }}>
          <div style={{ 
            padding: '20px 24px', 
            background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
            borderRadius: 20, 
            border: '1px solid var(--zinc-200)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.03)',
            backdropFilter: 'blur(10px)',
            display: 'flex', gap: 16, alignItems: 'flex-start',
            position: 'relative'
          }}>
            <div style={{ 
              width: 32, height: 32, borderRadius: 10, background: 'var(--zinc-900)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
            }}>
              <Sparkles size={16} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--zinc-900)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Folder Insights</h4>
                <button
                  onClick={generateSummary}
                  disabled={loading}
                  className="scale-on-press"
                  style={{
                    background: 'var(--zinc-100)', border: 'none', borderRadius: 8, padding: '4px 10px',
                    fontSize: 11, fontWeight: 600, color: 'var(--zinc-600)', cursor: loading ? 'wait' : 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.background = 'var(--zinc-200)' }}
                  onMouseLeave={e => { (e.currentTarget).style.background = 'var(--zinc-100)' }}
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--zinc-700)', lineHeight: 1.6, letterSpacing: '-0.01em' }}>
                {summaryToDisplay}
              </p>
            </div>
          </div>
        </div>
      )}
      {loading && !summaryToDisplay && thoughts.length >= 5 && (
        <div style={{ padding: '24px 32px 0' }}>
          <div style={{ 
            padding: '16px 20px', background: 'var(--zinc-50)', border: '1px solid var(--zinc-150)', borderRadius: 16, 
            display: 'flex', gap: 10, alignItems: 'center' 
          }}>
             <Sparkles size={14} color="var(--zinc-400)" />
             <span style={{ fontSize: 13, color: 'var(--zinc-500)', fontStyle: 'italic' }}>Analyzing folder patterns…</span>
          </div>
        </div>
      )}

      <ThreadView thoughts={thoughts} onPin={onPin} onDelete={onDelete} onMove={onMove} />
    </div>
  )
}
