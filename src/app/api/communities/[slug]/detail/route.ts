import { NextRequest, NextResponse } from 'next/server'
import { CommunityService } from '@/lib/services'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const community = await CommunityService.getBySlug(slug)
  if (!community) return NextResponse.json({ error: 'Comunidad no encontrada' }, { status: 404 })
  return NextResponse.json({ community })
}
