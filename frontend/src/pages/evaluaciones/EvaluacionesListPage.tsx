import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Evaluacion, TipoSoftware, TIPOS_SOFTWARE } from '../../types'
import {
  getEstadoClass, getEstadoLabel, getRecClass, formatRelativeTime, getFodaClass
} from '../../utils/guiosad.utils'

type EstadoFilter = 'Todos' | 'Borrador' | 'En_progreso' | 'Completada' | 'Archivada'
type OrdenFilter = 'reciente' | 'antiguo' | 'nombre'

export default function EvaluacionesListPage() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<EstadoFilter>('Todos')
  const [tipo, setTipo] = useState<TipoSoftware | ''>('')
  const [orden, setOrden] = useState<OrdenFilter>('reciente')
  const [deleting, setDeleting] = useState<number | null>(null)

  const fetchEvaluaciones = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (buscar) params.set('buscar', buscar)
      if (estado !== 'Todos') params.set('estado', estado)
      if (tipo) params.set('tipo', tipo)
      params.set('orden', orden)
      const res = await api.get(`/evaluaciones?${params}`)
      setEvaluaciones(res.data.evaluaciones)
    } finally {
      setLoading(false)
    }
  }, [buscar, estado, tipo, orden])

  useEffect(() => {
    const t = setTimeout(fetchEvaluaciones, buscar ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchEvaluaciones])

  const handleArchivar = async (id: number) => {
    await api.patch(`/evaluaciones/${id}/archivar`)
    fetchEvaluaciones()
  }

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta evaluación? Esta acción no se puede deshacer.')) return
    setDeleting(id)
    await api.delete(`/evaluaciones/${id}`)
    fetchEvaluaciones()
    setDeleting(null)
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mis Evaluaciones</h1>
          <p className="page-subtitle">{evaluaciones.length} evaluaciones encontradas</p>
        </div>
        <Link to="/evaluaciones/nueva" className="btn btn-primary">⊕ Nueva evaluación</Link>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px',
        padding: '16px', background: 'var(--color-surface)', borderRadius: 'var(--radius-card)',
        border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '14px' }}>⊕</span>
          <input
            type="text"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por nombre de software..."
            className="input"
            style={{ paddingLeft: '32px' }}
          />
        </div>

        {/* Estado */}
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoFilter)}
          className="input"
          style={{ width: 'auto', minWidth: '150px' }}
        >
          {['Todos', 'Borrador', 'En_progreso', 'Completada', 'Archivada'].map((e) => (
            <option key={e} value={e}>{e === 'En_progreso' ? 'En progreso' : e}</option>
          ))}
        </select>

        {/* Tipo */}
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoSoftware | '')}
          className="input"
          style={{ width: 'auto', minWidth: '130px' }}
        >
          <option value="">Todos los tipos</option>
          {TIPOS_SOFTWARE.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Orden */}
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as OrdenFilter)}
          className="input"
          style={{ width: 'auto', minWidth: '150px' }}
        >
          <option value="reciente">Más reciente</option>
          <option value="antiguo">Más antiguo</option>
          <option value="nombre">Nombre A-Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container card">
        <table className="table">
          <thead>
            <tr>
              <th>Software</th>
              <th>Tipo</th>
              <th>Sector</th>
              <th>Estado</th>
              <th>Último guardado</th>
              <th>Recomendación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: '20px', borderRadius: '4px' }} /></td>
                  ))}
                </tr>
              ))
            ) : evaluaciones.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">◉</div>
                    <p className="empty-state-title">No se encontraron evaluaciones</p>
                    <p className="empty-state-desc">Ajusta los filtros o crea una nueva evaluación</p>
                  </div>
                </td>
              </tr>
            ) : (
              evaluaciones.map((ev) => (
                <tr key={ev.evaluacion_id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{ev.software_nombre}</div>
                    {ev.software_version && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>v{ev.software_version}</div>
                    )}
                  </td>
                  <td><span className="badge badge-borrador">{ev.software_tipo}</span></td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {ev.organizacion_sector || '—'}
                  </td>
                  <td><span className={`badge ${getEstadoClass(ev.estado)}`}>{getEstadoLabel(ev.estado)}</span></td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {formatRelativeTime(ev.ultimo_guardado)}
                  </td>
                  <td>
                    {ev.recomendacion ? (
                      <span className={`badge ${getRecClass(ev.recomendacion)}`}>
                        {ev.recomendacion} — {ev.recomendacion === 'A' ? 'Adoptar' : ev.recomendacion === 'B' ? 'Con reservas' : 'No adoptar'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Pendiente</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {ev.estado === 'Completada' ? (
                        <Link to={`/evaluaciones/${ev.evaluacion_id}/resultados`} className="btn btn-secondary btn-sm">
                          Ver
                        </Link>
                      ) : (
                        <Link to={`/evaluaciones/${ev.evaluacion_id}/wizard`} className="btn btn-primary btn-sm">
                          Continuar
                        </Link>
                      )}
                      {ev.estado !== 'Archivada' && (
                        <button
                          onClick={() => handleArchivar(ev.evaluacion_id)}
                          className="btn btn-ghost btn-sm"
                          title="Archivar"
                        >
                          ⊟
                        </button>
                      )}
                      <button
                        onClick={() => handleEliminar(ev.evaluacion_id)}
                        className="btn btn-danger btn-sm"
                        disabled={deleting === ev.evaluacion_id}
                        title="Eliminar"
                      >
                        {deleting === ev.evaluacion_id ? <div className="spinner spinner-sm" /> : '✕'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
