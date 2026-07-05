import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '../../services/api'
import { TIPOS_SOFTWARE } from '../../types'
import { useEvaluacionStore } from '../../store/evaluacion.store'

const schema = z.object({
  software_nombre: z.string().min(1, 'El nombre del software es requerido'),
  software_version: z.string().optional(),
  software_tipo: z.string().min(1, 'El tipo es requerido'),
  software_sitio_web: z.string().url('URL inválida').optional().or(z.literal('')),
  software_licencia: z.string().min(1, 'La licencia es requerida'),
  software_descripcion: z.string().optional(),
  organizacion_nombre: z.string().optional(),
  organizacion_sector: z.string().optional(),
  evaluador_nombre: z.string().optional(),
  contexto_evaluacion: z.string().optional(),
  fecha_limite: z.string().optional(),
})

type EvalForm = z.infer<typeof schema>

export default function NuevaEvaluacionPage() {
  const navigate = useNavigate()
  const { setEvaluacionId, setSoftwareNombre } = useEvaluacionStore()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EvalForm>({
    resolver: zodResolver(schema),
    defaultValues: { software_tipo: 'Otro' },
  })

  const onSubmit = async (data: EvalForm) => {
    setServerError('')
    try {
      const res = await api.post('/evaluaciones', {
        ...data,
        software_sitio_web: data.software_sitio_web || undefined,
      })
      const ev = res.data.evaluacion
      setEvaluacionId(ev.evaluacion_id)
      setSoftwareNombre(ev.software_nombre)
      navigate(`/evaluaciones/${ev.evaluacion_id}/wizard`)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setServerError(e.response?.data?.error || 'Error al crear la evaluación')
    }
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva Evaluación</h1>
          <p className="page-subtitle">Configura el contexto del software y la organización antes de comenzar la evaluación</p>
        </div>
      </div>

      {serverError && (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          <span>✕</span> <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section 1: Software */}
        <div className="card">
          <div className="card-body">
            <h2 className="section-title">
              <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600 }}>01</span>
              Información del Software
            </h2>
            <p className="section-subtitle">Datos del software FLOSS que se va a evaluar</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Nombre del software <span className="required">*</span></label>
                <input {...register('software_nombre')} type="text" className={`input ${errors.software_nombre ? 'input-error' : ''}`}
                  placeholder="ej. LibreOffice, PostgreSQL, WordPress..." autoFocus />
                {errors.software_nombre && <p className="error-text">{errors.software_nombre.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Versión evaluada</label>
                <input {...register('software_version')} type="text" className="input" placeholder="ej. 24.8.2" />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de software <span className="required">*</span></label>
                <select {...register('software_tipo')} className={`input ${errors.software_tipo ? 'input-error' : ''}`}>
                  {TIPOS_SOFTWARE.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.software_tipo && <p className="error-text">{errors.software_tipo.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Sitio web oficial</label>
                <input {...register('software_sitio_web')} type="url" className="input" placeholder="https://..." />
                {errors.software_sitio_web && <p className="error-text">{errors.software_sitio_web.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Licencia FLOSS <span className="required">*</span></label>
                <input {...register('software_licencia')} type="text" className={`input ${errors.software_licencia ? 'input-error' : ''}`}
                  placeholder="ej. MIT, GPL-3.0, Apache 2.0" />
                {errors.software_licencia && <p className="error-text">{errors.software_licencia.message}</p>}
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Descripción breve</label>
                <textarea {...register('software_descripcion')} className="input" rows={3}
                  placeholder="Describe brevemente qué hace este software y por qué se está evaluando..." />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Organization */}
        <div className="card">
          <div className="card-body">
            <h2 className="section-title">
              <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600 }}>02</span>
              Contexto de la Organización
            </h2>
            <p className="section-subtitle">Información organizacional que contextualiza la evaluación</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nombre de la organización</label>
                <input {...register('organizacion_nombre')} type="text" className="input" placeholder="Mi Empresa S.A." />
              </div>

              <div className="form-group">
                <label className="form-label">Sector / Industria</label>
                <input {...register('organizacion_sector')} type="text" className="input" placeholder="ej. Educación, Salud, Finanzas" />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del evaluador</label>
                <input {...register('evaluador_nombre')} type="text" className="input" placeholder="Juan García" />
              </div>

              <div className="form-group">
                <label className="form-label">Fecha límite de evaluación</label>
                <input {...register('fecha_limite')} type="date" className="input"
                  min={new Date().toISOString().split('T')[0]} />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notas de contexto</label>
                <textarea {...register('contexto_evaluacion')} className="input" rows={4}
                  placeholder="Describe el contexto específico de la evaluación, requisitos especiales, restricciones organizacionales, etc..." />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <><div className="spinner spinner-sm" /> Creando evaluación...</>
            ) : (
              'Iniciar evaluación →'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
