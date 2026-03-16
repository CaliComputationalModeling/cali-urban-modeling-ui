/**
 * HTTP Client Robusto - Patrón Singleton
 * 
 * Responsabilidades:
 * - Manejo centralizado de requests/responses
 * - Autenticación con tokens JWT
 * - Interceptores de error y reintentos
 * - Timeout handling
 * - Type-safe requests y responses
 * 
 * Sigue Clean Code principles:
 * - Single Responsibility Principle
 * - Dependency Inversion
 * - Open/Closed Principle (interceptores extensibles)
 */

import { getApiUrl } from '@/config/env'

export interface HttpRequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>
  timeout?: number
  retries?: number
  skipAuth?: boolean
}

export interface HttpResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown,
    message?: string
  ) {
    super(message || `HTTP ${status}: ${statusText}`)
    this.name = 'HttpError'
  }
}

export type RequestInterceptor = (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>
export type ResponseInterceptor = <T>(response: HttpResponse<T>) => HttpResponse<T> | Promise<HttpResponse<T>>
export type ErrorInterceptor = (error: HttpError) => void | Promise<void>

class HttpClientImpl {
  private baseUrl: string
  private timeout: number = 30000
  private maxRetries: number = 3

  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
  }

  /**
   * Registra interceptor para peticiones
   * Permite modificar headers, agregar auth, etc.
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  /**
   * Registra interceptor para respuestas exitosas
   * Permite normalizar datos, cachear, etc.
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }

  /**
   * Registra interceptor para errores
   * Permite logging centralizado, retry logic, etc.
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor)
  }

  /**
   * Ejecuta interceptores de request
   */
  private async executeRequestInterceptors(config: HttpRequestConfig): Promise<HttpRequestConfig> {
    let finalConfig = config

    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig)
    }

    return finalConfig
  }

  /**
   * Ejecuta interceptores de response
   */
  private async executeResponseInterceptors<T>(response: HttpResponse<T>): Promise<HttpResponse<T>> {
    let finalResponse = response

    for (const interceptor of this.responseInterceptors) {
      finalResponse = await interceptor(finalResponse)
    }

    return finalResponse
  }

  /**
   * Ejecuta interceptores de error
   */
  private async executeErrorInterceptors(error: HttpError): Promise<void> {
    for (const interceptor of this.errorInterceptors) {
      await interceptor(error)
    }
  }

  /**
   * Construye la URL con parámetros query
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return url.toString()
  }

  /**
   * Implementa retry logic con exponential backoff
   */
  private async executeWithRetry(
    fn: () => Promise<Response>,
    remainingRetries: number
  ): Promise<Response> {
    try {
      return await this.withTimeout(fn(), this.timeout)
    } catch (error) {
      if (remainingRetries === 0) {
        throw error
      }

      // Exponential backoff: 1000ms * (3 - remainingRetries)^2
      const delay = 1000 * Math.pow(3 - remainingRetries, 2)
      await this.sleep(delay)

      return this.executeWithRetry(fn, remainingRetries - 1)
    }
  }

  /**
   * Envuelve una promesa con timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ])
  }

  /**
   * Utilidad para delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Realiza request HTTP genérico
   */
  private async request<T>(
    endpoint: string,
    config: HttpRequestConfig = {}
  ): Promise<HttpResponse<T>> {
    const {
      params,
      timeout = this.timeout,
      retries = this.maxRetries,
      skipAuth = false,
      ...fetchConfig
    } = config

    // Construir URL
    const url = this.buildUrl(endpoint, params)

    // Preparar headers
    let headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchConfig.headers,
    }

    // Agregar autenticación si no está skipped
    if (!skipAuth) {
      const token = this.getAuthToken()
      if (token) {
        headers = {
          ...headers,
          'Authorization': `Bearer ${token}`,
        }
      }
    }

    // Crear config de request
    let requestConfig: HttpRequestConfig = {
      ...fetchConfig,
      headers,
      timeout,
    }

    // Ejecutar interceptores de request
    requestConfig = await this.executeRequestInterceptors(requestConfig)

    // Ejecutar request con retry
    const response = await this.executeWithRetry(
      () => fetch(url, requestConfig as RequestInit),
      retries
    )

    // Parsear respuesta
    let data: T
    try {
      data = await response.json()
    } catch {
      data = response.statusText as unknown as T
    }

    // Construir HttpResponse
    const httpResponse: HttpResponse<T> = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    }

    // Validar status
    if (!response.ok) {
      const error = new HttpError(
        response.status,
        response.statusText,
        data,
        `HTTP Error ${response.status}: ${response.statusText}`
      )

      await this.executeErrorInterceptors(error)
      throw error
    }

    // Ejecutar interceptores de response
    return this.executeResponseInterceptors(httpResponse)
  }

  /**
   * Obtiene token de autenticación
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'GET',
    })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  /**
   * DELETE request
   */
  async delete<T = void>(endpoint: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
    })
  }
}

// Instancia singleton
let httpClientInstance: HttpClientImpl | null = null

/**
 * Factory function para obtener la instancia del cliente HTTP
 * Permite usar la URL base del .env o un default
 */
export function createHttpClient(baseUrl?: string): HttpClientImpl {
  if (!httpClientInstance) {
    const url = baseUrl || getApiUrl()
    httpClientInstance = new HttpClientImpl(url)
  }
  return httpClientInstance
}

/**
 * Getter para la instancia global
 */
export function getHttpClient(): HttpClientImpl {
  if (!httpClientInstance) {
    return createHttpClient()
  }
  return httpClientInstance
}

// Export singleton
export const httpClient = new Proxy(new HttpClientImpl(getApiUrl()), {
  get(target, prop) {
    return (target as any)[prop]
  },
})
