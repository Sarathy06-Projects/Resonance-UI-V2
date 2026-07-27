import { create } from 'zustand'

export interface User {
  id: string
  name: string
  username: string
  avatar: string
  bio?: string
  role?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isAuthModalOpen: boolean
  login: (user: User) => void
  logout: () => void
  openAuthModal: () => void
  closeAuthModal: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, // Set to null by default (Guest mode)
  isAuthenticated: false,
  isAuthModalOpen: false,
  login: (user) => set({ user, isAuthenticated: true, isAuthModalOpen: false }),
  logout: () => set({ user: null, isAuthenticated: false }),
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}))
