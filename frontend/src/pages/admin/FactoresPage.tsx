import { useEffect, useState } from 'react'
import api from '../../services/api'
import { Factor } from '../../types'

export default function FactoresPage() {
  const [factores, setFactores] = useState<Factor[]>([])
  const [loading, setLoading] = useState(true)
  const [editingFactor, setEditingFactor] = useState<Factor | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [motivoCambio, setMotivoCambio] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const fetchFactores = () => {
    api.get('/factores').then((res) => setFactores(res.data.factores)).finally(() => setLoading(false))
  }
  useEffect(() => { fetchFactores() }, [])

  const grouped = factores.reduce((acc, f) => {
    const dim = f.dimension.dimension_name
    if (!acc[dim]) acc[dim] = []
    acc[dim].push(f)
    return acc
  }, {} as Record<string, Factor[]>)

  const handleEdit = (factor: Factor) => {
    setEditingFactor({ ...factor, subfactores: [...factor.subfactores] })
    setMotivoCambio('')
    setSavedMsg('')
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!editingFactor || !motivoCambio.trim()) return
    setSaving(true)
    try {
      await api.put(`/factores/${editingFactor.factor_id}`, {
        factor_name: editingFactor.factor_name,
        importancia_sugerida: editingFactor.importancia_sugerida,
        tipo_impacto: editingFactor.tipo_impacto,
        descripcion: editingFactor.descripcion,
        motivo_cambio: motivoCambio,
      })
      setSavedMsg('Factor guardado exitosamente')
      fetchFactores()
      setTimeout(() => setDrawerOpen(false), 1200)
    } finally {
      setSaving(false)
    }
  }

  const importanciaLabel = ['', 'Irrelevante/Bajo', 'Opcional/Medio', 'Importante/Alto', 'Fundamental/Crítico']

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Factores</h1>
          <p className="page-subtitle">Administra los 19 factores y sus subfactores. Cada cambio genera una versión automática.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '10px' }} />)}
        </div>
      ) : (
        Object.entries(grouped).map(([dim, efs]) => (
          <div key={dim} className="card" style={{ marginBottom: '20px' }}>
            <div style={{
              padding: '12px 20px', background: 'var(--color-surface-2)',
              borderBottom: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card) var(--radius-card) 0 0',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
            }}>
              {dim}
              <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                {efs.length} factores
              </span>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: '0 0 var(--radius-card) var(--radius-card)' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Factor</th>
                    <th>IS</th>
                    <th>Alcance</th>
                    <th>Subfactores</th>
                    <th>Versión</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {efs.map((f) => (
                    <tr key={f.factor_id}>
                      <td style={{ fontWeight: 500, fontSize: '13px' }}>{f.factor_name}</td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '12px', fontWeight: 700 }}>{f.importancia_sugerida}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                          {importanciaLabel[f.importancia_sugerida]}
                        </span>
                      </td>
                      <td><span className="badge badge-borrador">{f.tipo_impacto}</span></td>
                      <td style={{ fontSize: '13px' }}>
                        {f.subfactores.length} total ·{' '}
                        <span style={{ color: 'var(--foda-D)' }}>{f.subfactores.filter(s => s.es_critico).length} críticos</span>
                      </td>
                      <td>
                        <span className="badge badge-opcional">v{f.version_actual}</span>
                      </td>
                      <td>
                        <button onClick={() => handleEdit(f)} className="btn btn-secondary btn-sm">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Edit Drawer */}
      {drawerOpen && editingFactor && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer">
            <div className="drawer-header">
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Editar Factor</h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  v{editingFactor.version_actual} · {editingFactor.dimension.dimension_name}
                </p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="btn btn-ghost btn-icon">✕</button>
            </div>
            <div className="drawer-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre del factor</label>
                  <input
                    value={editingFactor.factor_name}
                    onChange={(e) => setEditingFactor({ ...editingFactor, factor_name: e.target.value })}
                    className="input"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">IS (1-4)</label>
                    <select
                      value={editingFactor.importancia_sugerida}
                      onChange={(e) => setEditingFactor({ ...editingFactor, importancia_sugerida: parseInt(e.target.value) })}
                      className="input"
                    >
                      {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} — {importanciaLabel[n]}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de impacto</label>
                    <select
                      value={editingFactor.tipo_impacto}
                      onChange={(e) => setEditingFactor({ ...editingFactor, tipo_impacto: e.target.value as 'Interno' | 'Externo' | 'Ambos' })}
                      className="input"
                    >
                      <option>Interno</option>
                      <option>Externo</option>
                      <option>Ambos</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    value={editingFactor.descripcion || ''}
                    onChange={(e) => setEditingFactor({ ...editingFactor, descripcion: e.target.value })}
                    className="input" rows={3}
                  />
                </div>

                <hr className="divider" />

                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                    Subfactores ({editingFactor.subfactores.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {editingFactor.subfactores.map((sf) => (
                      <div key={sf.subfactor_id} style={{
                        padding: '8px 10px', background: 'var(--color-surface-2)',
                        borderRadius: '6px', border: '1px solid var(--color-border)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        {sf.es_critico && <span style={{ color: 'var(--foda-D)', fontSize: '12px' }}>★</span>}
                        <span style={{ fontSize: '12px', flex: 1 }}>{sf.subfactor_name}</span>
                        <span className="badge badge-borrador" style={{ fontSize: '10px' }}>
                          {sf.es_critico ? 'Crítico' : 'Normal'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="divider" />

                <div className="form-group">
                  <label className="form-label">Motivo del cambio <span className="required">*</span></label>
                  <textarea
                    value={motivoCambio}
                    onChange={(e) => setMotivoCambio(e.target.value)}
                    className="input" rows={2}
                    placeholder="Describe brevemente por qué se realiza este cambio..."
                  />
                </div>

                {savedMsg && (
                  <div className="alert alert-success"><span>✓</span> <span>{savedMsg}</span></div>
                )}
              </div>
            </div>
            <div className="drawer-footer">
              <button onClick={() => setDrawerOpen(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving || !motivoCambio.trim()}>
                {saving ? <><div className="spinner spinner-sm" /> Guardando...</> : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
