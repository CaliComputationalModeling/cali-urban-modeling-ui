"use client"

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import http from '../../../services/http'

export const LoginPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // ✅ USAR TU CLIENTE HTTP
      const { data, ok } = await http.post<{
        rol: string
        user_id: string
      }>('/auth/login', { email, password })

      if (!ok) {
        throw new Error('Credenciales incorrectas')
      }

      localStorage.setItem('user_role', data.rol)
      localStorage.setItem('user_id', data.user_id)

      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="left-panel">
        <div>
          <div className="logo-box">
            <svg className="logo-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>

          <p className="system-label">Sistema de Gestión</p>

          <h1 className="headline">
            Sistema de<br />
            Simulación<br />
            <span className="headline-accent">sin límites</span>
          </h1>

          <p className="description">
            Plataforma centralizada para la administración segura de simulaciones,
            observaciones y reportes en tiempo real.
          </p>
        </div>

        <div>
          <p className="footer-text">
            © 2025 SIMCORE - Todos los derechos reservados
          </p>
        </div>
      </div>

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
                <p className="error-text">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="usuario@ejemplo.com"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="••••••••"
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="submit-button"
              >
                {isLoading ? (
                  <>
                    <svg className="spinner" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" fill="none" />
                      <path style={{ opacity: 0.75 }} fill="currentColor"
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
              <p className="version-text">v1.0.0 • Sistema Seguro</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}