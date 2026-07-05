import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { DashboardStats, Evaluacion } from '../../types'
import { getEstadoClass, getEstadoLabel, getRecClass, formatRelativeTime } from '../../utils/guiosad.utils'
import { useAuthStore } from '../../store/auth.store'

export default function DashboardPage() {
  const { usuario } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/evaluaciones/stats/dashboard')
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 className="page-title">{greeting}, {usuario?.usuario_name?.split(' ')[0]}</h1>
        <p className="page-subtitle">Aquí tienes el resumen de tus evaluaciones FLOSS</p>
      </div>

      {/* Metrics row */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="metric-card">
              <div className="skeleton" style={{ height: '12px', width: '60%' }} />
              <div className="skeleton" style={{ height: '36px', width: '40%', marginTop: '8px' }} />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <MetricCard label="Total evaluaciones" value={stats.total} sub="en tu cuenta" color="var(--color-accent)" />
          <MetricCard label="Completadas" value={stats.completadas} sub={`${stats.total > 0 ? Math.round((stats.completadas / stats.total) * 100) : 0}% del total`} color="var(--foda-F)" />
          <MetricCard label="En progreso" value={stats.enProgreso} sub="requieren atención" color="var(--foda-D)" />
          <MetricCard label="Archivadas" value={stats.archivadas} sub="historial" color="var(--color-text-muted)" />
        </div>
      ) : null}

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>
        {/* Recent evaluations */}
        <div className="card">
          <div className="card-body">
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Evaluaciones recientes</h2>
              <Link to="/evaluaciones" className="btn btn-ghost btn-sm">Ver todas →</Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '68px', borderRadius: '8px' }} />)}
              </div>
            ) : stats?.recientes && stats.recientes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.recientes.map((ev) => (
                  <EvaluacionItem key={ev.evaluacion_id} ev={ev} />
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon">◉</div>
                <p className="empty-state-title">No hay evaluaciones aún</p>
                <p className="empty-state-desc">Crea tu primera evaluación para comenzar a analizar software FLOSS</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* New evaluation CTA */}
          <div style={{
            background: '#111111',
            borderRadius: 'var(--radius-card)',
            padding: '24px 20px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>⊕</div>
            <h3 style={{ color: 'white', fontSize: '15px', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
              Nueva evaluación
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '16px' }}>
              Evalúa cualquier software libre con la metodología GUIOSAD v2
            </p>
            <Link to="/evaluaciones/nueva" className="btn btn-primary btn-full" style={{ justifyContent: 'center' }}>
              Comenzar
            </Link>
          </div>

          {/* About GUIOSAD */}
          <div className="card">
            <div className="card-body" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Sobre GUIOSAD v2</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '8px' }}>
                Metodología de evaluación FLOSS actualizada con investigaciones 2022–2026.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  ['19 factores', '3 dimensiones'],
                  ['77+ subfactores', 'Ponderados'],
                  ['IA integrada', 'Análisis cualitativo'],
                ].map(([a, b]) => (
                  <div key={a} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{a}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  )
}

function EvaluacionItem({ ev }: { ev: Evaluacion }) {
  const isCompleted = ev.estado === 'Completada'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 14px',
      borderRadius: '8px',
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      transition: 'all var(--transition-fast)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }} className="truncate">
            {ev.software_nombre}
          </span>
          <span className={`badge ${getEstadoClass(ev.estado)}`}>{getEstadoLabel(ev.estado)}</span>
          {ev.recomendacion && (
            <span className={`badge ${getRecClass(ev.recomendacion)}`}>Rec. {ev.recomendacion}</span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          {ev.software_tipo} · {formatRelativeTime(ev.ultimo_guardado)}
        </div>
      </div>
      <Link
        to={isCompleted ? `/evaluaciones/${ev.evaluacion_id}/resultados` : `/evaluaciones/${ev.evaluacion_id}/wizard`}
        className="btn btn-secondary btn-sm"
        style={{ flexShrink: 0, marginLeft: '12px' }}
      >
        {isCompleted ? 'Ver resultados' : 'Continuar →'}
      </Link>
    </div>
  )
}
