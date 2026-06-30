import { db } from '@/lib/db'

/**
 * Servicio de comunidades: lógica de negocio para listar/unirse/salir/detalle/CRUD.
 */
export class CommunityService {
  /** Lista todas las comunidades con el estado de membresía del usuario actual. */
  static async listAll() {
    const communities = await db.community.findMany({ orderBy: { membersCount: 'desc' } })
    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) return communities.map((c) => ({ ...c, joined: false, canManage: false }))

    const memberships = await db.communityMember.findMany({
      where: { userId: currentUser.id },
      select: { communityId: true },
    })
    const joinedSet = new Set(memberships.map((m) => m.communityId))
    return communities.map((c) => ({
      ...c,
      joined: joinedSet.has(c.id),
      canManage: c.creatorId === currentUser.id,
    }))
  }

  /** Obtiene el detalle de una comunidad por slug + miembros recientes + estado. */
  static async getBySlug(slug: string) {
    const community = await db.community.findUnique({ where: { slug } })
    if (!community) return null

    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    const joined = currentUser
      ? !!(await db.communityMember.findUnique({
          where: { userId_communityId: { userId: currentUser.id, communityId: community.id } },
        }))
      : false

    // Todos los miembros (para que el admin los gestione) — limitamos a 50
    const allMembers = await db.communityMember.findMany({
      where: { communityId: community.id },
      take: 50,
      orderBy: { joinedAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatar: true, isStreamer: true },
        },
      },
    })

    return {
      ...community,
      joined,
      canManage: !!currentUser && community.creatorId === currentUser.id,
      recentMembers: allMembers.slice(0, 8).map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt })),
      allMembers: allMembers.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt })),
    }
  }

  /** Une o saca al usuario actual de una comunidad por slug. */
  static async toggleMembership(slug: string, action: 'join' | 'leave') {
    const community = await db.community.findUnique({ where: { slug } })
    if (!community) throw new Error('Comunidad no encontrada')

    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) throw new Error('Usuario no encontrado')

    const existing = await db.communityMember.findUnique({
      where: { userId_communityId: { userId: currentUser.id, communityId: community.id } },
    })

    if (action === 'join' && !existing) {
      await db.communityMember.create({ data: { userId: currentUser.id, communityId: community.id } })
      await db.community.update({ where: { id: community.id }, data: { membersCount: { increment: 1 } } })
      return { joined: true, membersCount: community.membersCount + 1 }
    }

    if (action === 'leave' && existing) {
      await db.communityMember.delete({
        where: { userId_communityId: { userId: currentUser.id, communityId: community.id } },
      })
      await db.community.update({ where: { id: community.id }, data: { membersCount: { decrement: 1 } } })
      return { joined: false, membersCount: Math.max(0, community.membersCount - 1) }
    }

    return { joined: !!existing, membersCount: community.membersCount }
  }

  /** Crea una nueva comunidad (de usuario, no oficial). */
  static async create(data: {
    name: string
    description: string
    category: string
    color?: string
    banner?: string | null  // URL de imagen subida
    icon?: string | null    // URL de imagen subida
  }) {
    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) throw new Error('Usuario no encontrado')

    const name = data.name.trim()
    if (name.length < 3) throw new Error('El nombre debe tener al menos 3 caracteres')
    if (name.length > 40) throw new Error('El nombre no puede tener más de 40 caracteres')
    if (data.description.trim().length < 10) throw new Error('La descripción debe tener al menos 10 caracteres')

    // Generar slug único
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'comunidad'
    let slug = baseSlug
    let suffix = 1
    while (await db.community.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`
    }

    const color = data.color || '#a855f7'
    // Icono: usar el subido, o generar un gradiente con la inicial
    const fallbackIcon = (() => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${color}'/><stop offset='1' stop-color='${color}66'/></linearGradient></defs><rect width='400' height='400' fill='url(#g)'/><text x='50%' y='52%' font-family='sans-serif' font-size='180' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='middle'>${name.charAt(0).toUpperCase()}</text></svg>`
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    })()

    return db.community.create({
      data: {
        name,
        slug,
        description: data.description.trim().slice(0, 200),
        icon: data.icon || fallbackIcon,
        banner: data.banner || null,
        category: data.category,
        color,
        isOfficial: false,
        creatorId: currentUser.id,
        membersCount: 1,
      },
    })
  }

  /** Elimina una comunidad (solo el creador). */
  static async delete(slug: string) {
    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) throw new Error('Usuario no encontrado')

    const community = await db.community.findUnique({ where: { slug } })
    if (!community) throw new Error('Comunidad no encontrada')
    if (community.creatorId !== currentUser.id) throw new Error('No tienes permiso para eliminar esta comunidad')
    if (community.isOfficial) throw new Error('No se pueden eliminar comunidades oficiales')

    await db.community.delete({ where: { id: community.id } })
    return { success: true }
  }

  /** Actualiza una comunidad (solo el creador). */
  static async update(slug: string, data: { name?: string; description?: string; banner?: string | null; icon?: string | null }) {
    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) throw new Error('Usuario no encontrado')

    const community = await db.community.findUnique({ where: { slug } })
    if (!community) throw new Error('Comunidad no encontrada')
    if (community.creatorId !== currentUser.id) throw new Error('No tienes permiso para editar esta comunidad')

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name.trim().slice(0, 40)
    if (data.description !== undefined) updateData.description = data.description.trim().slice(0, 200)
    if (data.banner !== undefined) updateData.banner = data.banner
    if (data.icon !== undefined) updateData.icon = data.icon

    return db.community.update({ where: { id: community.id }, data: updateData })
  }

  /** Elimina un miembro de la comunidad (solo el admin/creador). */
  static async removeMember(slug: string, memberId: string) {
    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) throw new Error('Usuario no encontrado')

    const community = await db.community.findUnique({ where: { slug } })
    if (!community) throw new Error('Comunidad no encontrada')
    if (community.creatorId !== currentUser.id) throw new Error('Solo el administrador puede eliminar miembros')
    if (memberId === currentUser.id) throw new Error('No puedes eliminarte a ti mismo como administrador')

    const membership = await db.communityMember.findUnique({
      where: { userId_communityId: { userId: memberId, communityId: community.id } },
    })
    if (!membership) throw new Error('El usuario no es miembro de esta comunidad')

    await db.communityMember.delete({
      where: { userId_communityId: { userId: memberId, communityId: community.id } },
    })
    await db.community.update({
      where: { id: community.id },
      data: { membersCount: { decrement: 1 } },
    })
    return { success: true, membersCount: Math.max(0, community.membersCount - 1) }
  }
}
