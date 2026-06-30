import { NextRequest, NextResponse } from 'next/server'
import { CommunityService } from '@/lib/services'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const result = await CommunityService.delete(slug)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json().catch(() => ({}))
  try {
    const community = await CommunityService.update(slug, {
      name: body.name,
      description: body.description,
      banner: body.banner,
      icon: body.icon,
    })
    return NextResponse.json({ community })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
