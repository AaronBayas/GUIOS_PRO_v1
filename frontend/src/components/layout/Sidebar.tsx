import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import api from '../../services/api'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '◈' },
  { to: '/evaluaciones', label: 'Mis Evaluaciones', icon: '◉' },
  { to: '/evaluaciones/nueva', label: 'Nueva Evaluación', icon: '⊕', accent: true },
]

const adminItems = [
  { to: '/admin/factores', label: 'Factores', icon: '⊞' },
  { to: '/admin/usuarios', label: 'Usuarios', icon: '⊙' },
]

export function Sidebar() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      logout()
      navigate('/login')
    }
  }

  const initials = usuario?.usuario_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">GUIOS PRO</div>
        <div className="sidebar-logo-sub">v2 · Evaluación FLOSS</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-label">Principal</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''} ${item.accent ? 'sidebar-link-accent' : ''}`
              }
              style={({ isActive }) =>
                item.accent && !isActive
                  ? { color: 'rgba(107, 151, 245, 0.9)' }
                  : {}
              }
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>

        {usuario?.rol === 'Administrador' && (
          <div className="sidebar-section" style={{ marginTop: '16px' }}>
            <div className="sidebar-label">Administración</div>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div>
            <div className="sidebar-user-name">{usuario?.usuario_name}</div>
            <div className="sidebar-user-role">{usuario?.rol}</div>
          </div>
        </div>
        <button
          className="sidebar-link"
          onClick={handleLogout}
          style={{ width: '100%', color: 'rgba(255,100,100,0.7)' }}
        >
          <span className="sidebar-icon">⎋</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
