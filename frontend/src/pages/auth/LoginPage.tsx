import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

type LoginForm = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { setUsuario } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [serverError, setServerError] = useState('')
  const expiredMsg = params.get('expired') && params.get('msg')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: LoginForm) => {
    setServerError('')
    try {
      const res = await api.post('/auth/login', data)
      setUsuario(res.data.usuario)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setServerError(e.response?.data?.error || 'Error al iniciar sesión')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(45,91,227,0.04) 0%, transparent 50%),
                          radial-gradient(circle at 75% 75%, rgba(26,107,72,0.03) 0%, transparent 50%)`,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px' }}>
        {/* Card */}
        <div className="card" style={{ padding: '40px 36px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              background: '#111111',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px' }}>G</span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>GUIOS PRO</h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Evaluación de Software Libre · v2
            </p>
          </div>

          {/* Expired session alert */}
          {expiredMsg && (
            <div className="alert alert-warning" style={{ marginBottom: '20px', fontSize: '13px' }}>
              <span>⚠</span>
              <span>{decodeURIComponent(params.get('msg') || '')}</span>
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <div className="alert alert-error" style={{ marginBottom: '20px', fontSize: '13px' }}>
              <span>✕</span>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">
                Correo electrónico <span className="required">*</span>
              </label>
              <input
                {...register('email')}
                type="email"
                id="login-email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="tu@email.com"
                autoComplete="email"
                autoFocus
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">
                Contraseña <span className="required">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  id="login-password"
                  className={`input ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', fontSize: '14px',
                  }}
                >
                  {showPass ? '○' : '●'}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={isSubmitting}
              style={{ marginTop: '8px' }}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner spinner-sm" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Register link */}
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={{ color: 'var(--color-accent)', fontWeight: 500, textDecoration: 'none' }}>
              Regístrate aquí
            </Link>
          </div>

          {/* Demo hint */}
          <div style={{
            marginTop: '20px',
            padding: '10px 14px',
            background: 'var(--color-surface-2)',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Admin demo:</span>{' '}
            admin@guios.pro / Admin1234!
          </div>
        </div>
      </div>
    </div>
  )
}
