import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAuthStore } from './store/auth.store'
import api from './services/api'
import { AppLayout } from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import EvaluacionesListPage from './pages/evaluaciones/EvaluacionesListPage'
import NuevaEvaluacionPage from './pages/evaluaciones/NuevaEvaluacionPage'
import EvaluacionWizardPage from './pages/evaluaciones/EvaluacionWizardPage'
import ResultadosPage from './pages/resultados/ResultadosPage'
import FactoresPage from './pages/admin/FactoresPage'
import UsuariosPage from './pages/admin/UsuariosPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
})

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setUsuario } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Verify session on reload
    api.get('/auth/me')
      .then((res) => setUsuario(res.data.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '24px',
            color: 'var(--color-text-primary)', marginBottom: '16px',
          }}>
            GUIOS PRO
          </div>
          <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuthStore()
  if (usuario?.rol !== 'Administrador') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/evaluaciones" element={<EvaluacionesListPage />} />
            <Route path="/evaluaciones/nueva" element={<NuevaEvaluacionPage />} />
            <Route path="/evaluaciones/:id/wizard" element={<EvaluacionWizardPage />} />
            <Route path="/evaluaciones/:id/resultados" element={<ResultadosPage />} />

            {/* Admin only */}
            <Route path="/admin/factores" element={
              <AdminGuard><FactoresPage /></AdminGuard>
            } />
            <Route path="/admin/usuarios" element={
              <AdminGuard><UsuariosPage /></AdminGuard>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
