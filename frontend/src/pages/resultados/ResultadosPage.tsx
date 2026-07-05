import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import { Evaluacion, AIRecomendacion, FODA_COLORS, DIMENSION_COLORS } from '../../types'
import { getImportanciaClass, getRecClass, getFodaClass, UMBRALES } from '../../utils/guiosad.utils'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine
} from 'recharts'
import ReactMarkdown from 'react-markdown'

export default function ResultadosPage() {
  const { id } = useParams()
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null)
  const [ai, setAi] = useState<AIRecomendacion | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get(`/evaluaciones/${id}`).then((res) => {
      setEvaluacion(res.data.evaluacion)
      setAi(res.data.evaluacion.ai_recomendacion || null)
    }).finally(() => setLoading(false))
  }, [id])

  const handleGenerateAI = async () => {
    if (!id) return
    setLoadingAI(true)
    try {
      const res = await api.post(`/ia/analizar/${id}`)
      setAi(res.data.ai)
    } finally {
      setLoadingAI(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  if (!evaluacion) return <div style={{ padding: '40px' }}>Evaluación no encontrada</div>

  const efactores = evaluacion.evaluacion_factores.filter(ef => ef.clasificacion_foda)

  const fodaCounts = {
    Fortaleza: efactores.filter(ef => ef.clasificacion_foda === 'Fortaleza').length,
    Oportunidad: efactores.filter(ef => ef.clasificacion_foda === 'Oportunidad').length,
    Debilidad: efactores.filter(ef => ef.clasificacion_foda === 'Debilidad').length,
    Amenaza: efactores.filter(ef => ef.clasificacion_foda === 'Amenaza').length,
  }

  const donutData = Object.entries(fodaCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: FODA_COLORS[name as keyof typeof FODA_COLORS] }))

  const barData = efactores
    .filter(ef => ef.ponderacion_media !== null)
    .map(ef => ({
      name: ef.factor.factor_name.length > 25 ? ef.factor.factor_name.slice(0, 25) + '...' : ef.factor.factor_name,
      pm: ef.ponderacion_media,
      foda: ef.clasificacion_foda,
      umbral: UMBRALES[ef.factor.dimension.dimension_name] ?? 3.0,
      fill: FODA_COLORS[ef.clasificacion_foda as keyof typeof FODA_COLORS] || '#9C9A94',
    }))

  const rec = evaluacion.recomendacion
  const riskScore = evaluacion.risk_score ?? 0

  const recConfig = {
    A: { label: 'ADOPTAR', desc: 'El software presenta un perfil FODA favorable. Proceda con la adopción.', border: 'var(--rec-A-bd)', bg: 'var(--rec-A-bg)', color: 'var(--rec-A)' },
    B: { label: 'CON RESERVAS', desc: 'El software puede adoptarse con un plan de mitigación de riesgos.', border: 'var(--rec-B-bd)', bg: 'var(--rec-B-bg)', color: 'var(--rec-B)' },
    C: { label: 'NO ADOPTAR', desc: 'El software presenta riesgos significativos. Se recomienda buscar alternativas.', border: 'var(--rec-C-bd)', bg: 'var(--rec-C-bg)', color: 'var(--rec-C)' },
  }

  const recInfo = rec ? recConfig[rec] : null

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">{evaluacion.software_nombre}</h1>
          <p className="page-subtitle">
            Análisis FODA completo · {efactores.length} factores evaluados
            {evaluacion.evaluador_nombre && ` · Evaluador: ${evaluacion.evaluador_nombre}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/evaluaciones" className="btn btn-secondary">← Volver</Link>
        </div>
      </div>

      {/* Recomendación prominente */}
      {rec && recInfo && (
        <div style={{
          background: recInfo.bg,
          border: `2px solid ${recInfo.border}`,
          borderRadius: '12px',
          padding: '24px 28px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: recInfo.color, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800,
            flexShrink: 0, boxShadow: `0 6px 20px ${recInfo.color}40`,
          }}>{rec}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: recInfo.color, marginBottom: '4px' }}>
              Recomendación GUIOSAD v2
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: recInfo.color, marginBottom: '6px' }}>
              Recomendación {rec} — {recInfo.label}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{recInfo.desc}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Risk Score</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', fontWeight: 700, color: recInfo.color }}>{riskScore}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {riskScore === 0 ? 'Sin riesgo' : riskScore <= 4 ? 'Riesgo moderado' : 'Riesgo alto'}
            </div>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px' }}>
        {/* Donut FODA */}
        <div className="card">
          <div className="card-body">
            <h2 className="section-title">Distribución FODA</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {donutData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [val, name]} />
                <Legend formatter={(value) => <span style={{ fontSize: '12px' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              {Object.entries(fodaCounts).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px',
                  padding: '6px 10px', borderRadius: '6px', background: 'var(--color-surface-2)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="card">
          <div className="card-body">
            <h2 className="section-title">PM por Factor</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" domain={[0, 4]} tickCount={5} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val) => [Number(val).toFixed(2), 'PM']}
                  contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
                <Bar dataKey="pm" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fontFamily: 'JetBrains Mono' }}>
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Full results table */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <h2 className="section-title">Tabla Completa de Resultados</h2>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Dimensión</th>
                  <th>IR</th>
                  <th>PM</th>
                  <th>Alcance</th>
                  <th>Clasificación FODA</th>
                </tr>
              </thead>
              <tbody>
                {evaluacion.evaluacion_factores.map((ef) => {
                  const dimColors = DIMENSION_COLORS[ef.factor.dimension.dimension_name] || { badge: 'badge-borrador' }
                  return (
                    <tr key={ef.efactor_id}>
                      <td style={{ fontWeight: 500, fontSize: '13px' }}>{ef.factor.factor_name}</td>
                      <td><span className={`badge ${dimColors.badge}`}>{ef.factor.dimension.dimension_name}</span></td>
                      <td>
                        {ef.importancia_relativa ? (
                          <span className={`badge ${getImportanciaClass(ef.importancia_relativa)}`}>{ef.importancia_relativa}</span>
                        ) : <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>}
                      </td>
                      <td>
                        {ef.ponderacion_media !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="progress-bar" style={{ width: '60px', height: '4px' }}>
                              <div className="progress-fill"
                                style={{
                                  width: `${Math.min((ef.ponderacion_media / 4) * 100, 100)}%`,
                                  background: ef.clasificacion_foda ? FODA_COLORS[ef.clasificacion_foda] : 'var(--color-accent)',
                                }} />
                            </div>
                            <span className="font-mono" style={{ fontSize: '12px', fontWeight: 600 }}>
                              {ef.ponderacion_media.toFixed(2)}
                            </span>
                          </div>
                        ) : <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Sin datos</span>}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {ef.alcance_override || ef.factor.tipo_impacto}
                      </td>
                      <td>
                        {ef.clasificacion_foda ? (
                          <span className={`badge badge-${ef.clasificacion_foda[0]}`}>{ef.clasificacion_foda}</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                            {ef.importancia_relativa === 'Irrelevante' ? 'No relevante' : 'Sin evaluar'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              ✦ Análisis Cualitativo con IA
            </h2>
            {!ai && (
              <button onClick={handleGenerateAI} className="btn btn-primary" disabled={loadingAI}>
                {loadingAI ? <><div className="spinner spinner-sm" /> Generando...</> : 'Generar análisis'}
              </button>
            )}
          </div>

          {loadingAI && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto 12px' }} />
              <p>Analizando resultados con IA...</p>
            </div>
          )}

          {ai && (
            <div style={{
              background: 'var(--color-surface-2)',
              borderRadius: '8px',
              padding: '20px 24px',
              fontSize: '14px',
              lineHeight: 1.8,
              color: 'var(--color-text-primary)',
            }}>
              <ReactMarkdown
                components={{
                  h2: ({ children }) => <h2 style={{ fontSize: '16px', fontWeight: 700, marginTop: '20px', marginBottom: '10px', color: 'var(--color-text-primary)' }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontSize: '14px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>{children}</h3>,
                  p: ({ children }) => <p style={{ marginBottom: '12px' }}>{children}</p>,
                  strong: ({ children }) => <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{children}</strong>,
                  li: ({ children }) => <li style={{ marginBottom: '6px', marginLeft: '16px' }}>{children}</li>,
                  ul: ({ children }) => <ul style={{ marginBottom: '12px' }}>{children}</ul>,
                }}
              >
                {ai.respuesta_texto}
              </ReactMarkdown>
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)',
                fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Generado por: {ai.modelo_usado} · {new Date(ai.created_at).toLocaleString('es-ES')}
              </div>
            </div>
          )}

          {!ai && !loadingAI && (
            <div className="empty-state" style={{ padding: '30px' }}>
              <div className="empty-state-icon">✦</div>
              <p className="empty-state-title">Análisis IA no generado</p>
              <p className="empty-state-desc">Genera un análisis cualitativo completo con recomendaciones accionables basadas en los resultados FODA.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
