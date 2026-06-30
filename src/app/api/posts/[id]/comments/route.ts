import { NextRequest, NextResponse } from 'next/server'
import { CommentService } from '@/lib/services'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comments = await CommentService.listByPost(id)
  return NextResponse.json({ comments })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  try {
    const comment = await CommentService.create(id, body.content ?? '')
    return NextResponse.json({ comment })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
