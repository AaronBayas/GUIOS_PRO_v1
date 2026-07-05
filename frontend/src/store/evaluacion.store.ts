import { create } from 'zustand'

interface EvaluacionState {
  evaluacionId: number | null
  pasoActual: number
  softwareNombre: string
  ultimoGuardado: Date | null
  guardandoState: 'idle' | 'saving' | 'saved' | 'error'
  cambiosPendientes: boolean

  setEvaluacionId: (id: number) => void
  setPasoActual: (paso: number) => void
  setSoftwareNombre: (nombre: string) => void
  setUltimoGuardado: (fecha: Date) => void
  setGuardandoState: (state: 'idle' | 'saving' | 'saved' | 'error') => void
  setCambiosPendientes: (pendientes: boolean) => void
  reset: () => void
}

export const useEvaluacionStore = create<EvaluacionState>()((set) => ({
  evaluacionId: null,
  pasoActual: 1,
  softwareNombre: '',
  ultimoGuardado: null,
  guardandoState: 'idle',
  cambiosPendientes: false,

  setEvaluacionId: (id) => set({ evaluacionId: id }),
  setPasoActual: (paso) => set({ pasoActual: paso }),
  setSoftwareNombre: (nombre) => set({ softwareNombre: nombre }),
  setUltimoGuardado: (fecha) => set({ ultimoGuardado: fecha, guardandoState: 'saved' }),
  setGuardandoState: (state) => set({ guardandoState: state }),
  setCambiosPendientes: (pendientes) => set({ cambiosPendientes: pendientes }),
  reset: () => set({
    evaluacionId: null,
    pasoActual: 1,
    softwareNombre: '',
    ultimoGuardado: null,
    guardandoState: 'idle',
    cambiosPendientes: false,
  }),
}))
