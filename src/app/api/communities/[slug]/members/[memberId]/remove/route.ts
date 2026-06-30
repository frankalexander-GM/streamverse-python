import { NextRequest, NextResponse } from 'next/server'
import { CommunityService } from '@/lib/services'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; memberId: string }> }) {
  const { slug, memberId } = await params
  try {
    const result = await CommunityService.removeMember(slug, memberId)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
