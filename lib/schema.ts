import { pgTable, text, timestamp, boolean, jsonb, doublePrecision } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const folders = pgTable('folders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().default('demo'),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const canvases = pgTable('canvases', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().default('demo'),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const thoughts = pgTable('thoughts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().default('demo'),
  folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  canvasId: text('canvas_id').references(() => canvases.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  pinned: boolean('pinned').default(false).notNull(),
  tags: jsonb('tags').$type<string[]>(),
  aiExpanded: text('ai_expanded'),
  voiceUrl: text('voice_url'),
  voiceDuration: text('voice_duration'),
  voiceTranscription: text('voice_transcription'),
  mediaUrl: text('media_url'),
  x: doublePrecision('x'),
  y: doublePrecision('y'),
  rotation: doublePrecision('rotation'),
  scale: doublePrecision('scale'),
})

// Define relations for drizzle-orm
export const foldersRelations = relations(folders, ({ many }) => ({
  thoughts: many(thoughts),
}))

export const canvasesRelations = relations(canvases, ({ many }) => ({
  thoughts: many(thoughts),
}))

export const thoughtsRelations = relations(thoughts, ({ one }) => ({
  folder: one(folders, {
    fields: [thoughts.folderId],
    references: [folders.id],
  }),
  canvas: one(canvases, {
    fields: [thoughts.canvasId],
    references: [canvases.id],
  }),
}))

export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().default('demo'),
  role: text('role').notNull(), // 'user' or 'ai'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
