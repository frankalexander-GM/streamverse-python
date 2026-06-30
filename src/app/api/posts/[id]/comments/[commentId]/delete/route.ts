import { NextRequest, NextResponse } from 'next/server'
import { CommentService } from '@/lib/services'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { commentId } = await params
  try {
    const result = await CommentService.delete(commentId)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
