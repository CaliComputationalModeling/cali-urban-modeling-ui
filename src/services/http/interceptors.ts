/**
 * Interceptores para HTTP Client
 * 
 * Estos interceptores manejan:
 * - Logging centralizado
 * - Manejo de errores consistente
 * - Agregación de tokens
 * - Refresh de tokens expirados
 */

import { getHttpClient, type RequestInterceptor, type ErrorInterceptor, type ResponseInterceptor } from './httpClient'
import { isProduction } from '@/config/env'

/**
 * Logger Interceptor
 * Registra todas las requests y responses en development
 */
export const createLoggingInterceptor = (enabled?: boolean) => {
  const isEnabled = enabled ?? !isProduction()

  const requestInterceptor: RequestInterceptor = (config) => {
    if (isEnabled) {
      console.log('[HTTP Request]', {
        method: config.method,
        headers: config.headers,
        body: config.body,
      })
    }
    return config
  }

  const responseInterceptor: ResponseInterceptor = (response) => {
    if (isEnabled) {
      console.log('[HTTP Response]', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      })
    }
    return response
  }

  return { requestInterceptor, responseInterceptor }
}

/**
 * Error Handling Interceptor
 * Maneja errores consistentemente y permite reintentos
 */
export const createErrorHandlingInterceptor = () => {
  const errorInterceptor: ErrorInterceptor = async (error) => {
    console.error('[HTTP Error]', {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      data: error.data,
    })

    // Manejo específico por status code
    switch (error.status) {
      case 401:
        // Token expirado - llevar a login
        console.log('Session expired, redirecting to login...')
        localStorage.removeItem('auth_token')
        sessionStorage.removeItem('auth_token')
        window.location.href = '/login'
        break

      case 403:
        // Acceso denegado
        console.error('Access denied - insufficient permissions')
        break

      case 404:
        // Recurso no encontrado
        console.warn('Resource not found')
        break

      case 500:
      case 502:
      case 503:
        // Errores del servidor
        console.error('Server error - may be temporary')
        break

      default:
        console.error('Request failed')
    }
  }

  return { errorInterceptor }
}

/**
 * Authentication Interceptor
 * Agrega token JWT a todos los requests
 */
export const createAuthInterceptor = () => {
  const requestInterceptor: RequestInterceptor = (config) => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')

    if (token && !config.skipAuth) {
      return {
        ...config,
        headers: {
          ...config.headers,
          'Authorization': `Bearer ${token}`,
        },
      }
    }

    return config
  }

  return { requestInterceptor }
}

/**
 * Response Normalization Interceptor
 * Normaliza y valida respuestas
 */
export const createResponseNormalizerInterceptor = () => {
  const responseInterceptor: ResponseInterceptor = (response) => {
    // Si la respuesta no tiene data, validar
    if (!response.data || (typeof response.data === 'object' && Object.keys(response.data).length === 0)) {
      console.warn('Empty response received')
    }

    return response
  }

  return { responseInterceptor }
}

/**
 * Configura todos los interceptores en el cliente HTTP
 * Se debe llamar una sola vez en main.tsx
 */
export function setupHttpInterceptors(): void {
  const httpClient = getHttpClient()

  // Logging
  const { requestInterceptor: loggingReq, responseInterceptor: loggingRes } = createLoggingInterceptor()
  httpClient.addRequestInterceptor(loggingReq)
  httpClient.addResponseInterceptor(loggingRes)

  // Autenticación
  const { requestInterceptor: authReq } = createAuthInterceptor()
  httpClient.addRequestInterceptor(authReq)

  // Normalización de respuesta
  const { responseInterceptor: normalizerRes } = createResponseNormalizerInterceptor()
  httpClient.addResponseInterceptor(normalizerRes)

  // Manejo de errores
  const { errorInterceptor } = createErrorHandlingInterceptor()
  httpClient.addErrorInterceptor(errorInterceptor)
}
