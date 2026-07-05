import { useEffect, useState } from 'react'
import api from '../../services/api'
import { formatRelativeTime } from '../../utils/guiosad.utils'

interface UserFull {
  usuario_id: number
  usuario_name: string
  email: string
  activo: boolean
  created_at: string
  rol: { rol_name: string }
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UserFull[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsuarios = () => {
    api.get('/usuarios').then((res) => setUsuarios(res.data.usuarios)).finally(() => setLoading(false))
  }
  useEffect(() => { fetchUsuarios() }, [])

  const handleToggleActivo = async (u: UserFull) => {
    await api.patch(`/usuarios/${u.usuario_id}/activo`, { activo: !u.activo })
    fetchUsuarios()
  }

  const handleChangeRol = async (u: UserFull) => {
    const newRol = u.rol.rol_name === 'Administrador' ? 'Evaluador' : 'Administrador'
    if (!confirm(`¿Cambiar rol de ${u.usuario_name} a ${newRol}?`)) return
    await api.patch(`/usuarios/${u.usuario_id}/rol`, { rol_name: newRol })
    fetchUsuarios()
  }

  const handleEliminar = async (u: UserFull) => {
    if (!confirm(`¿Eliminar al usuario ${u.usuario_name}? Esta acción no se puede deshacer.`)) return
    await api.delete(`/usuarios/${u.usuario_id}`)
    fetchUsuarios()
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">{usuarios.length} usuarios registrados</p>
        </div>
      </div>

      <div className="card">
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Registrado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '18px', borderRadius: '4px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : usuarios.map((u) => (
                <tr key={u.usuario_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="sidebar-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                        {u.usuario_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{u.usuario_name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.rol.rol_name === 'Administrador' ? 'badge-fundamental' : 'badge-opcional'}`}>
                      {u.rol.rol_name}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.activo ? 'badge-completada' : 'badge-archivada'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {formatRelativeTime(u.created_at)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleChangeRol(u)} className="btn btn-secondary btn-sm" title="Cambiar rol">
                        Cambiar rol
                      </button>
                      <button onClick={() => handleToggleActivo(u)} className="btn btn-ghost btn-sm">
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => handleEliminar(u)} className="btn btn-danger btn-sm">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
