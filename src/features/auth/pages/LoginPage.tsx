import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { loginSchema, type LoginCredentials } from '@/shared/types/auth.types'

export const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading, error } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (credentials: LoginCredentials) => {
    await login(credentials)
  }

  return (
    <div className="login-container">
      {/* Left Panel */}
      <div className="left-panel">
        <div>
          <div className="logo-box">
            <svg className="logo-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>

          <p className="system-label">Sistema de Gestión</p>

          <h1 className="headline">
            Sistema de
            <br />
            Simulación
            <br />
            <span className="headline-accent">sin límites</span>
          </h1>

          <p className="description">
            Plataforma centralizada para la administración segura de simulaciones, observaciones y
            reportes en tiempo real.
          </p>
        </div>

        <p className="footer-text">© 2025 SIMCORE — Todos los derechos reservados</p>
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="form-wrapper">
          <div className="mobile-logo">
            <h1>
              <span className="mobile-logo-accent">SIM</span>CORE
            </h1>
          </div>

          <div className="form-card">
            <div className="form-header">
              <p className="form-label-small">Sistema de Gestión</p>
              <h2 className="form-title">Bienvenido de vuelta</h2>
              <p className="form-subtitle">Ingresa tus credenciales para continuar</p>
            </div>

            {error && (
              <div className="error-alert">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ flexShrink: 0, color: '#dc2626' }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="error-text">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input
                  type="email"
                  {...register('email')}
                  disabled={isLoading}
                  placeholder="usuario@ejemplo.com"
                  className="form-input"
                />
                {errors.email && (
                  <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <div className="password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    disabled={isLoading}
                    placeholder="••••••••"
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="submit-button"
                style={{ marginTop: '8px' }}
              >
                {isLoading ? (
                  <>
                    <svg className="spinner" viewBox="0 0 24 24">
                      <circle
                        style={{ opacity: 0.25 }}
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        style={{ opacity: 0.75 }}
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Autenticando...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>

            <div className="version-footer">
              <p className="version-text">v1.0.0 · Sistema Seguro</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
