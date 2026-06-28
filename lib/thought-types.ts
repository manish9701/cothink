export type ThoughtType = 'text' | 'voice' | 'ai' | 'photo' | 'video' | 'draw'

export interface Thought {
  id: string
  type: ThoughtType
  content: string
  createdAt: Date
  pinned?: boolean
  tags?: string[]
  aiExpanded?: string
  voiceUrl?: string
  voiceDuration?: string
  voiceTranscription?: string
  mediaUrl?: string
  canvasId?: string
  x?: number
  y?: number
  rotation?: number
  scale?: number
}

export type SerializedThought = Omit<Thought, 'createdAt'> & {
  createdAt: string
}

export function serializeThought(thought: Thought): SerializedThought {
  return {
    ...thought,
    createdAt: thought.createdAt.toISOString(),
  }
}

export function hydrateThought(thought: SerializedThought): Thought {
  return {
    ...thought,
    createdAt: new Date(thought.createdAt),
  }
}
