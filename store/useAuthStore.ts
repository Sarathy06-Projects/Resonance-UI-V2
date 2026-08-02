import { create } from 'zustand'
import { authClient } from '@/lib/auth-client'

export interface User {
  id: string
  name: string
  username: string
  avatar: string
  email?: string
  bio?: string
  role?: string
  hasOnboarded: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isAuthModalOpen: boolean
  login: (user: User) => void
  logout: () => void
  syncSession: (user: User | null) => void
  openAuthModal: () => void
  closeAuthModal: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, // Set to null by default (Guest mode)
  isAuthenticated: false,
  isAuthModalOpen: false,
  login: (user) => set({ user, isAuthenticated: true, isAuthModalOpen: false }),
  logout: () => {
    set({ user: null, isAuthenticated: false })
    void authClient.signOut()
  },
  // Internal: called by SessionSync to reflect the real Better Auth session
  // without re-triggering a signOut request (avoids login/logout feedback loops).
  syncSession: (user) => set({ user, isAuthenticated: !!user }),
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}))
