import { create } from 'zustand'

export type ViewKey = 'home' | 'communities' | 'community-detail' | 'groups' | 'group-detail' | 'chat' | 'streams' | 'store' | 'profile'

export interface CurrentUser {
  id: string
  username: string
  displayName: string
  avatar: string | null
  banner: string | null
  bio: string | null
  isStreamer: boolean
  level: number
  xp: number
  coins: number
  frameId: string | null
}

interface AppState {
  view: ViewKey
  profileUserId: string | null
  activeCommunitySlug: string | null  // usado para detalle de comunidad Y detalle de grupo
  currentUser: CurrentUser | null
  setView: (v: ViewKey) => void
  openProfile: (userId: string) => void
  openCommunity: (slug: string) => void
  openGroup: (slug: string) => void
  setCurrentUser: (u: CurrentUser | null) => void
  refreshUser: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  view: 'home',
  profileUserId: null,
  activeCommunitySlug: null,
  currentUser: null,
  setView: (v) => set({ view: v }),
  openProfile: (userId) => set({ view: 'profile', profileUserId: userId }),
  openCommunity: (slug) => set({ view: 'community-detail', activeCommunitySlug: slug }),
  openGroup: (slug) => set({ view: 'group-detail', activeCommunitySlug: slug }),
  setCurrentUser: (u) => set({ currentUser: u }),
  refreshUser: async () => {
    try {
      const res = await fetch('/api/me')
      if (res.ok) {
        const data = await res.json()
        set({ currentUser: data.user })
      }
    } catch {
      /* ignore */
    }
  },
}))
