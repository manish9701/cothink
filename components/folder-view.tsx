'use client'

import type { Folder } from './app-shell'
import type { Thought } from '@/lib/thought-types'
import ThreadView from './thread-view'
import { FolderOpen } from 'lucide-react'

interface Props { folder: Folder; thoughts: Thought[]; onPin: (id: string) => void; onDelete: (id: string) => void }

export default function FolderView({ folder, thoughts, onPin, onDelete }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--zinc-100)', background: 'var(--white)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <FolderOpen size={16} style={{ color: 'var(--zinc-400)' }} />
        <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--zinc-900)', margin: 0, letterSpacing: '-0.02em' }}>{folder.name}</h1>
        <span style={{ fontSize: 12, color: 'var(--zinc-400)' }}>{thoughts.length}</span>
      </div>
      <ThreadView thoughts={thoughts} onPin={onPin} onDelete={onDelete} />
    </div>
  )
}
