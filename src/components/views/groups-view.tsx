'use client'

import { useAppStore } from '@/lib/store'
import { SectionHeading } from '@/components/shared/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
  UsersRound,
  Users,
  Search,
  Check,
  UserPlus,
  UserMinus,
  Plus,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Palette,
  Upload,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Gamepad2,
  Crown,
  Network,
  Flame,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatCount, categoryLabels } from '@/lib/format'
import { toast } from 'sonner'

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
  isOfficial: boolean
  canManage: boolean
}

const CREATE_CATEGORIES = [
  'general',
  'roblox',
  'minecraft',
  'valorant',
  'fortnite',
  'lol',
  'free-fire',
  'gta',
  'cs2',
  'genshin',
  'among-us',
  'cod',
  'pokemon',
  'just-chatting',
  'game-dev',
]

// Groups palette — emerald/cyan-forward, but user can still pick any accent
const COLOR_SWATCHES = [
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Lima', value: '#84cc16' },
  { name: 'Ámbar', value: '#f59e0b' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Púrpura', value: '#a855f7' },
]

function categoryLabel(key: string): string {
  if (key === 'general') return 'General'
  return categoryLabels[key] || key
}

export function GroupsView() {
  const setView = useAppStore((s) => s.setView)
  const openGroup = useAppStore((s) => s.openGroup)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('todos')
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createCategory, setCreateCategory] = useState('general')
  const [createColor, setCreateColor] = useState('#10b981')
  const [creating, setCreating] = useState(false)

  // Upload state (banner + icon from device library)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState<'banner' | 'icon' | null>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)

  // Edit dialog state
  const [editTarget, setEditTarget] = useState<Group | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editBanner, setEditBanner] = useState<string | null>(null)
  const [editIcon, setEditIcon] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editUploading, setEditUploading] = useState<'banner' | 'icon' | null>(null)
  const editBannerInputRef = useRef<HTMLInputElement>(null)
  const editIconInputRef = useRef<HTMLInputElement>(null)

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/communities')
      .then((r) => r.json())
      .then((data) => {
        const all: Group[] = data.communities || []
        // Groups = user-created (isOfficial === false)
        setGroups(all.filter((g) => !g.isOfficial))
      })
      .catch(() => toast.error('Error cargando grupos'))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    groups.forEach((c) => counts.set(c.category, (counts.get(c.category) || 0) + 1))
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key)
  }, [groups])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return groups.filter((c) => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      const matchCategory = activeCategory === 'todos' || c.category === activeCategory
      return matchSearch && matchCategory
    })
  }, [groups, search, activeCategory])

  const totalMembers = groups.reduce((a, c) => a + c.membersCount, 0)
  const joinedCount = groups.filter((c) => c.joined).length
  const adminCount = groups.filter((c) => c.canManage).length

  // Top 3 slugs by membersCount for "Popular" badge
  const popularSlugs = useMemo(() => {
    return new Set(
      [...groups]
        .sort((a, b) => b.membersCount - a.membersCount)
        .slice(0, 3)
        .map((c) => c.slug),
    )
  }, [groups])

  async function toggleJoin(c: Group) {
    if (pendingSlug) return
    const action = c.joined ? 'leave' : 'join'
    setPendingSlug(c.slug)
    // Optimistic update
    setGroups((prev) =>
      prev.map((x) =>
        x.slug === c.slug
          ? {
              ...x,
              joined: action === 'join',
              membersCount: Math.max(0, x.membersCount + (action === 'join' ? 1 : -1)),
            }
          : x,
      ),
    )
    try {
      const res = await fetch(`/api/communities/${c.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setGroups((prev) =>
        prev.map((x) =>
          x.slug === c.slug ? { ...x, joined: data.joined, membersCount: data.membersCount } : x,
        ),
      )
      toast.success(data.joined ? `Te uniste a ${c.name}` : `Saliste de ${c.name}`)
    } catch {
      // Revert on error
      setGroups((prev) =>
        prev.map((x) =>
          x.slug === c.slug
            ? {
                ...x,
                joined: action !== 'join',
                membersCount: Math.max(0, x.membersCount + (action === 'join' ? -1 : 1)),
              }
            : x,
        ),
      )
      toast.error('Ocurrió un error')
    } finally {
      setPendingSlug(null)
    }
  }

  // ---------- CREATE ----------
  const createValid =
    createName.trim().length >= 3 &&
    createName.trim().length <= 40 &&
    createDescription.trim().length >= 10 &&
    createDescription.trim().length <= 200

  function resetCreateForm() {
    setCreateName('')
    setCreateDescription('')
    setCreateCategory('general')
    setCreateColor('#10b981')
    setBannerUrl(null)
    setIconUrl(null)
  }

  async function handleFileUpload(file: File, kind: 'banner' | 'icon') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'image')
    setUploading(kind)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir imagen')
      if (kind === 'banner') setBannerUrl(data.url)
      else setIconUrl(data.url)
      toast.success('Imagen subida correctamente')
    } catch (e: any) {
      toast.error(e?.message || 'Error al subir imagen')
    } finally {
      setUploading(null)
    }
  }

  async function handleCreate() {
    if (!createValid || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/communities/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim(),
          category: createCategory,
          color: createColor,
          banner: bannerUrl,
          icon: iconUrl,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo crear el grupo')
      }
      const data = await res.json()
      const newGroup: Group = { ...data.community, isOfficial: false }
      setGroups((prev) => [newGroup, ...prev])
      setCreateOpen(false)
      resetCreateForm()
      toast.success('¡Grupo creado!')
      openGroup(newGroup.slug)
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo crear el grupo')
    } finally {
      setCreating(false)
    }
  }

  // ---------- EDIT ----------
  function openEdit(c: Group) {
    setEditTarget(c)
    setEditName(c.name)
    setEditDescription(c.description)
    setEditBanner(c.banner)
    setEditIcon(c.icon && !c.icon.startsWith('data:') ? c.icon : null)
  }

  const editValid =
    editName.trim().length >= 3 &&
    editName.trim().length <= 40 &&
    editDescription.trim().length >= 10 &&
    editDescription.trim().length <= 200

  async function handleEditFileUpload(file: File, kind: 'banner' | 'icon') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'image')
    setEditUploading(kind)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir imagen')
      if (kind === 'banner') setEditBanner(data.url)
      else setEditIcon(data.url)
      toast.success('Imagen subida')
    } catch (e: any) {
      toast.error(e?.message || 'Error al subir imagen')
    } finally {
      setEditUploading(null)
    }
  }

  async function handleEdit() {
    if (!editTarget || !editValid || editing) return
    setEditing(true)
    try {
      const res = await fetch(`/api/communities/${editTarget.slug}/delete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          banner: editBanner,
          icon: editIcon,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const updated: Partial<Group> = data.community || {}
      setGroups((prev) =>
        prev.map((c) =>
          c.slug === editTarget.slug
            ? {
                ...c,
                ...updated,
                name: updated.name ?? editName.trim(),
                description: updated.description ?? editDescription.trim(),
                banner: updated.banner ?? editBanner,
                icon: updated.icon ?? editIcon ?? c.icon,
              }
            : c,
        ),
      )
      toast.success('Grupo actualizado')
      setEditTarget(null)
    } catch {
      toast.error('No se pudo actualizar el grupo')
    } finally {
      setEditing(false)
    }
  }

  // ---------- DELETE ----------
  async function handleDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/communities/${deleteTarget.slug}/delete`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (!data.success) throw new Error()
      setGroups((prev) => prev.filter((c) => c.slug !== deleteTarget.slug))
      toast.success('Grupo eliminado')
      setDeleteTarget(null)
    } catch {
      toast.error('No se pudo eliminar el grupo')
    } finally {
      setDeleting(false)
    }
  }

  function clearFilters() {
    setSearch('')
    setActiveCategory('todos')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* HERO HEADER */}
      <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-emerald-950/40 via-background to-background mb-8 grid-bg">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-600/20 blur-3xl float-y" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-600/20 blur-3xl" />
        <div className="relative p-6 sm:p-8 space-y-6">
          <SectionHeading
            title="Grupos"
            subtitle="Crea o únete a grupos de gamers"
            icon={UsersRound}
            action={
              <div className="flex items-center gap-2">
                <Badge className="hidden sm:inline-flex border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15">
                  <Sparkles className="h-3 w-3" /> {formatCount(groups.length)} grupos
                </Badge>
                <Button
                  className="gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
                  style={{ boxShadow: '0 8px 24px -8px rgba(16,185,129,0.6)' }}
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Crear grupo</span>
                  <span className="sm:hidden">Crear</span>
                </Button>
              </div>
            }
          />

          {/* Search + stats */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar grupos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 bg-card/60 border-border/60 backdrop-blur h-10"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"
                  style={{ boxShadow: '0 0 16px -4px rgba(16,185,129,0.6)' }}
                >
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-extrabold leading-none text-emerald-400">{formatCount(totalMembers)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">miembros totales</p>
                </div>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-extrabold leading-none text-cyan-400">{joinedCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">unidos</p>
                </div>
              </div>
              {adminCount > 0 && (
                <>
                  <div className="hidden sm:block h-8 w-px bg-border/50" />
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                      <Crown className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-extrabold leading-none text-amber-300">{adminCount}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">eres admin</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY CHIPS */}
      <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <CategoryChip
            active={activeCategory === 'todos'}
            onClick={() => setActiveCategory('todos')}
            label="Todos"
            icon={Sparkles}
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              label={categoryLabel(cat)}
              icon={Gamepad2}
            />
          ))}
        </div>
      </div>

      {/* RESULT META BAR */}
      {!loading && (
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Mostrando <span className="font-semibold text-foreground">{filtered.length}</span> de{' '}
            <span className="font-semibold text-foreground">{groups.length}</span> grupos
          </span>
          {(search || activeCategory !== 'todos') && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              <X className="h-3 w-3" /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* GRID */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="overflow-hidden border-border/50 bg-card/40 p-0">
              <Skeleton className="h-24 w-full rounded-none" />
              <div className="p-4 pt-9 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-8 w-full" />
                <div className="flex justify-between items-center pt-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50 bg-card/50 p-12 flex flex-col items-center justify-center text-center">
          <div className="relative mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
              <UsersRound className="h-8 w-8" />
            </div>
            <div
              className="absolute -inset-2 rounded-3xl bg-emerald-500/10 blur-xl -z-10"
            />
          </div>
          <h3 className="text-lg font-bold mb-1">
            {groups.length === 0 ? 'No hay grupos todavía' : 'Sin resultados'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {groups.length === 0
              ? '¡Crea el primero y reúne a tus amigos en tu propio espacio gamer!'
              : 'No encontramos grupos que coincidan con tu búsqueda. Prueba con otro nombre o cambia la categoría.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {groups.length !== 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-border/60"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" /> Limpiar filtros
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Crear grupo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <GroupCard
              key={c.id}
              group={c}
              pending={pendingSlug === c.slug}
              popular={popularSlugs.has(c.slug)}
              onToggle={() => toggleJoin(c)}
              onOpen={() => openGroup(c.slug)}
              onEdit={() => openEdit(c)}
              onDelete={() => setDeleteTarget(c)}
            />
          ))}
        </div>
      )}

      {/* FOOTER CTA */}
      {!loading && groups.length > 0 && (
        <Card className="mt-10 relative overflow-hidden border-border/50 bg-gradient-to-r from-emerald-950/30 via-card/40 to-cyan-950/20 p-6 sm:p-8 text-center grid-bg">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-32 w-64 bg-emerald-600/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-400 mb-3">
              <Network className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-1">
              Crea tu propio <span className="text-emerald-400">grupo</span>
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Reúne a tu squad, modera tu espacio y comparte contenido. Tú mandas como admin.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                className="gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
                onClick={() => setCreateOpen(true)}
              >
                <Sparkles className="h-4 w-4" /> Crear grupo
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-border/60 bg-card/40 backdrop-blur"
                onClick={() => setView('streams')}
              >
                <Flame className="h-4 w-4" /> Ver streams
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* CREATE DIALOG */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open && !creating) resetCreateForm()
        }}
      >
        <DialogContent className="sm:max-w-[520px] border-border/60 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-white"
                style={{ boxShadow: '0 4px 12px -2px rgba(16,185,129,0.6)' }}
              >
                <Plus className="h-4 w-4" />
              </span>
              Crear grupo
            </DialogTitle>
            <DialogDescription>
              Diseña tu propio espacio gamer. Serás el admin y se te unirá automáticamente como miembro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            {/* Banner upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Foto de banner
              </Label>
              <input
                type="file"
                accept="image/*"
                ref={bannerInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileUpload(f, 'banner')
                  e.target.value = ''
                }}
                className="hidden"
              />
              {bannerUrl ? (
                <div className="group relative h-32 w-full overflow-hidden rounded-xl border border-border/60">
                  <img
                    src={bannerUrl}
                    alt="Vista previa del banner"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploading === 'banner'}
                    >
                      <Upload className="h-3.5 w-3.5" /> Cambiar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-1.5 hover:bg-red-500/20 hover:text-red-200"
                      onClick={() => setBannerUrl(null)}
                      disabled={uploading === 'banner'}
                    >
                      <X className="h-3.5 w-3.5" /> Quitar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploading === 'banner'}
                  className="group relative flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/70 hover:bg-emerald-500/10 transition-all"
                >
                  {uploading === 'banner' ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                      <span className="text-xs text-muted-foreground">Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 transition-transform group-hover:scale-110">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Sube una foto de banner</p>
                        <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP o GIF · máx. 5MB</p>
                      </div>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Icon upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Foto de perfil
              </Label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  ref={iconInputRef}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileUpload(f, 'icon')
                    e.target.value = ''
                  }}
                  className="hidden"
                />
                {iconUrl ? (
                  <div className="group relative h-20 w-20 shrink-0">
                    <img
                      src={iconUrl}
                      alt="Vista previa de la foto de perfil"
                      className="h-full w-full object-cover rounded-2xl border border-border/60"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 rounded-2xl flex items-center justify-center">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={() => iconInputRef.current?.click()}
                        disabled={uploading === 'icon'}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => iconInputRef.current?.click()}
                    disabled={uploading === 'icon'}
                    className="group relative flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/70 hover:bg-emerald-500/10 transition-all"
                  >
                    {uploading === 'icon' ? (
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 transition-transform group-hover:scale-110">
                        <Upload className="h-4 w-4" />
                      </div>
                    )}
                  </button>
                )}
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground/80">Foto de perfil</p>
                  <p className="mt-0.5">Aparecerá como icono cuadrado de tu grupo.</p>
                  <p className="mt-0.5">JPG, PNG, WebP o GIF · máx. 5MB</p>
                  {iconUrl && (
                    <button
                      type="button"
                      onClick={() => setIconUrl(null)}
                      className="mt-1 inline-flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="h-3 w-3" /> Quitar foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="create-name" className="text-xs font-semibold">
                Nombre <span className="text-emerald-400">*</span>
              </Label>
              <Input
                id="create-name"
                placeholder="Ej: Squad Valorant LATAM"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={40}
                className="bg-background/60"
              />
              <p className="text-[10px] text-muted-foreground">
                {createName.trim().length}/40 caracteres · mínimo 3
              </p>
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label htmlFor="create-description" className="text-xs font-semibold">
                Descripción <span className="text-emerald-400">*</span>
              </Label>
              <Textarea
                id="create-description"
                placeholder="Describe de qué trata tu grupo, reglas, juegos que juegan..."
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                maxLength={200}
                rows={3}
                className="bg-background/60 resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                {createDescription.trim().length}/200 caracteres · mínimo 10
              </p>
            </div>

            {/* Categoría */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoría</Label>
              <Select value={createCategory} onValueChange={setCreateCategory}>
                <SelectTrigger className="bg-background/60">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CREATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" /> Color
              </Label>
              <div className="flex flex-wrap gap-2.5">
                {COLOR_SWATCHES.map((sw) => {
                  const active = createColor === sw.value
                  return (
                    <button
                      key={sw.value}
                      type="button"
                      onClick={() => setCreateColor(sw.value)}
                      title={sw.name}
                      aria-label={sw.name}
                      aria-pressed={active}
                      className={`relative h-9 w-9 rounded-full transition-all ${active ? 'scale-110' : 'hover:scale-105'}`}
                      style={{
                        background: `linear-gradient(135deg, ${sw.value}, ${sw.value}aa)`,
                        outline: active ? `2px solid ${sw.value}` : 'none',
                        outlineOffset: active ? '2px' : '0',
                        boxShadow: `0 4px 12px -4px ${sw.value}66`,
                      }}
                    >
                      {active && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
              className="border-border/60"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!createValid || creating}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
            >
              {creating ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Crear grupo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open && !editing) setEditTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-[520px] border-border/60 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                <Pencil className="h-4 w-4" />
              </span>
              Editar grupo
            </DialogTitle>
            <DialogDescription>Actualiza el banner, icono, nombre y descripción de tu grupo.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            {/* Banner */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Banner</Label>
              <input
                type="file"
                accept="image/*"
                ref={editBannerInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleEditFileUpload(f, 'banner')
                  e.target.value = ''
                }}
                className="hidden"
              />
              <div className="relative h-32 overflow-hidden rounded-xl border border-border/60 bg-card">
                {editBanner ? (
                  <img src={editBanner} alt="Banner" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-xs text-muted-foreground"
                    style={{
                      background: editTarget
                        ? `linear-gradient(135deg, ${editTarget.color}, ${editTarget.color}33)`
                        : undefined,
                    }}
                  >
                    Sin banner
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => editBannerInputRef.current?.click()}
                  disabled={!!editUploading || editing}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100 disabled:cursor-wait"
                >
                  {editUploading === 'banner' ? (
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
              {editBanner && (
                <button
                  type="button"
                  onClick={() => setEditBanner(null)}
                  disabled={!!editUploading || editing}
                  className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
                >
                  Quitar banner
                </button>
              )}
            </div>

            {/* Icon */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Icono</Label>
              <input
                type="file"
                accept="image/*"
                ref={editIconInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleEditFileUpload(f, 'icon')
                  e.target.value = ''
                }}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-border text-2xl font-extrabold text-white"
                  style={
                    editTarget
                      ? { background: `linear-gradient(135deg, ${editTarget.color}, ${editTarget.color}aa)` }
                      : undefined
                  }
                >
                  {editIcon ? (
                    <img src={editIcon} alt="Icono" className="h-full w-full object-cover" />
                  ) : (
                    editName.charAt(0).toUpperCase() || '?'
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editIconInputRef.current?.click()}
                  disabled={!!editUploading || editing}
                  className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                >
                  {editUploading === 'icon' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {editIcon ? 'Cambiar icono' : 'Subir icono'}
                </Button>
                {editIcon && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditIcon(null)}
                    disabled={!!editUploading || editing}
                    className="gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" /> Quitar
                  </Button>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-semibold">
                Nombre <span className="text-emerald-400">*</span>
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={40}
                className="bg-background/60"
              />
              <p className="text-[10px] text-muted-foreground">
                {editName.trim().length}/40 caracteres · mínimo 3
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-description" className="text-xs font-semibold">
                Descripción <span className="text-emerald-400">*</span>
              </Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={200}
                rows={4}
                className="bg-background/60 resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                {editDescription.trim().length}/200 caracteres · mínimo 10
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={editing}
              className="border-border/60"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!editValid || editing || !!editUploading}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
            >
              {editing ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Guardar cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE ALERT */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="border-red-500/30 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
                <Trash2 className="h-4 w-4" />
              </span>
              Eliminar grupo
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? Esta acción no se
              puede deshacer y se perderán todos los miembros y publicaciones del grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={deleting} className="border-border/60">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="gap-2 bg-gradient-to-r from-red-600 to-pink-600 text-white hover:opacity-90"
            >
              {deleting ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Sí, eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CategoryChip({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: any
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
        active
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-border/60 bg-card/40 text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-emerald-500/40'
      }`}
      style={
        active
          ? { boxShadow: '0 6px 18px -6px rgba(16,185,129,0.7)' }
          : undefined
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

function GroupCard({
  group,
  pending,
  popular,
  onToggle,
  onOpen,
  onEdit,
  onDelete,
}: {
  group: Group
  pending: boolean
  popular: boolean
  onToggle: () => void
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { name, description, category, color, membersCount, joined, canManage } = group

  return (
    <Card
      className="group relative overflow-hidden border-border/50 bg-card/50 p-0 transition-all hover:border-emerald-500/40 cursor-pointer"
      onClick={onOpen}
      style={
        canManage
          ? { boxShadow: '0 0 0 1px rgba(245,158,11,0.08)' }
          : undefined
      }
    >
      {/* Banner */}
      <div
        className="relative h-24 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}44)` }}
      >
        {group.banner ? (
          <img
            src={group.banner}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid-bg opacity-40" />
        )}
        <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Top-right cluster */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {popular && (
            <Badge className="border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/20">
              <Flame className="h-3 w-3" /> Popular
            </Badge>
          )}
          {joined && (
            <Badge className="border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20">
              <Check className="h-3 w-3" /> Miembro
            </Badge>
          )}
          {canManage && (
            <Badge className="border-amber-400/50 bg-amber-400/25 text-amber-200 hover:bg-amber-400/25 backdrop-blur-sm">
              <Crown className="h-3 w-3" /> Admin
            </Badge>
          )}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8 rounded-md bg-background/70 backdrop-blur-md border border-border/50 text-foreground opacity-100 hover:bg-background/90 hover:text-emerald-400"
                  aria-label="Opciones del grupo"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
                className="w-44 bg-popover/95 backdrop-blur-xl border-border/60"
              >
                <DropdownMenuItem onClick={onOpen} className="gap-2 cursor-pointer">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="gap-2 cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Icon (uploaded image or fallback letter) */}
        <div
          className="absolute -bottom-7 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-2xl font-extrabold text-white border-4 border-card shadow-lg transition-transform group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}aa)`,
            boxShadow: `0 8px 24px -8px ${color}aa`,
          }}
        >
          {group.icon && !group.icon.startsWith('data:') ? (
            <img
              src={group.icon}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-9 pb-4">
        <div className="mb-2">
          <h3 className="font-bold leading-tight truncate">{name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{categoryLabel(category)}</p>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">{description}</p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5 text-emerald-400/80" />
            <span className="font-bold text-foreground">{formatCount(membersCount)}</span>
            <span className="text-muted-foreground">miembros</span>
          </div>

          {joined ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={(e) => { e.stopPropagation(); onToggle() }}
              className="group/join gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/40"
            >
              {pending ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Saliendo...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 group-hover/join:hidden" />
                  <UserMinus className="h-3.5 w-3.5 hidden group-hover/join:inline" />
                  <span className="group-hover/join:hidden">Miembro</span>
                  <span className="hidden group-hover/join:inline">Salir</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={pending}
              onClick={(e) => { e.stopPropagation(); onToggle() }}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90"
            >
              {pending ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Uniéndose...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Unirse
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
