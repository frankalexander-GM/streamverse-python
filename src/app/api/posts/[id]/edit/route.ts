import { NextRequest, NextResponse } from 'next/server'
import { PostService } from '@/lib/services'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  try {
    const post = await PostService.update(id, {
      content: body.content ?? '',
      mediaType: body.mediaType ?? null,
      mediaUrl: body.mediaUrl ?? null,
      mediaDuration: body.mediaDuration ?? null,
    })
    return NextResponse.json({ post: { ...post, liked: false, canEdit: true, canDelete: true } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
