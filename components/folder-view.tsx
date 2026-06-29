'use client'

import { useState } from 'react'
import type { Folder } from './app-shell'
import type { Thought } from '@/lib/thought-types'
import ThreadView from './thread-view'
import { FolderOpen, Sparkles } from 'lucide-react'

interface Props { 
  folder: Folder; 
  thoughts: Thought[]; 
  onPin: (id: string) => void; 
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Thought>) => void;
  onMove: (id: string) => void;
}

export default function FolderView({ folder, thoughts, onPin, onDelete, onMove, onUpdate }: Props) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const generateSummary = async () => {
    setLoading(true)
    setSummary('')
    try {
      const res = await fetch('/api/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Summarize the core themes and key points of this folder in one short, insightful paragraph.',
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
              if (parsed.delta) setSummary(s => s + parsed.delta)
            } catch {}
          }
        }
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
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--zinc-100)', background: 'var(--white)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <FolderOpen size={16} style={{ color: 'var(--zinc-400)' }} />
        <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--zinc-900)', margin: 0, letterSpacing: '-0.02em', flex: 1 }}>{folder.name}</h1>
        <button 
          onClick={generateSummary}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#f8fafc', border: '1px solid #e2e8f0',
            padding: '4px 10px', borderRadius: 6, fontSize: 12,
            color: '#6d28d9', cursor: loading ? 'wait' : 'pointer'
          }}
        >
          <Sparkles size={12} /> {loading ? 'Summarizing...' : 'AI Summary'}
        </button>
      </div>

      {summary && (
        <div style={{ padding: '16px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#0f172a', lineHeight: 1.6, fontStyle: 'italic' }}>
            <Sparkles size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: '#8b5cf6' }} />
            {summary}
          </p>
        </div>
      )}

      <ThreadView thoughts={thoughts} onPin={onPin} onDelete={onDelete} onMove={onMove} />
    </div>
  )
}
