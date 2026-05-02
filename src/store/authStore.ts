import { create } from 'zustand'
import type { Profile } from '@/types/app.types'

interface AuthState {
  session: string | null         // JWT token (truthy = logged in)
  user: { id: string; email: string } | null
  profile: Profile | null
  isLoading: boolean
  setSession: (token: string | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (v: boolean) => void
  isAdmin: () => boolean
  isStudent: () => boolean
}

function decodeUser(token: string): { id: string; email: string } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { id: payload.id, email: payload.email }
  } catch { return null }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session:   null,
  user:      null,
  profile:   null,
  isLoading: true,
  setSession: (token) => set({
    session: token,
    user: token ? decodeUser(token) : null,
  }),
  setProfile: (profile) => set({ profile }),
  setLoading:  (isLoading) => set({ isLoading }),
  isAdmin:   () => get().profile?.role === 'admin',
  isStudent: () => get().profile?.role === 'student',
}))
