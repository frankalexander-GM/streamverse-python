'use client'

import { useAppStore } from '@/lib/store'
import { SectionHeading } from '@/components/shared/badges'
import { FrameAvatar } from '@/components/shared/frame-avatar'
import { ImageWithLightbox } from '@/components/shared/image-lightbox'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Users,
  UsersRound,
  Check,
  UserPlus,
  UserMinus,
  Heart,
  MessageCircle,
  Send,
  Crown,
  Flame,
  Image as ImageIcon,
  Film,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Flag,
  Bookmark,
  Link2,
  Share2,
  Upload,
  Loader2,
  X,
  ShieldCheck,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatCount, timeAgo, categoryLabels } from '@/lib/format'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface RecentMember {
  id: string
  username: string
  displayName: string
  avatar: string | null
  isStreamer: boolean
  role: string
  joinedAt: string
}

interface Group {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  banner: string | null
  category: string
  color: string
  membersCount: number
  joined: boolean
  isOfficial?: boolean
  canManage?: boolean
  recentMembers: RecentMember[]
  allMembers?: RecentMember[]
}

interface PostAuthor {
  id: string
  username: string
  displayName: string
  avatar: string | null
  isStreamer: boolean
}

interface Post {
  id: string
  content: string
  image: string | null
  mediaType: 'image' | 'video' | null
  mediaUrl: string | null
  mediaDuration: number | null
  likesCount: number
  commentsCount: number
  createdAt: string
  liked: boolean
  canEdit: boolean
  canDelete: boolean
  author: PostAuthor
  community?: { id: string; name: string; slug: string; color: string } | null
}

interface Comment {
  id: string
  content: string
  createdAt: string
  author: PostAuthor
}

type MediaMode = 'none' | 'image' | 'video'

