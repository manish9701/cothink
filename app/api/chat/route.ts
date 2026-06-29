import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatMessages } from '@/lib/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  try {
    const history = await db.select().from(chatMessages).orderBy(chatMessages.createdAt)
    return NextResponse.json(history)
  } catch (error: any) {
    console.error('Failed to load chat history:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { id, role, content } = await req.json()
    if (!id || !role || content == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await db.insert(chatMessages).values({
      id,
      role,
      content,
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to save chat message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
