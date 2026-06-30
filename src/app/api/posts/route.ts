import { NextRequest, NextResponse } from 'next/server'
import { PostService } from '@/lib/services'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const authorId = searchParams.get('authorId') ?? undefined
  const communityId = searchParams.get('communityId') ?? undefined
  const posts = await PostService.list({ authorId, communityId })
  return NextResponse.json({ posts })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  try {
    const post = await PostService.create({
      content: body.content ?? '',
      image: body.image ?? null,
      communityId: body.communityId ?? null,
      mediaType: body.mediaType ?? null,
      mediaUrl: body.mediaUrl ?? null,
      mediaDuration: body.mediaDuration ?? null,
    })
    return NextResponse.json({ post: { ...post, liked: false, canEdit: true, canDelete: true } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
