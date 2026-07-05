import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Usuario } from '../types'

interface AuthState {
  usuario: Usuario | null
  isAuthenticated: boolean
  setUsuario: (usuario: Usuario | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      isAuthenticated: false,
      setUsuario: (usuario) => set({ usuario, isAuthenticated: !!usuario }),
      logout: () => set({ usuario: null, isAuthenticated: false }),
    }),
    {
      name: 'guios-auth',
      partialize: (state) => ({ usuario: state.usuario, isAuthenticated: state.isAuthenticated }),
    }
  )
)
