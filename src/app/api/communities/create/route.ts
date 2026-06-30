import { NextRequest, NextResponse } from 'next/server'
import { CommunityService } from '@/lib/services'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  try {
    const community = await CommunityService.create({
      name: body.name ?? '',
      description: body.description ?? '',
      category: body.category ?? 'general',
      color: body.color,
      banner: body.banner ?? null,
      icon: body.icon ?? null,
    })
    return NextResponse.json({ community })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
