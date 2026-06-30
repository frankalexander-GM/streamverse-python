import { db } from '@/lib/db'

const MAX_CLIP_DURATION = 30
const MAX_POST_LENGTH = 1000

/**
 * Servicio de publicaciones: lógica de negocio para posts y likes.
 * Soporta posts con media (foto o clip de máximo 30s), edición y eliminación.
 */
export class PostService {
  /**
   * Lista publicaciones.
   * - Si communityId se pasa: solo posts de esa comunidad.
   * - Si authorId se pasa: solo posts de ese autor.
   * - Sin filtros: feed global.
   */
  static async list(opts?: { authorId?: string; communityId?: string }) {
    const where: any = {}
    if (opts?.authorId) where.authorId = opts.authorId
    if (opts?.communityId) where.communityId = opts.communityId

    const posts = await db.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true, isStreamer: true } },
        community: { select: { id: true, name: true, slug: true, color: true } },
      },
    })

    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser || posts.length === 0) return posts.map((p) => ({ ...p, liked: false, canEdit: false, canDelete: false }))

    const likes = await db.like.findMany({
      where: { userId: currentUser.id, postId: { in: posts.map((p) => p.id) } },
      select: { postId: true },
    })
    const likedSet = new Set(likes.map((l) => l.postId))
    return posts.map((p) => ({
      ...p,
      liked: likedSet.has(p.id),
      canEdit: p.authorId === currentUser.id,
      canDelete: p.authorId === currentUser.id,
    }))
  }

  /** Crea una publicación (opcionalmente con media y/o dentro de una comunidad). */
  static async create(opts: {
    content: string
    image?: string | null
    communityId?: string | null
    mediaType?: 'image' | 'video' | null
    mediaUrl?: string | null
    mediaDuration?: number | null
  }) {
    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) throw new Error('Usuario no encontrado')
    const trimmed = (opts.content || '').trim()
    if (!trimmed && !opts.mediaUrl) throw new Error('El contenido o un archivo es obligatorio')

    // Validar duración del clip (máx 30s)
    let mediaDuration = opts.mediaDuration ?? null
    if (mediaDuration !== null && mediaDuration > MAX_CLIP_DURATION) {
      throw new Error(`El clip no puede durar más de ${MAX_CLIP_DURATION} segundos`)
    }

    return db.post.create({
      data: {
        authorId: currentUser.id,
        content: trimmed.slice(0, MAX_POST_LENGTH),
        image: opts.image || null,
        mediaType: opts.mediaType || null,
        mediaUrl: opts.mediaUrl || null,
        mediaDuration,
        communityId: opts.communityId || null,
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true, isStreamer: true } },
        community: { select: { id: true, name: true, slug: true, color: true } },
      },
    })
  }

  /** Edita una publicación (solo el autor): contenido + media. */
  static async update(postId: string, data: {
    content: string
    mediaType?: 'image' | 'video' | null
    mediaUrl?: string | null
    mediaDuration?: number | null
  }) {
    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) throw new Error('Usuario no encontrado')

    const post = await db.post.findUnique({ where: { id: postId } })
    if (!post) throw new Error('Publicación no encontrada')
    if (post.authorId !== currentUser.id) throw new Error('No tienes permiso para editar esta publicación')

    const trimmed = data.content.trim()
    if (!trimmed && !data.mediaUrl) throw new Error('El contenido no puede estar vacío')

    const updateData: any = { content: trimmed.slice(0, MAX_POST_LENGTH) }
    if (data.mediaType !== undefined) updateData.mediaType = data.mediaType
    if (data.mediaUrl !== undefined) updateData.mediaUrl = data.mediaUrl
    if (data.mediaDuration !== undefined) updateData.mediaDuration = data.mediaDuration

    return db.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true, isStreamer: true } },
        community: { select: { id: true, name: true, slug: true, color: true } },
      },
    })
  }

  /** Elimina una publicación (el autor o el creador de la comunidad). */
  static async delete(postId: string) {
    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) throw new Error('Usuario no encontrado')

    const post = await db.post.findUnique({ where: { id: postId } })
    if (!post) throw new Error('Publicación no encontrada')

    // Autor puede eliminar su post
    if (post.authorId === currentUser.id) {
      await db.post.delete({ where: { id: postId } })
      return { success: true }
    }

    // Si el post está en una comunidad, el creador de la comunidad también puede eliminarlo
    if (post.communityId) {
      const community = await db.community.findUnique({ where: { id: post.communityId } })
      if (community?.creatorId === currentUser.id) {
        await db.post.delete({ where: { id: postId } })
        return { success: true }
      }
    }

    throw new Error('No tienes permiso para eliminar esta publicación')
  }

  /** Toggle like en una publicación. */
  static async toggleLike(postId: string) {
    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) throw new Error('Usuario no encontrado')

    const post = await db.post.findUnique({ where: { id: postId } })
    if (!post) throw new Error('Publicación no encontrada')

    const existing = await db.like.findUnique({
      where: { userId_postId: { userId: currentUser.id, postId } },
    })

    if (existing) {
      await db.$transaction([
        db.like.delete({ where: { userId_postId: { userId: currentUser.id, postId } } }),
        db.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } }),
      ])
      return { liked: false, likesCount: Math.max(0, post.likesCount - 1) }
    }

    await db.$transaction([
      db.like.create({ data: { userId: currentUser.id, postId } }),
      db.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } }),
    ])
    return { liked: true, likesCount: post.likesCount + 1 }
  }
}
