import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

const schema = z.object({
  usuario_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setUsuario } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: RegisterForm) => {
    setServerError('')
    try {
      const res = await api.post('/auth/register', {
        usuario_name: data.usuario_name,
        email: data.email,
        password: data.password,
      })
      setUsuario(res.data.usuario)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setServerError(e.response?.data?.error || 'Error al registrarse')
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
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `radial-gradient(circle at 30% 70%, rgba(45,91,227,0.04) 0%, transparent 50%)`,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px' }}>
        <div className="card" style={{ padding: '40px 36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '52px', height: '52px', background: '#111111',
              borderRadius: '12px', marginBottom: '14px',
            }}>
              <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px' }}>G</span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Crear cuenta</h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              El primer registro obtendrá rol de Administrador
            </p>
          </div>

          {serverError && (
            <div className="alert alert-error" style={{ marginBottom: '16px', fontSize: '13px' }}>
              <span>✕</span> <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Nombre completo <span className="required">*</span></label>
              <input {...register('usuario_name')} type="text" id="reg-name"
                className={`input ${errors.usuario_name ? 'input-error' : ''}`}
                placeholder="Juan García" autoFocus />
              {errors.usuario_name && <p className="error-text">{errors.usuario_name.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Correo electrónico <span className="required">*</span></label>
              <input {...register('email')} type="email" id="reg-email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="tu@email.com" />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input {...register('password')} type={showPass ? 'text' : 'password'} id="reg-password"
                  className={`input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Mínimo 8 caracteres" style={{ paddingRight: '42px' }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '14px',
                }}>{showPass ? '○' : '●'}</button>
              </div>
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar contraseña <span className="required">*</span></label>
              <input {...register('confirmPassword')} type={showPass ? 'text' : 'password'} id="reg-confirm"
                className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="Repite la contraseña" />
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" id="reg-submit" className="btn btn-primary btn-lg btn-full"
              disabled={isSubmitting} style={{ marginTop: '6px' }}>
              {isSubmitting ? <><div className="spinner spinner-sm" /> Creando cuenta...</> : 'Crear cuenta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 500, textDecoration: 'none' }}>
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
