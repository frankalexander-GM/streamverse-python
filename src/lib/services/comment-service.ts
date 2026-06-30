import { db } from '@/lib/db'

/**
 * Servicio de comentarios: lógica de negocio para comentarios en publicaciones.
 */
export class CommentService {
  /** Lista los comentarios de un post. */
  static async listByPost(postId: string) {
    return db.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true, isStreamer: true } },
      },
    })
  }

  /** Crea un comentario en un post. */
  static async create(postId: string, content: string) {
    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) throw new Error('Usuario no encontrado')
    const trimmed = content.trim()
    if (!trimmed) throw new Error('El comentario no puede estar vacío')

    const post = await db.post.findUnique({ where: { id: postId } })
    if (!post) throw new Error('Publicación no encontrada')

    const comment = await db.comment.create({
      data: { postId, authorId: currentUser.id, content: trimmed.slice(0, 500) },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true, isStreamer: true } },
      },
    })
    // Incrementar contador
    await db.post.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } })
    return comment
  }

  /** Elimina un comentario (el autor o el admin de la comunidad/grupo). */
  static async delete(commentId: string) {
    const currentUser = await db.user.findUnique({ where: { username: 'tu' } })
    if (!currentUser) throw new Error('Usuario no encontrado')

    const comment = await db.comment.findUnique({ where: { id: commentId }, include: { post: true } })
    if (!comment) throw new Error('Comentario no encontrado')

    // El autor puede eliminar su comentario
    if (comment.authorId === currentUser.id) {
      await db.comment.delete({ where: { id: commentId } })
      await db.post.update({ where: { id: comment.postId }, data: { commentsCount: { decrement: 1 } } })
      return { success: true }
    }

    // Si el post está en una comunidad, el creador de la comunidad puede eliminarlo
    if (comment.post?.communityId) {
      const community = await db.community.findUnique({ where: { id: comment.post.communityId } })
      if (community?.creatorId === currentUser.id) {
        await db.comment.delete({ where: { id: commentId } })
        await db.post.update({ where: { id: comment.postId }, data: { commentsCount: { decrement: 1 } } })
        return { success: true }
      }
    }

    throw new Error('No tienes permiso para eliminar este comentario')
  }
}
