import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { thoughts as thoughtsTable, folders as foldersTable, canvases as canvasesTable } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import type { SerializedThought } from '@/lib/thought-types'

const USER_ID = process.env.MINDED_USER_ID || 'demo'

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ configured: false })
    }

    // Fetch folders
    const dbFolders = await db
      .select()
      .from(foldersTable)
      .where(eq(foldersTable.userId, USER_ID))
      .orderBy(desc(foldersTable.createdAt))

    // Fetch canvases
    const dbCanvases = await db
      .select()
      .from(canvasesTable)
      .where(eq(canvasesTable.userId, USER_ID))
      .orderBy(desc(canvasesTable.createdAt))

    // Fetch thoughts
    const dbThoughts = await db
      .select()
      .from(thoughtsTable)
      .where(eq(thoughtsTable.userId, USER_ID))
      .orderBy(desc(thoughtsTable.createdAt))

    const folders = dbFolders.map(f => ({
      id: f.id,
      name: f.name,
      createdAt: f.createdAt.toISOString()
    }))

    const canvases = dbCanvases.map(c => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt.toISOString()
    }))

    const thoughts: SerializedThought[] = dbThoughts.map(t => ({
      id: t.id,
      type: t.type as any,
      content: t.content,
      createdAt: t.createdAt.toISOString(),
      pinned: t.pinned,
      folderId: t.folderId || undefined,
      canvasId: t.canvasId || undefined,
      tags: t.tags || undefined,
      aiExpanded: t.aiExpanded || undefined,
      voiceUrl: t.voiceUrl || undefined,
      voiceDuration: t.voiceDuration || undefined,
      voiceTranscription: t.voiceTranscription || undefined,
      mediaUrl: t.mediaUrl || undefined,
      x: t.x !== null ? t.x : undefined,
      y: t.y !== null ? t.y : undefined,
      rotation: t.rotation !== null ? t.rotation : undefined,
      scale: t.scale !== null ? t.scale : undefined,
    }))

    if (folders.length === 0 && canvases.length === 0 && thoughts.length === 0) {
      // Seed Database
      await db.insert(foldersTable).values([
        { id: 'f1', userId: USER_ID, name: 'Cothink ideas', createdAt: new Date() },
        { id: 'f2', userId: USER_ID, name: 'Engineering Specs', createdAt: new Date() },
      ])
      await db.insert(canvasesTable).values([
        { id: 'c1', userId: USER_ID, name: 'Architecture Diagram', createdAt: new Date() },
        { id: 'c2', userId: USER_ID, name: 'UI/UX Moodboard', createdAt: new Date() },
      ])
      await db.insert(thoughtsTable).values([
        { id: '1', userId: USER_ID, type: 'text', content: 'Explore the concept of "Agentic Workflows" for the new framework.', createdAt: new Date(Date.now() - 1000 * 60 * 44), folderId: 'f1', pinned: true },
        { id: '2', userId: USER_ID, type: 'ai', content: 'Agentic workflows involve defining high-level goals and letting the AI dynamically plan and execute steps.', createdAt: new Date(Date.now() - 1000 * 60 * 38), folderId: 'f1' },
        { id: '3', userId: USER_ID, type: 'text', content: 'Need to review the new WebRTC implementation for live audio streaming: https://webrtc.org', createdAt: new Date(Date.now() - 1000 * 60 * 28) },
        { id: '4', userId: USER_ID, type: 'voice', content: 'Design ideas for the new dashboard...', createdAt: new Date(Date.now() - 1000 * 60 * 15), voiceDuration: '1:12', canvasId: 'c1', x: 200, y: 150 },
        { id: '5', userId: USER_ID, type: 'text', content: 'Complexity is often a sign that the model is wrong, not that the idea is hard.', createdAt: new Date(Date.now() - 1000 * 60 * 11) },
      ])
      // Re-fetch
      return GET()
    }

    return NextResponse.json({ configured: true, thoughts, folders, canvases })
  } catch (error) {
    console.error('Failed to get data:', error)
    return NextResponse.json({ error: 'Failed to read data from database' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database is not configured' }, { status: 400 })
    }

    const body = await req.json()
    const thoughts = body.thoughts || []
    const folders = body.folders || []
    const canvases = body.canvases || []

    // Use transaction to synchronize state safely
    await db.transaction(async (tx) => {
      // Delete in correct order (thoughts first due to FK deps)
      await tx.delete(thoughtsTable).where(eq(thoughtsTable.userId, USER_ID))
      await tx.delete(foldersTable).where(eq(foldersTable.userId, USER_ID))
      await tx.delete(canvasesTable).where(eq(canvasesTable.userId, USER_ID))

      // Insert Folders
      if (folders.length > 0) {
        await tx.insert(foldersTable).values(
          folders.map((f: any) => ({
            id: f.id,
            userId: USER_ID,
            name: f.name,
            createdAt: new Date(f.createdAt)
          }))
        ).onConflictDoNothing()
      }

      // Insert Canvases
      if (canvases.length > 0) {
        await tx.insert(canvasesTable).values(
          canvases.map((c: any) => ({
            id: c.id,
            userId: USER_ID,
            name: c.name,
            createdAt: new Date(c.createdAt)
          }))
        ).onConflictDoNothing()
      }

      // Insert Thoughts
      if (thoughts.length > 0) {
        await tx.insert(thoughtsTable).values(
          thoughts.map((t: any) => ({
            id: t.id,
            userId: USER_ID,
            folderId: t.folderId || null,
            canvasId: t.canvasId || null,
            type: t.type,
            content: t.content,
            createdAt: new Date(t.createdAt),
            pinned: t.pinned || false,
            tags: t.tags || null,
            aiExpanded: t.aiExpanded || null,
            voiceUrl: t.voiceUrl || null,
            voiceDuration: t.voiceDuration || null,
            voiceTranscription: t.voiceTranscription || null,
            mediaUrl: t.mediaUrl || null,
            x: t.x !== undefined ? t.x : null,
            y: t.y !== undefined ? t.y : null,
            rotation: t.rotation !== undefined ? t.rotation : null,
            scale: t.scale !== undefined ? t.scale : null,
          }))
        ).onConflictDoNothing()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save data:', error)
    return NextResponse.json({ error: 'Failed to save data to database' }, { status: 500 })
  }
}
