import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { authApi } from '../lib/api'
import { toast } from 'sonner'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginCedula: (userId: string, cedula: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const response = await authApi.login(email, password)
          const { token, user } = response.data
          localStorage.setItem('token', token)
          set({ user, token, isAuthenticated: true, isLoading: false })
        } catch (error: unknown) {
          set({ isLoading: false })
          const err = error as { response?: { data?: { message?: string } } }
          const message =
            err.response?.data?.message ?? 'Error al iniciar sesión'
          toast.error(message)
          throw error
        }
      },

      loginCedula: async (userId, cedula) => {
        set({ isLoading: true })
        try {
          const response = await authApi.loginCedula(userId, cedula)
          const { token, user } = response.data
          localStorage.setItem('token', token)
          set({ user, token, isAuthenticated: true, isLoading: false })
        } catch (error: unknown) {
          set({ isLoading: false })
          const err = error as { response?: { data?: { error?: string } } }
          const message = err.response?.data?.error ?? 'Cédula incorrecta'
          toast.error(message)
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null, isAuthenticated: false })
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'maral-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
