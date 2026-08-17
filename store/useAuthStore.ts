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
  /**
   * False until SessionSync has actually heard back about the session.
   *
   * There is nothing to read synchronously on the client - the session cookie
   * is httpOnly - so the store has to start signed-out and be corrected once
   * /get-session answers. That means `isAuthenticated === false` on its own
   * says "signed out *or* we haven't asked yet", and any chrome that can't
   * tell those apart shows its signed-out state to people who are in fact
   * signed in. The Join button is the one that hurts: tapping it navigates to
   * /signup, which bounces a session-holder straight back to the page they
   * were already on, so the button reads as dead.
   */
  isSessionResolved: boolean
  isAuthModalOpen: boolean
  login: (user: User) => void
  logout: () => void
  syncSession: (user: User | null) => void
  markSessionResolved: () => void
  openAuthModal: () => void
  closeAuthModal: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, // Set to null by default (Guest mode)
  isAuthenticated: false,
  isSessionResolved: false,
  isAuthModalOpen: false,
  login: (user) => set({ user, isAuthenticated: true, isSessionResolved: true, isAuthModalOpen: false }),
  logout: () => {
    set({ user: null, isAuthenticated: false, isSessionResolved: true })
    void authClient.signOut()
  },
  // Internal: called by SessionSync to reflect the real Better Auth session
  // without re-triggering a signOut request (avoids login/logout feedback loops).
  syncSession: (user) => set({ user, isAuthenticated: !!user, isSessionResolved: true }),
  // Also internal: "we asked and couldn't get an answer". Leaves user /
  // isAuthenticated untouched - a failed request is not a sign-out - but stops
  // the signed-out chrome from being withheld forever from a real visitor.
  markSessionResolved: () => set({ isSessionResolved: true }),
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}))
