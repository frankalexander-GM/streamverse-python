import { NextRequest, NextResponse } from 'next/server'
import { PostService, CommunityService } from '@/lib/services'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const community = await CommunityService.getBySlug(slug)
  if (!community) return NextResponse.json({ error: 'Comunidad no encontrada' }, { status: 404 })
  const posts = await PostService.list({ communityId: community.id })
  return NextResponse.json({ posts, community })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json().catch(() => ({}))
  try {
    const community = await CommunityService.getBySlug(slug)
    if (!community) return NextResponse.json({ error: 'Comunidad no encontrada' }, { status: 404 })
    if (!community.joined) return NextResponse.json({ error: 'Debes unirte a la comunidad para publicar' }, { status: 403 })

    const post = await PostService.create({
      content: body.content ?? '',
      image: body.image ?? null,
      communityId: community.id,
      mediaType: body.mediaType ?? null,
      mediaUrl: body.mediaUrl ?? null,
      mediaDuration: body.mediaDuration ?? null,
    })
    return NextResponse.json({ post: { ...post, liked: false, canEdit: true, canDelete: true } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
