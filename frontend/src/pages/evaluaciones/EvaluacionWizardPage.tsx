import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Evaluacion, EvaluacionFactor, EvaluacionSubfactor } from '../../types'
import { useEvaluacionStore } from '../../store/evaluacion.store'
import { StepBar } from '../../components/evaluacion/StepBar'
import { AutosaveBadge } from '../../components/evaluacion/AutosaveBadge'
import {
  calcularIR, calcularPM, getUmbral, clasificarFoda, IMPORTANCIA_LABELS,
  getImportanciaClass, getFodaClass, LEVELS, esRelevante, UMBRALES
} from '../../utils/guiosad.utils'
import { DIMENSION_COLORS } from '../../types'

export default function EvaluacionWizardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const store = useEvaluacionStore()
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [factorStates, setFactorStates] = useState<Record<number, { id: number; alcance?: string }>>({})
  const [subfactorStates, setSubfactorStates] = useState<Record<number, Record<number, number>>>({})
  const [selectedFactor, setSelectedFactor] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) return
    api.get(`/evaluaciones/${id}`).then((res) => {
      const ev: Evaluacion = res.data.evaluacion
      setEvaluacion(ev)
      store.setEvaluacionId(ev.evaluacion_id)
      store.setSoftwareNombre(ev.software_nombre)
      setStep(ev.paso_actual || 1)

      // Initialize states from saved data
      const fs: Record<number, { id: number; alcance?: string }> = {}
      const ss: Record<number, Record<number, number>> = {}
      ev.evaluacion_factores.forEach((ef) => {
        fs[ef.factor_id] = {
          id: ef.importancia_decisor || ef.factor.importancia_sugerida,
          alcance: ef.alcance_override || undefined,
        }
        const subMap: Record<number, number> = {}
        ef.evaluacion_subfactores.forEach((esf) => {
          if (esf.peso !== null) subMap[esf.subfactor_id] = esf.peso
        })
        ss[ef.factor_id] = subMap
      })
      setFactorStates(fs)
      setSubfactorStates(ss)
    }).finally(() => setLoading(false))
  }, [id])

  // Debounced autosave
  const triggerAutosave = useCallback(() => {
    if (!id) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    store.setGuardandoState('idle')
    saveTimerRef.current = setTimeout(async () => {
      store.setGuardandoState('saving')
      setSaving(true)
      try {
        const factoresPayload = Object.entries(factorStates).map(([factorId, state]) => ({
          factor_id: parseInt(factorId),
          importancia_decisor: state.id,
          alcance_override: state.alcance,
          subfactores: Object.entries(subfactorStates[parseInt(factorId)] || {}).map(([sfId, peso]) => ({
            subfactor_id: parseInt(sfId),
            peso,
          })),
        }))
        await api.patch(`/evaluaciones/${id}/autosave`, {
          paso_actual: step,
          factores: factoresPayload,
        })
        store.setUltimoGuardado(new Date())
      } catch {
        store.setGuardandoState('error')
      } finally {
        setSaving(false)
      }
    }, 3000)
  }, [id, factorStates, subfactorStates, step, store])

  // Periodic autosave every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      triggerAutosave()
    }, 30000)
    return () => clearInterval(interval)
  }, [triggerAutosave])

  // Save before unload
  useEffect(() => {
    const handler = () => triggerAutosave()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [triggerAutosave])

  const handleIDChange = (factorId: number, value: number) => {
    setFactorStates((prev) => ({ ...prev, [factorId]: { ...prev[factorId], id: value } }))
    triggerAutosave()
  }

  const handleAlcanceChange = (factorId: number, alcance: string) => {
    setFactorStates((prev) => ({ ...prev, [factorId]: { ...prev[factorId], alcance } }))
    triggerAutosave()
  }

  const handleSubfactorChange = (factorId: number, subfactorId: number, peso: number) => {
    setSubfactorStates((prev) => ({
      ...prev,
      [factorId]: { ...(prev[factorId] || {}), [subfactorId]: peso },
    }))
    triggerAutosave()
  }

  const handleCalcular = async () => {
    if (!id) return
    setCalculating(true)
    try {
      await api.post(`/evaluaciones/${id}/calcular`)
      navigate(`/evaluaciones/${id}/resultados`)
    } finally {
      setCalculating(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Cargando evaluación...</p>
      </div>
    </div>
  )

  if (!evaluacion) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p>Evaluación no encontrada</p>
    </div>
  )

  const factores = evaluacion.evaluacion_factores

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-logo">GUIOS PRO</span>
          <div className="topbar-divider" />
          <span className="topbar-software-name">{evaluacion.software_nombre}</span>
          <span className="badge badge-en-progreso" style={{ fontSize: '11px' }}>En evaluación</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AutosaveBadge />
          <button onClick={() => navigate('/evaluaciones')} className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            ← Salir
          </button>
        </div>
      </div>

      {/* Step Bar */}
      <StepBar currentStep={step} />

      {/* Content */}
      <div style={{ flex: 1 }}>
        {step === 1 && (
          <Step1ImportanciaFactores
            factores={factores}
            factorStates={factorStates}
            onIDChange={handleIDChange}
            onAlcanceChange={handleAlcanceChange}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2PonderacionSubfactores
            factores={factores}
            factorStates={factorStates}
            subfactorStates={subfactorStates}
            selectedFactor={selectedFactor}
            onSelectFactor={setSelectedFactor}
            onSubfactorChange={handleSubfactorChange}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3Resultados
            evaluacion={evaluacion}
            factores={factores}
            factorStates={factorStates}
            subfactorStates={subfactorStates}
            onBack={() => setStep(2)}
            onCalcular={handleCalcular}
            calculating={calculating}
          />
        )}
      </div>
    </div>
  )
}