export function GroupDetailView() {
  const activeCommunitySlug = useAppStore((s) => s.activeCommunitySlug)
  const setView = useAppStore((s) => s.setView)
  const openProfile = useAppStore((s) => s.openProfile)
  const currentUser = useAppStore((s) => s.currentUser)

  const [group, setGroup] = useState<Group | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [joinPending, setJoinPending] = useState(false)
  const [posting, setPosting] = useState(false)
  const [likingId, setLikingId] = useState<string | null>(null)

  // Create-post form state
  const [newPost, setNewPost] = useState('')
  const [mediaMode, setMediaMode] = useState<MediaMode>('none')
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaDuration, setMediaDuration] = useState(30)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit post dialog state
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editPending, setEditPending] = useState(false)
  const [editingMediaType, setEditingMediaType] = useState<'image' | 'video' | null>(null)
  const [editingMediaUrl, setEditingMediaUrl] = useState<string | null>(null)
  const [editingMediaDuration, setEditingMediaDuration] = useState(30)
  const [editUploading, setEditUploading] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Delete post dialog state
  const [deletingPost, setDeletingPost] = useState<Post | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  // Edit group dialog state
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDescription, setEditGroupDescription] = useState('')
  const [editGroupBanner, setEditGroupBanner] = useState<string | null>(null)
  const [editGroupIcon, setEditGroupIcon] = useState<string | null>(null)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [iconUploading, setIconUploading] = useState(false)
  const [groupSavePending, setGroupSavePending] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)

  // Delete group dialog state
  const [showDeleteGroup, setShowDeleteGroup] = useState(false)
  const [deleteGroupPending, setDeleteGroupPending] = useState(false)

  // Remove member state
  const [memberToRemove, setMemberToRemove] = useState<RecentMember | null>(null)
  const [memberRemovePending, setMemberRemovePending] = useState(false)

  const fetchData = useCallback(async (slug: string) => {
    setLoading(true)
    setPostsLoading(true)
    try {
      const [detailRes, postsRes] = await Promise.all([
        fetch(`/api/communities/${slug}/detail`).then((r) => r.json()),
        fetch(`/api/communities/${slug}/posts`)
          .then((r) => (r.ok ? r.json() : { posts: [] }))
          .catch(() => ({ posts: [] })),
      ])
      if (detailRes && detailRes.community) {
        setGroup(detailRes.community as Group)
      } else {
        setGroup(null)
      }
      setPosts((postsRes && postsRes.posts) || [])
    } catch {
      setGroup(null)
      setPosts([])
      toast.error('Error cargando el grupo')
    } finally {
      setLoading(false)
      setPostsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!activeCommunitySlug) {
      setLoading(false)
      setPostsLoading(false)
      setGroup(null)
      setPosts([])
      return
    }
    fetchData(activeCommunitySlug)
  }, [activeCommunitySlug, fetchData])

  async function toggleJoin() {
    if (!group || joinPending) return
    const action = group.joined ? 'leave' : 'join'
    const prevJoined = group.joined
    const prevCount = group.membersCount
    setJoinPending(true)
    setGroup({
      ...group,
      joined: action === 'join',
      membersCount: Math.max(0, group.membersCount + (action === 'join' ? 1 : -1)),
    })
    try {
      const res = await fetch(`/api/communities/${group.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setGroup((c) => (c ? { ...c, joined: data.joined, membersCount: data.membersCount } : c))
      toast.success(
        data.joined ? `Te uniste a ${group.name}` : `Saliste de ${group.name}`,
      )
    } catch {
      setGroup((c) => (c ? { ...c, joined: prevJoined, membersCount: prevCount } : c))
      toast.error('Ocurrió un error')
    } finally {
      setJoinPending(false)
    }
  }

  function resetCreateForm() {
    setNewPost('')
    setMediaMode('none')
    setMediaUrl(null)
    setMediaDuration(30)
    setUploading(false)
  }

  function selectMediaMode(mode: MediaMode) {
    if (mode === mediaMode) return
    setMediaMode(mode)
    setMediaUrl(null)
  }

  async function handleFileSelect(file: File) {
    if (!mediaMode || mediaMode === 'none') return
    const type: 'image' | 'video' = mediaMode === 'image' ? 'image' : 'video'
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    setUploading(true)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMediaUrl(data.url as string)
      toast.success(type === 'image' ? 'Foto lista para publicar' : 'Clip listo para publicar')
    } catch (e: any) {
      toast.error(e.message || 'Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  async function submitPost() {
    if (!group || posting) return
    const content = newPost.trim()
    const url = mediaUrl
    const hasMedia = mediaMode !== 'none' && !!url

    if (!content && !hasMedia) {
      toast.error('Escribe algo o añade un media para publicar')
      return
    }
    if (!group.joined) {
      toast.error('Debes unirte para publicar')
      return
    }
    if (uploading) {
      toast.error('Espera a que termine la subida del archivo')
      return
    }
    if (mediaMode === 'video' && hasMedia && (mediaDuration < 1 || mediaDuration > 30)) {
      toast.error('La duración del clip debe ser entre 1 y 30 segundos')
      return
    }

    setPosting(true)
    try {
      const body: {
        content: string
        mediaType?: 'image' | 'video'
        mediaUrl?: string
        mediaDuration?: number
      } = { content }
      if (mediaMode === 'image' && url) {
        body.mediaType = 'image'
        body.mediaUrl = url
      } else if (mediaMode === 'video' && url) {
        body.mediaType = 'video'
        body.mediaUrl = url
        body.mediaDuration = mediaDuration
      }

      const res = await fetch(`/api/communities/${group.slug}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo publicar')
      }
      const data = await res.json()
      if (data.post) {
        setPosts((prev) => [data.post as Post, ...prev])
        resetCreateForm()
        toast.success(
          hasMedia && mediaMode === 'video'
            ? 'Clip publicado'
            : hasMedia
              ? 'Foto publicada'
              : 'Publicación creada',
        )
      }
    } catch (e: any) {
      toast.error(e.message || 'No se pudo publicar')
    } finally {
      setPosting(false)
    }
  }

  async function toggleLike(postId: string) {
    const post = posts.find((p) => p.id === postId)
    if (!post || likingId === postId) return
    setLikingId(postId)
    const prevLiked = post.liked
    const prevCount = post.likesCount
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !prevLiked,
              likesCount: Math.max(0, p.likesCount + (prevLiked ? -1 : 1)),
            }
          : p,
      ),
    )
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, liked: data.liked, likesCount: data.likesCount } : p,
        ),
      )
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, liked: prevLiked, likesCount: prevCount } : p)),
      )
      toast.error('No se pudo actualizar')
    } finally {
      setLikingId(null)
    }
  }

  function openEdit(post: Post) {
    setEditingPost(post)
    setEditContent(post.content)
    setEditingMediaType(post.mediaType)
    setEditingMediaUrl(post.mediaUrl)
    setEditingMediaDuration(post.mediaDuration ?? 30)
  }

  async function handleEditFileUpload(file: File) {
    if (!editingMediaType) return
    const type: 'image' | 'video' = editingMediaType === 'image' ? 'image' : 'video'
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    setEditUploading(true)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditingMediaUrl(data.url as string)
      toast.success('Archivo subido')
    } catch (e: any) {
      toast.error(e.message || 'Error al subir')
    } finally {
      setEditUploading(false)
    }
  }

  async function submitEdit() {
    if (!editingPost || editPending) return
    const content = editContent.trim()
    if (!content && !editingMediaUrl) {
      toast.error('El contenido no puede estar vacío')
      return
    }
    if (editUploading) {
      toast.error('Espera a que termine la subida del archivo')
      return
    }
    if (
      editingMediaType === 'video' &&
      editingMediaUrl &&
      (editingMediaDuration < 1 || editingMediaDuration > 30)
    ) {
      toast.error('La duración del clip debe ser entre 1 y 30 segundos')
      return
    }
    setEditPending(true)
    try {
      const body: {
        content: string
        mediaType?: 'image' | 'video' | null
        mediaUrl?: string | null
        mediaDuration?: number
      } = { content }
      if (editingMediaType && editingMediaUrl) {
        body.mediaType = editingMediaType
        body.mediaUrl = editingMediaUrl
        if (editingMediaType === 'video') body.mediaDuration = editingMediaDuration
      } else {
        body.mediaType = null
        body.mediaUrl = null
      }
      const res = await fetch(`/api/posts/${editingPost.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo editar')
      }
      const data = await res.json()
      if (data.post) {
        const updated = data.post as Post
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
        setEditingPost(null)
        toast.success('Publicación actualizada')
      }
    } catch (e: any) {
      toast.error(e.message || 'No se pudo editar')
    } finally {
      setEditPending(false)
    }
  }

  function openDelete(post: Post) {
    setDeletingPost(post)
  }

  async function confirmDelete() {
    if (!deletingPost || deletePending) return
    const id = deletingPost.id
    setDeletePending(true)
    try {
      const res = await fetch(`/api/posts/${id}/delete`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo eliminar')
      }
      setPosts((prev) => prev.filter((p) => p.id !== id))
      setDeletingPost(null)
      toast.success('Publicación eliminada')
    } catch (e: any) {
      toast.error(e.message || 'No se pudo eliminar')
    } finally {
      setDeletePending(false)
    }
  }

  function copyPostLink(post: Post) {
    const slug = post.community?.slug || group?.slug || ''
    const link = `${window.location.origin}/g/${slug}/p/${post.id}`
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(link)
        .then(() => toast.success('Enlace copiado'))
        .catch(() => toast.info(`Enlace: ${link}`))
    } else {
      toast.info(`Enlace: ${link}`)
    }
  }

  function sharePost(post: Post) {
    const slug = post.community?.slug || group?.slug || ''
    const link = `${window.location.origin}/g/${slug}/p/${post.id}`
    const shareData: ShareData = {
      title: `${group?.name ?? 'StreamVerse'} · Publicación de ${post.author.displayName}`,
      text: post.content?.slice(0, 120) || `Mira esta publicación en ${group?.name ?? 'StreamVerse'}`,
      url: link,
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share(shareData)
        .then(() => toast.success('Compartido'))
        .catch(() => {
          /* user cancelled — no toast */
        })
    } else {
      // Fallback: copy to clipboard
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(link)
          .then(() => toast.success('Enlace copiado para compartir'))
          .catch(() => toast.info(`Enlace: ${link}`))
      } else {
        toast.info(`Enlace: ${link}`)
      }
    }
  }

  // ---------- Edit group ----------

  function openEditGroup() {
    if (!group) return
    setEditGroupName(group.name)
    setEditGroupDescription(group.description)
    setEditGroupBanner(group.banner)
    setEditGroupIcon(group.icon && !group.icon.startsWith('data:') ? group.icon : null)
    setShowEditGroup(true)
  }

  async function handleGroupImageUpload(file: File, kind: 'banner' | 'icon') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'image')
    if (kind === 'banner') setBannerUploading(true)
    else setIconUploading(true)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (kind === 'banner') setEditGroupBanner(data.url as string)
      else setEditGroupIcon(data.url as string)
      toast.success(kind === 'banner' ? 'Banner actualizado' : 'Icono actualizado')
    } catch (e: any) {
      toast.error(e.message || 'Error al subir imagen')
    } finally {
      if (kind === 'banner') setBannerUploading(false)
      else setIconUploading(false)
    }
  }

  async function submitEditGroup() {
    if (!group || groupSavePending) return
    const name = editGroupName.trim()
    if (!name) {
      toast.error('El nombre no puede estar vacío')
      return
    }
    if (bannerUploading || iconUploading) {
      toast.error('Espera a que termine la subida de la imagen')
      return
    }
    setGroupSavePending(true)
    try {
      const body = {
        name,
        description: editGroupDescription.trim(),
        banner: editGroupBanner,
        icon: editGroupIcon,
      }
      const res = await fetch(`/api/communities/${group.slug}/delete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo actualizar')
      }
      const data = await res.json()
      setGroup((c) => {
        if (!c) return c
        if (data.community) {
          return { ...c, ...data.community }
        }
        return {
          ...c,
          name: body.name,
          description: body.description,
          banner: body.banner,
          icon: body.icon || c.icon,
        }
      })
      setShowEditGroup(false)
      toast.success('Grupo actualizado')
    } catch (e: any) {
      toast.error(e.message || 'No se pudo actualizar')
    } finally {
      setGroupSavePending(false)
    }
  }

  // ---------- Delete group ----------

  async function confirmDeleteGroup() {
    if (!group || deleteGroupPending) return
    setDeleteGroupPending(true)
    try {
      const res = await fetch(`/api/communities/${group.slug}/delete`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo eliminar')
      }
      const data = await res.json()
      if (!data.success) throw new Error()
      toast.success('Grupo eliminado')
      setShowDeleteGroup(false)
      setView('groups')
    } catch (e: any) {
      toast.error(e.message || 'No se pudo eliminar el grupo')
    } finally {
      setDeleteGroupPending(false)
    }
  }

  // ---------- Remove member ----------

  function openRemoveMember(member: RecentMember) {
    setMemberToRemove(member)
  }

  async function confirmRemoveMember() {
    if (!group || !memberToRemove || memberRemovePending) return
    const memberId = memberToRemove.id
    setMemberRemovePending(true)
    try {
      const res = await fetch(
        `/api/communities/${group.slug}/members/${memberId}/remove`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo eliminar')
      }
      const data = await res.json()
      setGroup((c) => {
        if (!c) return c
        const newAllMembers = (c.allMembers || []).filter((m) => m.id !== memberId)
        const newRecent = (c.recentMembers || []).filter((m) => m.id !== memberId)
        return {
          ...c,
          allMembers: newAllMembers,
          recentMembers: newRecent,
          membersCount:
            typeof data.membersCount === 'number'
              ? data.membersCount
              : Math.max(0, c.membersCount - 1),
        }
      })
      setMemberToRemove(null)
      toast.success('Miembro eliminado del grupo')
    } catch (e: any) {
      toast.error(e.message || 'No se pudo eliminar')
    } finally {
      setMemberRemovePending(false)
    }
  }

  // Null slug → not found state
  if (!loading && !activeCommunitySlug) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setView('groups')}
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Grupos
        </Button>
        <Card className="grid-bg flex flex-col items-center justify-center border-border/50 bg-card/50 p-12 text-center">
          <div className="relative mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
              <Search className="h-8 w-8" />
            </div>
            <div className="absolute -inset-2 -z-10 rounded-3xl bg-emerald-500/10 blur-xl" />
          </div>
          <h3 className="mb-1 text-lg font-bold">Grupo no encontrado</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Selecciona un grupo desde el listado para ver su detalle, publicaciones y miembros.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5 border-border/60 bg-card/40 backdrop-blur"
            onClick={() => setView('groups')}
          >
            <UsersRound className="h-3.5 w-3.5" /> Explorar grupos
          </Button>
        </Card>
      </div>
    )
  }

  const hasText = newPost.trim().length > 0
  const hasMedia = mediaMode !== 'none' && !!mediaUrl
  const canSubmit = (hasText || hasMedia) && !posting && !uploading

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => setView('groups')}
      >
        <ArrowLeft className="h-4 w-4" /> Volver a Grupos
      </Button>

      {loading || !group ? (
        <GroupDetailSkeleton />
      ) : (
        <>
          {/* GROUP HEADER */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <Card className="relative mb-6 overflow-hidden border-border/50 bg-card/50 p-0">
              {/* Banner */}
              <div className="relative h-40 overflow-hidden sm:h-52">
                {group.banner ? (
                  <motion.img
                    src={group.banner}
                    alt=""
                    initial={{ scale: 1.08 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{
                      background: `linear-gradient(135deg, ${group.color}, ${group.color}33)`,
                    }}
                  />
                )}
                {/* Color overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, ${group.color}cc 0%, ${group.color}44 45%, transparent 75%)`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                <div className="absolute inset-0 grid-bg opacity-30" />
                <div
                  className="absolute -top-12 -right-12 h-48 w-48 rounded-full opacity-30 blur-3xl"
                  style={{ backgroundColor: group.color }}
                />
                {/* Category badge top-right */}
                <div className="absolute right-3 top-3 flex items-center gap-1.5">
                  <Badge className="border-border/40 bg-black/40 text-white backdrop-blur-md">
                    <Flame className="h-3 w-3" /> {categoryLabels[group.category] || group.category}
                  </Badge>
                  {group.canManage && (
                    <Badge className="border-amber-400/50 bg-amber-400/25 text-amber-200 backdrop-blur-md">
                      <ShieldCheck className="h-3 w-3" /> Admin
                    </Badge>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="px-4 pb-5 sm:px-6">
                <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end">
                  {/* Icon square */}
                  <div
                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-card text-3xl font-extrabold text-white shadow-lg sm:h-24 sm:w-24 sm:text-4xl"
                    style={{
                      background: `linear-gradient(135deg, ${group.color}, ${group.color}aa)`,
                      boxShadow: `0 12px 32px -8px ${group.color}aa`,
                    }}
                  >
                    {group.icon && !group.icon.startsWith('data:') ? (
                      <img
                        src={group.icon}
                        alt={group.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      group.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 pt-2 sm:pb-2">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                        {group.name}
                      </h1>
                      {group.canManage && (
                        <Badge
                          className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-300"
                          style={{ boxShadow: '0 0 12px -4px rgba(245,158,11,0.6)' }}
                        >
                          <Crown className="h-3 w-3" /> ADMIN
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="border-border/60 bg-card/60 text-foreground backdrop-blur"
                      >
                        <Users className="mr-1 h-3 w-3 text-emerald-400/80" />{' '}
                        {formatCount(group.membersCount)} miembros
                      </Badge>
                    </div>
                    <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                      {group.description}
                    </p>
                  </div>

                  {/* Action buttons: Edit group + Join/Leave */}
                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:pb-2">
                    {group.canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openEditGroup}
                        className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar grupo
                      </Button>
                    )}
                    {group.joined ? (
                      <Button
                        variant="outline"
                        disabled={joinPending}
                        onClick={toggleJoin}
                        className="group/join min-w-[140px] gap-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-400"
                      >
                        {joinPending ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Saliendo...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 group-hover/join:hidden" />
                            <UserMinus className="hidden h-4 w-4 group-hover/join:inline" />
                            <span className="group-hover/join:hidden">Miembro</span>
                            <span className="hidden group-hover/join:inline">Salir</span>
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        disabled={joinPending}
                        onClick={toggleJoin}
                        className="min-w-[140px] gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
                        style={{ boxShadow: '0 8px 24px -8px rgba(16,185,129,0.6)' }}
                      >
                        {joinPending ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Uniéndose...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Unirse
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Recent members row */}
                {group.recentMembers && group.recentMembers.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border/40 pt-4">
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      Miembros recientes
                    </span>
                    <div className="flex items-center -space-x-2">
                      {group.recentMembers.slice(0, 8).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => openProfile(m.id)}
                          title={m.displayName}
                          className="relative z-0 rounded-full ring-2 ring-card transition-transform hover:z-10 hover:scale-110"
                        >
                          <img
                            src={m.avatar || ''}
                            alt={m.displayName}
                            loading="lazy"
                            className="h-8 w-8 rounded-full bg-card object-cover"
                          />
                          {m.isStreamer && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-card bg-amber-400">
                              <Crown className="h-2 w-2 text-black" />
                            </span>
                          )}
                        </button>
                      ))}
                      {group.membersCount > group.recentMembers.length && (
                        <div className="z-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted/60 text-[10px] font-bold text-muted-foreground">
                          +{formatCount(group.membersCount - group.recentMembers.length)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* ADMIN: Manage members panel */}
          {group.canManage && group.allMembers && group.allMembers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mb-6"
            >
              <Card className="border-amber-500/20 bg-card/50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30">
                      <Users className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold">Gestionar miembros</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {group.allMembers.length} miembro
                        {group.allMembers.length === 1 ? '' : 's'} en total · puedes
                        eliminar a quien rompa las reglas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteGroup(true)}
                      className="gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar grupo
                    </Button>
                    <Badge className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-300">
                      <Crown className="h-2.5 w-2.5" /> Admin
                    </Badge>
                  </div>
                </div>
                <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                  {group.allMembers.map((m) => {
                    const isSelf = m.id === currentUser?.id
                    return (
                      <div
                        key={m.id}
                        className="group flex items-center gap-3 rounded-lg border border-transparent bg-background/30 px-2.5 py-2 transition-all hover:border-border/60 hover:bg-background/50"
                      >
                        <button
                          onClick={() => openProfile(m.id)}
                          className="relative shrink-0 rounded-full"
                          title={m.displayName}
                        >
                          <img
                            src={m.avatar || ''}
                            alt={m.displayName}
                            loading="lazy"
                            className="h-9 w-9 rounded-full bg-card object-cover ring-1 ring-border/60"
                          />
                          {m.isStreamer && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-card bg-amber-400">
                              <Crown className="h-2 w-2 text-black" />
                            </span>
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() => openProfile(m.id)}
                              className="truncate text-sm font-semibold transition-colors hover:text-emerald-400"
                            >
                              {m.displayName}
                            </button>
                            {isSelf && (
                              <Badge className="h-4 gap-0.5 border border-amber-500/40 bg-amber-500/20 px-1.5 text-[9px] font-bold text-amber-300">
                                <Crown className="h-2.5 w-2.5" /> ADMIN
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            @{m.username} · se unió {timeAgo(m.joinedAt)}
                          </p>
                        </div>
                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRemoveMember(m)}
                            className="h-8 shrink-0 gap-1 px-2 text-xs text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            </motion.div>
          )}

          {/* POSTS SECTION */}
          <section>
            <SectionHeading
              title="Publicaciones"
              subtitle="Lo que está pasando en el grupo"
              icon={MessageCircle}
              action={
                <Badge
                  variant="outline"
                  className="hidden border-border/60 bg-card/40 text-muted-foreground sm:inline-flex"
                >
                  {formatCount(posts.length)}{' '}
                  {posts.length === 1 ? 'publicación' : 'publicaciones'}
                </Badge>
              }
            />

            {/* Create post box (only if joined) */}
            {group.joined ? (
              <Card
                className="sticky top-16 z-30 mb-5 border-border/50 bg-card/70 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/60"
                style={{ boxShadow: '0 0 0 1px rgba(16,185,129,0.06)' }}
              >
                <div className="flex gap-3">
                  <FrameAvatar
                    src={currentUser?.avatar || null}
                    fallback={currentUser?.displayName || 'Tú'}
                    size="sm"
                    ring={currentUser?.isStreamer}
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <Textarea
                      placeholder={`Comparte algo con ${group.name}...`}
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value.slice(0, 1000))}
                      rows={2}
                      className="min-h-[60px] resize-none border-border/60 bg-background/50"
                    />

                    {/* Media toggle pills */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <MediaPill
                        active={mediaMode === 'none'}
                        onClick={() => selectMediaMode('none')}
                        icon={X}
                        label="Sin media"
                        activeClass="border-border bg-muted/60 text-foreground"
                      />
                      <MediaPill
                        active={mediaMode === 'image'}
                        onClick={() => selectMediaMode('image')}
                        icon={ImageIcon}
                        label="Foto"
                        activeClass="border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      />
                      <MediaPill
                        active={mediaMode === 'video'}
                        onClick={() => selectMediaMode('video')}
                        icon={Film}
                        label="Clip (30s)"
                        activeClass="border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                      />
                    </div>

                    {/* Hidden file input shared for image & video uploads */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={mediaMode === 'image' ? 'image/*' : 'video/*'}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleFileSelect(f)
                        e.target.value = ''
                      }}
                    />

                    {/* Media upload zones & mini previews */}
                    <AnimatePresence initial={false}>
                      {mediaMode === 'image' && (
                        <motion.div
                          key="image-upload"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          {!mediaUrl ? (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                              className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 px-3 py-3 text-left transition-all hover:border-emerald-500/70 hover:bg-emerald-500/10 disabled:cursor-wait disabled:opacity-70"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                                {uploading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ImageIcon className="h-4 w-4" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-foreground">
                                  {uploading
                                    ? 'Subiendo foto...'
                                    : 'Sube una foto desde tu biblioteca'}
                                </span>
                                <span className="block text-[11px] text-muted-foreground">
                                  JPG, PNG, WebP o GIF · máximo 5MB
                                </span>
                              </span>
                              {!uploading && (
                                <Upload className="h-4 w-4 shrink-0 text-emerald-300" />
                              )}
                            </button>
                          ) : (
                            <div className="mt-2 inline-flex items-center gap-2">
                              <div className="relative h-24 w-32 overflow-hidden rounded-lg border border-emerald-500/40 bg-black/40 shadow-lg shadow-emerald-500/10">
                                <img
                                  src={mediaUrl}
                                  alt="Vista previa de la foto"
                                  className="h-full w-full object-cover"
                                />
                                <span className="pointer-events-none absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg backdrop-blur">
                                  <ImageIcon className="h-2 w-2" /> Foto
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setMediaUrl(null)}
                                  aria-label="Quitar foto"
                                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur transition-colors hover:bg-red-500/90"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-[11px] font-medium text-emerald-300 underline-offset-2 hover:underline"
                              >
                                Cambiar
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                      {mediaMode === 'video' && (
                        <motion.div
                          key="video-upload"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          {!mediaUrl ? (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                              className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 px-3 py-3 text-left transition-all hover:border-cyan-500/70 hover:bg-cyan-500/10 disabled:cursor-wait disabled:opacity-70"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
                                {uploading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Film className="h-4 w-4" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-foreground">
                                  {uploading
                                    ? 'Subiendo clip...'
                                    : 'Sube un clip desde tu biblioteca (máx 30s)'}
                                </span>
                                <span className="block text-[11px] text-muted-foreground">
                                  MP4, WebM o MOV · máximo 25MB
                                </span>
                              </span>
                              {!uploading && (
                                <Upload className="h-4 w-4 shrink-0 text-cyan-300" />
                              )}
                            </button>
                          ) : (
                            <div className="mt-2 inline-flex items-center gap-2">
                              <div className="relative h-24 w-32 overflow-hidden rounded-lg border border-cyan-500/40 bg-black shadow-lg shadow-cyan-500/10">
                                <video
                                  src={mediaUrl}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                                <span className="pointer-events-none absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-cyan-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg backdrop-blur">
                                  <Film className="h-2 w-2" /> Clip · {mediaDuration}s
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setMediaUrl(null)}
                                  aria-label="Quitar clip"
                                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur transition-colors hover:bg-red-500/90"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-[11px] font-medium text-cyan-300 underline-offset-2 hover:underline"
                              >
                                Cambiar
                              </button>
                            </div>
                          )}
                          {/* Duration input (always visible in video mode) */}
                          <div className="mt-2 flex items-center gap-2">
                            <label className="text-[11px] text-muted-foreground">
                              Duración:
                            </label>
                            <div className="flex w-24 items-center rounded-md border border-border/60 bg-background/50 px-2">
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={mediaDuration}
                                onChange={(e) => {
                                  const v = Number(e.target.value)
                                  if (!Number.isNaN(v))
                                    setMediaDuration(Math.max(1, Math.min(30, v)))
                                }}
                                className="w-full bg-transparent text-sm outline-none tabular-nums"
                                aria-label="Duración en segundos"
                              />
                              <span className="ml-1 text-xs text-muted-foreground">s</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              · máximo 30s
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action row */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {newPost.length}/1000
                      </span>
                      <Button
                        size="sm"
                        disabled={!canSubmit}
                        onClick={submitPost}
                        className="gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
                        style={{ boxShadow: '0 6px 18px -6px rgba(16,185,129,0.6)' }}
                      >
                        {posting ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Publicando...
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            Publicar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="mb-5 flex items-center gap-3 border-dashed border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Únete para publicar</p>
                  <p className="text-xs text-muted-foreground">
                    Solo los miembros pueden compartir contenido en {group.name}.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={toggleJoin}
                  disabled={joinPending}
                  className="shrink-0 gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Unirse
                </Button>
              </Card>
            )}

            {/* Posts feed */}
            {postsLoading ? (
              <div className="grid gap-4">
                {[0, 1, 2].map((i) => (
                  <Card key={i} className="border-border/50 bg-card/50 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                    </div>
                    <Skeleton className="mb-2 h-3 w-full" />
                    <Skeleton className="mb-3 h-3 w-3/4" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card className="grid-bg flex flex-col items-center justify-center border-border/50 bg-card/50 p-12 text-center">
                <div className="relative mb-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                    <MessageCircle className="h-8 w-8" />
                  </div>
                  <div className="absolute -inset-2 -z-10 rounded-3xl bg-emerald-500/10 blur-xl" />
                </div>
                <h3 className="mb-1 text-lg font-bold">
                  Sé el primero en publicar en{' '}
                  <span className="text-emerald-400">{group.name}</span>
                </h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Aún no hay publicaciones en este grupo. ¡Comparte algo y rompe el hielo!
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {posts.map((p, i) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{
                        duration: 0.3,
                        ease: 'easeOut',
                        delay: Math.min(i * 0.04, 0.3),
                      }}
                    >
                      <PostCard
                        post={p}
                        liking={likingId === p.id}
                        onLike={() => toggleLike(p.id)}
                        onOpenProfile={() => openProfile(p.author.id)}
                        onEdit={openEdit}
                        onDelete={openDelete}
                        onCopyLink={copyPostLink}
                        onShare={sharePost}
                        canManage={group.canManage === true}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </>
      )}

      {/* EDIT POST DIALOG */}
      <Dialog open={!!editingPost} onOpenChange={(o) => !o && setEditingPost(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar publicación</DialogTitle>
            <DialogDescription>
              Modifica el texto y el contenido multimedia de tu publicación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value.slice(0, 1000))}
                rows={4}
                placeholder="Escribe tu publicación..."
                className="resize-none border-border/60 bg-background/50"
                autoFocus
              />
              <div className="flex justify-end">
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {editContent.length}/1000
                </span>
              </div>
            </div>

            {/* Media management */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Contenido multimedia
              </Label>

              {/* Hidden file input shared for image & video uploads */}
              <input
                ref={editFileInputRef}
                type="file"
                accept={editingMediaType === 'video' ? 'video/*' : 'image/*'}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleEditFileUpload(f)
                  e.target.value = ''
                }}
              />

              {editingMediaType === 'image' && editingMediaUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-emerald-500/40 bg-black/40">
                    <img
                      src={editingMediaUrl}
                      alt="Foto actual"
                      className="h-full w-full object-cover"
                    />
                    <span className="pointer-events-none absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      <ImageIcon className="h-2 w-2" /> Foto
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={editUploading || editPending}
                      className="h-7 gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                    >
                      {editUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      Cambiar foto
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingMediaType(null)
                        setEditingMediaUrl(null)
                      }}
                      disabled={editUploading || editPending}
                      className="h-7 gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                      Quitar foto
                    </Button>
                  </div>
                </div>
              ) : editingMediaType === 'video' && editingMediaUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-cyan-500/40 bg-black">
                    <video
                      src={editingMediaUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <span className="pointer-events-none absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-cyan-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      <Film className="h-2 w-2" /> Clip
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={editUploading || editPending}
                      className="h-7 gap-1.5 border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200"
                    >
                      {editUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      Cambiar clip
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingMediaType(null)
                        setEditingMediaUrl(null)
                      }}
                      disabled={editUploading || editPending}
                      className="h-7 gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                      Quitar clip
                    </Button>
                  </div>
                </div>
              ) : editingMediaType === 'image' ? (
                <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-3">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={editUploading || editPending}
                    className="flex w-full items-center gap-3 text-left transition-all hover:bg-emerald-500/10 disabled:opacity-70"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                      {editUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {editUploading ? 'Subiendo foto...' : 'Sube una foto'}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        JPG, PNG, WebP o GIF · máximo 5MB
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMediaType(null)}
                    className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Cancelar
                  </button>
                </div>
              ) : editingMediaType === 'video' ? (
                <div className="rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 p-3">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={editUploading || editPending}
                    className="flex w-full items-center gap-3 text-left transition-all hover:bg-cyan-500/10 disabled:opacity-70"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
                      {editUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Film className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {editUploading ? 'Subiendo clip...' : 'Sube un clip (máx 30s)'}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        MP4, WebM o MOV · máximo 25MB
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMediaType(null)}
                    className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMediaType('image')}
                    disabled={editUploading || editPending}
                    className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Añadir foto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMediaType('video')}
                    disabled={editUploading || editPending}
                    className="gap-1.5 border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200"
                  >
                    <Film className="h-3.5 w-3.5" />
                    Añadir clip
                  </Button>
                </div>
              )}

              {editingMediaType === 'video' && editingMediaUrl && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground">Duración:</label>
                  <div className="flex w-24 items-center rounded-md border border-border/60 bg-background/50 px-2">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={editingMediaDuration}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (!Number.isNaN(v))
                          setEditingMediaDuration(Math.max(1, Math.min(30, v)))
                      }}
                      className="w-full bg-transparent text-sm outline-none tabular-nums"
                      aria-label="Duración en segundos"
                    />
                    <span className="ml-1 text-xs text-muted-foreground">s</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">· máximo 30s</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPost(null)}
              disabled={editPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitEdit}
              disabled={
                editPending ||
                editUploading ||
                (!editContent.trim() && !editingMediaUrl) ||
                (!!editingMediaType && !editingMediaUrl)
              }
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
            >
              {editPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Guardando...
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  Guardar cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT GROUP DIALOG */}
      <Dialog open={showEditGroup} onOpenChange={(o) => !o && setShowEditGroup(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar grupo</DialogTitle>
            <DialogDescription>
              Actualiza el banner, icono, nombre y descripción de tu grupo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Banner */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Banner</Label>
              <div className="relative h-32 overflow-hidden rounded-xl border border-border/60 bg-card">
                {editGroupBanner ? (
                  <img
                    src={editGroupBanner}
                    alt="Banner"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-xs text-muted-foreground"
                    style={
                      group
                        ? {
                            background: `linear-gradient(135deg, ${group.color}, ${group.color}33)`,
                          }
                        : undefined
                    }
                  >
                    Sin banner
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerUploading || groupSavePending}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100 disabled:cursor-wait"
                >
                  {bannerUploading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Subiendo...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Upload className="h-3.5 w-3.5" /> Cambiar banner
                    </span>
                  )}
                </button>
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleGroupImageUpload(f, 'banner')
                  e.target.value = ''
                }}
              />
            </div>

            {/* Icon */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Icono</Label>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-border text-2xl font-extrabold text-white"
                  style={
                    group
                      ? { background: `linear-gradient(135deg, ${group.color}, ${group.color}aa)` }
                      : undefined
                  }
                >
                  {editGroupIcon ? (
                    <img
                      src={editGroupIcon}
                      alt="Icono"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    editGroupName.charAt(0).toUpperCase() || '?'
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={iconUploading || groupSavePending}
                  className="gap-1.5"
                >
                  {iconUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {editGroupIcon ? 'Cambiar icono' : 'Subir icono'}
                </Button>
                {editGroupIcon && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditGroupIcon(null)}
                    disabled={iconUploading || groupSavePending}
                    className="gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" /> Quitar
                  </Button>
                )}
              </div>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleGroupImageUpload(f, 'icon')
                  e.target.value = ''
                }}
              />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="edit-group-name"
              >
                Nombre
              </Label>
              <Input
                id="edit-group-name"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value.slice(0, 40))}
                maxLength={40}
                className="border-border/60 bg-background/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="edit-group-description"
              >
                Descripción
              </Label>
              <Textarea
                id="edit-group-description"
                value={editGroupDescription}
                onChange={(e) => setEditGroupDescription(e.target.value.slice(0, 200))}
                rows={3}
                maxLength={200}
                className="resize-none border-border/60 bg-background/50"
              />
              <div className="flex justify-end">
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {editGroupDescription.length}/200
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditGroup(false)}
              disabled={groupSavePending}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitEditGroup}
              disabled={
                groupSavePending ||
                bannerUploading ||
                iconUploading ||
                !editGroupName.trim()
              }
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
            >
              {groupSavePending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Guardando...
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  Guardar cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE POST CONFIRMATION */}
      <AlertDialog open={!!deletingPost} onOpenChange={(o) => !o && setDeletingPost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar publicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La publicación se eliminará permanentemente del
              grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deletePending}
              className="gap-1.5 border-red-500/40 bg-red-600/90 text-white hover:bg-red-600"
            >
              {deletePending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DELETE GROUP CONFIRMATION */}
      <AlertDialog open={showDeleteGroup} onOpenChange={setShowDeleteGroup}>
        <AlertDialogContent className="border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
                <Trash2 className="h-4 w-4" />
              </span>
              Eliminar grupo
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar <span className="font-semibold text-foreground">{group?.name}</span>?
              Esta acción no se puede deshacer y se perderán todos los miembros y publicaciones del grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteGroupPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDeleteGroup()
              }}
              disabled={deleteGroupPending}
              className="gap-1.5 bg-gradient-to-r from-red-600 to-pink-600 text-white hover:opacity-90"
            >
              {deleteGroupPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Sí, eliminar grupo
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* REMOVE MEMBER CONFIRMATION */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(o) => !o && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar miembro del grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && (
                <>
                  Vas a eliminar a{' '}
                  <span className="font-semibold text-foreground">
                    {memberToRemove.displayName}
                  </span>{' '}
                  (<span className="text-muted-foreground">@{memberToRemove.username}</span>) de
                  tu grupo. Tendrá que volver a unirse si desea participar de nuevo.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={memberRemovePending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmRemoveMember()
              }}
              disabled={memberRemovePending}
              className="gap-1.5 border-red-500/40 bg-red-600/90 text-white hover:bg-red-600"
            >
              {memberRemovePending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar miembro
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ---------- Media pill toggle ---------- */

function MediaPill({
  active,
  onClick,
  icon: Icon,
  label,
  activeClass,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  activeClass: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
        active
          ? activeClass
          : 'border-border/50 bg-transparent text-muted-foreground hover:border-border hover:text-foreground'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  )
}

/* ---------- Post card ---------- */

function PostCard({
  post,
  liking,
  onLike,
  onOpenProfile,
  onEdit,
  onDelete,
  onCopyLink,
  onShare,
  canManage,
}: {
  post: Post
  liking: boolean
  onLike: () => void
  onOpenProfile: () => void
  onEdit: (post: Post) => void
  onDelete: (post: Post) => void
  onCopyLink: (post: Post) => void
  onShare: (post: Post) => void
  canManage?: boolean
}) {
  const [showComments, setShowComments] = useState(false)
  // Admin can delete ANY post in their group (not just own posts)
  const canDeleteThis = post.canDelete || !!canManage
  return (
    <Card className="group border-border/50 bg-card/50 p-4 transition-all hover:border-emerald-500/30">
      <div className="mb-3 flex items-start gap-3">
        <button onClick={onOpenProfile} className="shrink-0">
          <FrameAvatar
            src={post.author.avatar}
            fallback={post.author.displayName}
            size="md"
            ring={post.author.isStreamer}
          />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenProfile}
              className="truncate text-sm font-semibold transition-colors hover:text-emerald-400"
            >
              {post.author.displayName}
            </button>
            {post.author.isStreamer && (
              <Badge
                variant="secondary"
                className="h-4 border border-amber-500/30 bg-amber-500/15 px-1.5 text-[9px] text-amber-300"
              >
                <Crown className="mr-0.5 h-2.5 w-2.5" /> STREAMER
              </Badge>
            )}
            {canManage && !post.canEdit && (
              <Badge
                variant="secondary"
                className="h-4 border border-amber-400/30 bg-amber-400/10 px-1.5 text-[9px] text-amber-300"
                title="Como admin puedes eliminar esta publicación"
              >
                <ShieldCheck className="mr-0.5 h-2.5 w-2.5" /> Mod
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
        </div>

        {/* 3-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Más opciones"
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground opacity-50 transition-all hover:bg-muted/60 hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-muted/60 data-[state=open]:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4} className="w-48">
            {post.canEdit && (
              <DropdownMenuItem onClick={() => onEdit(post)}>
                <Pencil className="h-4 w-4" /> Editar
              </DropdownMenuItem>
            )}
            {canDeleteThis && (
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(post)}>
                <Trash2 className="h-4 w-4" /> Eliminar
              </DropdownMenuItem>
            )}
            {(post.canEdit || canDeleteThis) && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => toast.success('Publicación guardada')}>
              <Bookmark className="h-4 w-4" /> Guardar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyLink(post)}>
              <Link2 className="h-4 w-4" /> Copiar enlace
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare(post)}>
              <Share2 className="h-4 w-4" /> Compartir
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.success('Reporte enviado')}>
              <Flag className="h-4 w-4" /> Reportar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {post.content && (
        <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
          {post.content}
        </p>
      )}

      {/* Media rendering */}
      {post.mediaType === 'image' && post.mediaUrl ? (
        <div className="mb-3">
          <ImageWithLightbox
            src={post.mediaUrl}
            alt="Foto"
            className="w-full max-h-80 border border-border/40"
            rounded="rounded-xl"
          />
        </div>
      ) : post.mediaType === 'video' && post.mediaUrl ? (
        <div className="relative mb-3">
          <video
            src={post.mediaUrl}
            controls
            className="w-full max-h-96 rounded-xl border border-border/40 bg-black object-contain"
          />
          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-cyan-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg backdrop-blur">
            <Film className="h-2.5 w-2.5" /> Clip · {post.mediaDuration ?? '?'}s
          </span>
        </div>
      ) : post.image ? (
        <div className="mb-3">
          <ImageWithLightbox
            src={post.image}
            alt="Imagen"
            className="w-full max-h-80 border border-border/40"
            rounded="rounded-xl"
          />
        </div>
      ) : null}

      {/* Footer: Like / Comments toggle / Share */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={onLike}
          disabled={liking}
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors disabled:opacity-50 ${
            post.liked
              ? 'text-pink-400'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-pink-400'
          }`}
        >
          {liking ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Heart
              className={`h-4 w-4 transition-transform ${
                post.liked ? 'scale-110 fill-pink-500' : 'hover:scale-110'
              }`}
            />
          )}
          <span className="font-medium tabular-nums">{formatCount(post.likesCount)}</span>
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
            showComments
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-emerald-400'
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium tabular-nums">{formatCount(post.commentsCount)}</span>
          <span className="hidden sm:inline">
            {post.commentsCount === 1 ? 'comentario' : 'comentarios'}
          </span>
        </button>
        <button
          onClick={() => onShare(post)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-cyan-400"
          title="Compartir publicación"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline font-medium">Compartir</span>
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div
            key="comments"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <CommentSection postId={post.id} canManage={!!canManage} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

/* ---------- Comments section (expandable, fetches on first open) ---------- */

function CommentSection({ postId, canManage }: { postId: string; canManage: boolean }) {
  const openProfile = useAppStore((s) => s.openProfile)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/posts/${postId}/comments`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((data) => {
        if (!cancelled) setComments(data.comments || [])
      })
      .catch(() => {
        if (!cancelled) setComments([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [postId])

  async function submit() {
    const c = content.trim()
    if (!c || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: c }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo comentar')
      }
      const data = await res.json()
      if (data.comment) {
        setComments((prev) => [...prev, data.comment as Comment])
        setContent('')
        toast.success('Comentario publicado')
      }
    } catch (e: any) {
      toast.error(e.message || 'No se pudo comentar')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete(commentId: string) {
    if (deletingId) return
    setDeletingId(commentId)
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}/delete`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo eliminar')
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setConfirmDeleteId(null)
      toast.success('Comentario eliminado')
    } catch (e: any) {
      toast.error(e.message || 'No se pudo eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mt-3 border-t border-border/40 pt-3">
      {/* List */}
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          Aún no hay comentarios. ¡Sé el primero en responder!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="group flex items-start gap-2.5">
                <button
                  onClick={() => openProfile(c.author.id)}
                  className="shrink-0"
                  title={c.author.displayName}
                >
                  <img
                    src={c.author.avatar || ''}
                    alt={c.author.displayName}
                    loading="lazy"
                    className="h-7 w-7 rounded-full bg-card object-cover ring-1 ring-border/60"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl rounded-tl-sm bg-muted/40 px-3 py-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => openProfile(c.author.id)}
                        className="truncate text-xs font-semibold transition-colors hover:text-emerald-400"
                      >
                        {c.author.displayName}
                      </button>
                      {c.author.isStreamer && (
                        <Crown className="h-2.5 w-2.5 text-amber-300" />
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/90">
                      {c.content}
                    </p>
                  </div>
                  <div className="mt-0.5 ml-1 flex items-center gap-1">
                    {/* Any author can delete their own; group admin can delete any. The backend enforces this. */}
                    <button
                      onClick={() => setConfirmDeleteId(c.id)}
                      className="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex items-end gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 500))}
          placeholder="Escribe un comentario..."
          rows={1}
          className="min-h-[40px] resize-none border-border/60 bg-background/50 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <Button
          size="sm"
          disabled={!content.trim() || submitting}
          onClick={submit}
          className="gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
        >
          {submitting ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span className="sr-only">Enviar</span>
        </Button>
      </div>
      {content.length > 0 && (
        <p className="mt-1 text-right text-[10px] text-muted-foreground">
          {content.length}/500 · ⌘+Enter para enviar
        </p>
      )}

      {/* Delete comment confirmation */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar comentario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. {canManage ? 'Como admin del grupo puedes eliminar cualquier comentario.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (confirmDeleteId) confirmDelete(confirmDeleteId)
              }}
              disabled={!!deletingId}
              className="gap-1.5 border-red-500/40 bg-red-600/90 text-white hover:bg-red-600"
            >
              {deletingId ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ---------- Skeleton ---------- */

function GroupDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/50 bg-card/50 p-0">
        <Skeleton className="h-40 w-full rounded-none sm:h-52" />
        <div className="px-4 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end">
            <Skeleton className="h-20 w-20 rounded-2xl border-4 border-card sm:h-24 sm:w-24" />
            <div className="flex-1 space-y-2 pt-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full max-w-md" />
            </div>
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-border/40 pt-4">
            <Skeleton className="h-3 w-28" />
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full border-2 border-card" />
              ))}
            </div>
          </div>
        </div>
      </Card>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid gap-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-border/50 bg-card/50 p-4">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
            <Skeleton className="mb-2 h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </Card>
        ))}
      </div>
    </div>
  )
}