// ── STEP 1: Importancia de Factores ──────────────────────────
function Step1ImportanciaFactores({
  factores, factorStates, onIDChange, onAlcanceChange, onNext,
}: {
  factores: EvaluacionFactor[]
  factorStates: Record<number, { id: number; alcance?: string }>
  onIDChange: (id: number, val: number) => void
  onAlcanceChange: (id: number, alcance: string) => void
  onNext: () => void
}) {
  const grouped = factores.reduce((acc, ef) => {
    const dim = ef.factor.dimension.dimension_name
    if (!acc[dim]) acc[dim] = []
    acc[dim].push(ef)
    return acc
  }, {} as Record<string, EvaluacionFactor[]>)

  const allSet = factores.every((ef) => factorStates[ef.factor_id]?.id > 0)

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Importancia de Factores</h1>
          <p className="page-subtitle">
            Asigna la importancia que cada factor tiene para tu organización (ID: Importancia Decisor, 1-4).
            El sistema calcula automáticamente la IR con ponderación 60% IS científica / 40% ID.
          </p>
        </div>
      </div>

      {Object.entries(grouped).map(([dim, efs]) => {
        const dimColors = DIMENSION_COLORS[dim] || { badge: 'badge-borrador' }
        return (
          <div key={dim} className="card" style={{ marginBottom: '20px' }}>
            <div style={{
              padding: '12px 20px',
              background: 'var(--color-surface-2)',
              borderBottom: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card) var(--radius-card) 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span className={`badge ${dimColors.badge}`} style={{ fontSize: '12px', padding: '4px 12px' }}>
                {dim}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{efs.length} factores</span>
            </div>

            <div className="table-container" style={{ borderRadius: '0 0 var(--radius-card) var(--radius-card)', border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Factor</th>
                    <th>IS Científica</th>
                    <th style={{ width: '30%' }}>Importancia Decisor (ID)</th>
                    <th>Imp. Decisor</th>
                    <th>IR Calculada</th>
                    <th>Alcance</th>
                  </tr>
                </thead>
                <tbody>
                  {efs.map((ef) => {
                    const state = factorStates[ef.factor_id] || { id: ef.factor.importancia_sugerida }
                    const idVal = state.id || ef.factor.importancia_sugerida
                    const ir = calcularIR(ef.factor.importancia_sugerida, idVal)

                    return (
                      <tr key={ef.efactor_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>
                                {ef.factor.factor_name}
                              </div>
                              {ef.factor.descripcion && (
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                                  {ef.factor.descripcion.slice(0, 80)}...
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getImportanciaClass(LEVELS[ef.factor.importancia_sugerida - 1])}`}>
                            {ef.factor.importancia_sugerida} — {LEVELS[ef.factor.importancia_sugerida - 1]}
                          </span>
                        </td>
                        <td>
                          <div className="slider-container">
                            <input
                              type="range"
                              min={1} max={4} step={1}
                              value={idVal}
                              onChange={(e) => onIDChange(ef.factor_id, parseInt(e.target.value))}
                              className="slider"
                            />
                            <div className="slider-labels">
                              <span>Irrelevante</span>
                              <span>Opcional</span>
                              <span>Importante</span>
                              <span>Fundamental</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getImportanciaClass(LEVELS[idVal - 1])}`}>
                            {LEVELS[idVal - 1]}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getImportanciaClass(ir)}`} style={{ fontWeight: 700 }}>
                            {ir}
                          </span>
                        </td>
                        <td>
                          {ef.factor.tipo_impacto === 'Ambos' ? (
                            <select
                              value={state.alcance || 'Externo'}
                              onChange={(e) => onAlcanceChange(ef.factor_id, e.target.value)}
                              className="input"
                              style={{ fontSize: '12px', padding: '4px 8px', width: '100px' }}
                            >
                              <option value="Interno">Interno</option>
                              <option value="Externo">Externo</option>
                            </select>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                              {ef.factor.tipo_impacto}
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
        )
      })}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button onClick={onNext} className="btn btn-primary btn-lg" disabled={!allSet}>
          Siguiente: Ponderación de Subfactores →
        </button>
      </div>
    </div>
  )
}

// ── STEP 2: Ponderación de Subfactores ───────────────────────
const PESO_LABELS = ['', 'No cumple', 'Desconozco', 'Cumple parcialmente', 'Cumple']

function Step2PonderacionSubfactores({
  factores, factorStates, subfactorStates, selectedFactor,
  onSelectFactor, onSubfactorChange, onBack, onNext,
}: {
  factores: EvaluacionFactor[]
  factorStates: Record<number, { id: number; alcance?: string }>
  subfactorStates: Record<number, Record<number, number>>
  selectedFactor: number | null
  onSelectFactor: (id: number) => void
  onSubfactorChange: (factorId: number, sfId: number, peso: number) => void
  onBack: () => void
  onNext: () => void
}) {
  const relevantFactores = factores.filter((ef) => {
    const state = factorStates[ef.factor_id] || { id: ef.factor.importancia_sugerida }
    const ir = calcularIR(ef.factor.importancia_sugerida, state.id || ef.factor.importancia_sugerida)
    return esRelevante(ir)
  })

  const grouped = relevantFactores.reduce((acc, ef) => {
    const dim = ef.factor.dimension.dimension_name
    if (!acc[dim]) acc[dim] = []
    acc[dim].push(ef)
    return acc
  }, {} as Record<string, EvaluacionFactor[]>)

  const isComplete = (ef: EvaluacionFactor) => {
    const subs = subfactorStates[ef.factor_id] || {}
    return ef.factor.subfactores.filter(s => s.activo).every((s) => subs[s.subfactor_id] !== undefined)
  }

  const completedCount = relevantFactores.filter(isComplete).length
  const selectedEF = selectedFactor !== null
    ? relevantFactores.find((ef) => ef.factor_id === selectedFactor) || null
    : null

  // Auto-select first incomplete factor if none selected
  useEffect(() => {
    if (selectedFactor === null && relevantFactores.length > 0) {
      onSelectFactor(relevantFactores[0].factor_id)
    }
  }, [relevantFactores.length])

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      {/* Left panel - Factor list */}
      <div style={{
        width: '260px',
        flexShrink: 0,
        borderRight: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Factores relevantes</div>
          <div style={{ marginBottom: '8px' }}>
            <div className="progress-bar">
              <div className="progress-fill progress-fill-green"
                style={{ width: `${relevantFactores.length > 0 ? (completedCount / relevantFactores.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {completedCount} de {relevantFactores.length} completados
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {Object.entries(grouped).map(([dim, efs]) => {
            const dimColors = DIMENSION_COLORS[dim] || { badge: 'badge-borrador' }
            return (
              <div key={dim} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: 'var(--color-text-muted)', padding: '4px 8px' }}>{dim}</div>
                {efs.map((ef) => {
                  const state = factorStates[ef.factor_id] || { id: ef.factor.importancia_sugerida }
                  const ir = calcularIR(ef.factor.importancia_sugerida, state.id || ef.factor.importancia_sugerida)
                  const done = isComplete(ef)
                  const active = selectedFactor === ef.factor_id
                  return (
                    <button
                      key={ef.factor_id}
                      onClick={() => onSelectFactor(ef.factor_id)}
                      style={{
                        width: '100%', textAlign: 'left', background: active ? 'var(--color-accent-light)' : 'none',
                        border: `1px solid ${active ? 'var(--color-accent)' : 'transparent'}`,
                        borderRadius: '6px', padding: '8px 10px', cursor: 'pointer', marginBottom: '2px',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: active ? 'var(--color-accent)' : 'var(--color-text-primary)',
                          flex: 1, lineHeight: 1.3 }}>{ef.factor.factor_name}</span>
                        <span style={{ fontSize: '14px', flexShrink: 0 }}>{done ? '✓' : '○'}</span>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span className={`badge ${getImportanciaClass(ir)}`} style={{ fontSize: '10px' }}>{ir}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Navigation */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>← Anterior</button>
          <button
            onClick={onNext}
            className="btn btn-primary btn-sm"
            style={{ width: '100%' }}
            disabled={completedCount === 0}
          >
            Ver Resultados →
          </button>
        </div>
      </div>

      {/* Right panel - Subfactors */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {selectedEF === null ? (
          <div className="empty-state" style={{ paddingTop: '80px' }}>
            <div className="empty-state-icon">◉</div>
            <p className="empty-state-title">Selecciona un factor</p>
            <p className="empty-state-desc">Elige un factor de la lista izquierda para evaluar sus subfactores</p>
          </div>
        ) : (
          <SubfactorPanel
            ef={selectedEF}
            factorStates={factorStates}
            subfactorStates={subfactorStates}
            onSubfactorChange={onSubfactorChange}
          />
        )}
      </div>
    </div>
  )
}

function SubfactorPanel({
  ef, factorStates, subfactorStates, onSubfactorChange,
}: {
  ef: EvaluacionFactor
  factorStates: Record<number, { id: number; alcance?: string }>
  subfactorStates: Record<number, Record<number, number>>
  onSubfactorChange: (factorId: number, sfId: number, peso: number) => void
}) {
  const state = factorStates[ef.factor_id] || { id: ef.factor.importancia_sugerida }
  const idVal = state.id || ef.factor.importancia_sugerida
  const ir = calcularIR(ef.factor.importancia_sugerida, idVal)
  const subfactoresActivos = ef.factor.subfactores.filter(s => s.activo)
  const criticosCount = subfactoresActivos.filter(s => s.es_critico).length

  const subWeights = subfactorStates[ef.factor_id] || {}
  const subfactoresConPeso = subfactoresActivos
    .filter(sf => subWeights[sf.subfactor_id] !== undefined)
    .map(sf => ({ peso: subWeights[sf.subfactor_id], es_critico: sf.es_critico }))

  const pm = subfactoresConPeso.length > 0 ? calcularPM(subfactoresConPeso) : 0
  const umbral = getUmbral(ef.factor.dimension.dimension_name)
  const alcance = (state.alcance || ef.factor.tipo_impacto) as 'Interno' | 'Externo'
  const foda = pm > 0 && subfactoresConPeso.length > 0 ? clasificarFoda(pm, alcance, umbral) : null
  const pmPercent = Math.min((pm / 4) * 100, 100)
  const umbralPercent = (umbral / 4) * 100

  const dimColors = DIMENSION_COLORS[ef.factor.dimension.dimension_name] || { badge: 'badge-borrador' }

  return (
    <div style={{ animation: 'slideUp 0.2s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>{ef.factor.factor_name}</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className={`badge ${dimColors.badge}`}>{ef.factor.dimension.dimension_name}</span>
              <span className={`badge ${getImportanciaClass(ir)}`}>IR: {ir}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {subfactoresActivos.length} subfactores · {criticosCount} críticos ★
              </span>
            </div>
          </div>
          {foda && (
            <span className={`badge badge-${foda[0]}`} style={{ fontSize: '13px', padding: '6px 14px' }}>{foda}</span>
          )}
        </div>

        {/* PM bar */}
        <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Ponderación Media (PM)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: foda === 'Fortaleza' || foda === 'Oportunidad' ? 'var(--foda-F)' : foda ? 'var(--foda-A)' : 'var(--color-text-primary)' }}>
                {pm.toFixed(2)}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>/ 4.00</span>
            </div>
          </div>
          <div className="pm-bar-track">
            <div className="pm-bar-fill"
              style={{
                width: `${pmPercent}%`,
                background: foda === 'Fortaleza' || foda === 'Oportunidad' ? 'var(--foda-F)' : foda ? 'var(--foda-A)' : 'var(--color-accent)',
              }}
            />
            <div className="pm-bar-threshold" style={{ left: `${umbralPercent}%` }} title={`Umbral ${ef.factor.dimension.dimension_name}`} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px', textAlign: 'right' }}>
            Umbral {ef.factor.dimension.dimension_name}: {umbral.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Subfactors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {subfactoresActivos.map((sf) => {
          const peso = subWeights[sf.subfactor_id]
          return (
            <div key={sf.subfactor_id} style={{
              padding: '14px 16px',
              background: 'var(--color-surface)',
              border: `1px solid ${sf.es_critico ? '#F0C882' : 'var(--color-border)'}`,
              borderRadius: '8px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                {sf.es_critico && (
                  <span style={{ color: 'var(--foda-D)', fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>★</span>
                )}
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.5, flex: 1 }}>
                  {sf.subfactor_name}
                </span>
                {peso !== undefined && (
                  <span className={`badge ${
                    peso === 4 ? 'badge-completada' : peso === 3 ? 'badge-importante' : peso === 2 ? 'badge-borrador' : 'badge-archivada'
                  }`} style={{ flexShrink: 0, fontSize: '10px' }}>
                    {PESO_LABELS[peso]}
                  </span>
                )}
              </div>
              <div className="slider-container">
                <input
                  type="range" min={1} max={4} step={1}
                  value={peso || 1}
                  onChange={(e) => onSubfactorChange(ef.factor_id, sf.subfactor_id, parseInt(e.target.value))}
                  className="slider"
                />
                <div className="slider-labels">
                  {PESO_LABELS.slice(1).map((l) => <span key={l}>{l}</span>)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── STEP 3: Preview de resultados ────────────────────────────
function Step3Resultados({
  evaluacion, factores, factorStates, subfactorStates, onBack, onCalcular, calculating,
}: {
  evaluacion: Evaluacion
  factores: EvaluacionFactor[]
  factorStates: Record<number, { id: number; alcance?: string }>
  subfactorStates: Record<number, Record<number, number>>
  onBack: () => void
  onCalcular: () => void
  calculating: boolean
}) {
  // Compute live results
  const resultados = factores.map((ef) => {
    const state = factorStates[ef.factor_id] || { id: ef.factor.importancia_sugerida }
    const idVal = state.id || ef.factor.importancia_sugerida
    const ir = calcularIR(ef.factor.importancia_sugerida, idVal)
    if (!esRelevante(ir)) return { ef, ir, pm: null, foda: null }

    const subWeights = subfactorStates[ef.factor_id] || {}
    const sfData = ef.factor.subfactores.filter(s => s.activo && subWeights[s.subfactor_id] !== undefined)
      .map(sf => ({ peso: subWeights[sf.subfactor_id], es_critico: sf.es_critico }))

    if (sfData.length === 0) return { ef, ir, pm: null, foda: null }

    const pm = calcularPM(sfData)
    const umbral = getUmbral(ef.factor.dimension.dimension_name)
    const alcance = (state.alcance || ef.factor.tipo_impacto) as 'Interno' | 'Externo'
    const foda = clasificarFoda(pm, alcance, umbral)
    return { ef, ir, pm, foda }
  })

  const evaluated = resultados.filter(r => r.foda !== null)
  const fodaCounts = {
    Fortaleza: evaluated.filter(r => r.foda === 'Fortaleza').length,
    Oportunidad: evaluated.filter(r => r.foda === 'Oportunidad').length,
    Debilidad: evaluated.filter(r => r.foda === 'Debilidad').length,
    Amenaza: evaluated.filter(r => r.foda === 'Amenaza').length,
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vista previa de Resultados</h1>
          <p className="page-subtitle">
            Revisa el resumen antes de calcular el FODA final y la recomendación oficial.
          </p>
        </div>
      </div>

      {/* FODA summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Fortalezas', key: 'Fortaleza', badge: 'badge-F', icon: '↑' },
          { label: 'Oportunidades', key: 'Oportunidad', badge: 'badge-O', icon: '◎' },
          { label: 'Debilidades', key: 'Debilidad', badge: 'badge-D', icon: '↓' },
          { label: 'Amenazas', key: 'Amenaza', badge: 'badge-A', icon: '⚠' },
        ].map((item) => (
          <div key={item.key} className="metric-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{item.icon}</div>
            <div className="metric-value">{fodaCounts[item.key as keyof typeof fodaCounts]}</div>
            <div className={`badge ${item.badge}`} style={{ marginTop: '4px' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Results table */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <h2 className="section-title">Tabla de resultados</h2>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Dimensión</th>
                  <th>IR</th>
                  <th>PM</th>
                  <th>Umbral</th>
                  <th>Clasificación FODA</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map(({ ef, ir, pm, foda }) => {
                  const dimColors = DIMENSION_COLORS[ef.factor.dimension.dimension_name] || { badge: 'badge-borrador' }
                  const umbral = UMBRALES[ef.factor.dimension.dimension_name] ?? 3.0
                  return (
                    <tr key={ef.efactor_id}>
                      <td style={{ fontSize: '13px', fontWeight: 500 }}>{ef.factor.factor_name}</td>
                      <td><span className={`badge ${dimColors.badge}`}>{ef.factor.dimension.dimension_name}</span></td>
                      <td><span className={`badge ${getImportanciaClass(ir)}`}>{ir}</span></td>
                      <td>
                        {pm !== null ? (
                          <span className="font-mono" style={{ fontSize: '13px', fontWeight: 600 }}>{pm.toFixed(2)}</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Sin evaluar</span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {umbral.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        {foda ? (
                          <span className={`badge badge-${foda[0]}`}>{foda}</span>
                        ) : ir === 'Irrelevante' ? (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>No relevante</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Sin datos</span>
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

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} className="btn btn-secondary">← Volver a subfactores</button>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {evaluated.length === 0 && (
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              ⚠ Evalúa al menos 1 factor para calcular
            </span>
          )}
          <button
            onClick={onCalcular}
            className="btn btn-primary btn-lg"
            disabled={calculating || evaluated.length === 0}
          >
            {calculating ? (
              <><div className="spinner spinner-sm" /> Calculando FODA...</>
            ) : (
              '⊕ Calcular FODA y Recomendación'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
