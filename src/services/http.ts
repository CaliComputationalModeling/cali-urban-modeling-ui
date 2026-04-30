const API_BASE_URL = 'http://localhost:3000'

export const AUTH_TOKEN_KEY = 'auth_token'

interface RequestConfig extends RequestInit {
  params?: Record<string, string>
}

interface HttpResponse<T> {
  data: T
  status: number
  ok: boolean
}

class HttpClient {
  private baseUrl: string
  private unauthorizedHandler: (() => void) | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  onUnauthorized(handler: () => void): void {
    this.unauthorizedHandler = handler
  }

  private getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    let url = `${this.baseUrl}${endpoint}`
    if (params) {
      url += `?${new URLSearchParams(params).toString()}`
    }
    return url
  }

  private buildHeaders(customHeaders?: HeadersInit): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string>),
    }

    const token = this.getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<HttpResponse<T>> {
    const { params, ...init } = config
    const url = this.buildUrl(endpoint, params)
    const hadToken = Boolean(this.getAuthToken())
    const headers = this.buildHeaders(init.headers)

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        credentials: 'include',
      })

      if (response.status === 401 && hadToken) {
        this.unauthorizedHandler?.()
      }

      const contentType = response.headers.get('content-type')
      let data: T = null as T

      if (contentType?.includes('application/json')) {
        data = await response.json()
      }

      return { data, status: response.status, ok: response.ok }
    } catch (error) {
      console.error('[HTTP_CLIENT_ERROR]:', error)

      return {
        data: { detail: 'Error de red o conexión rechazada' } as unknown as T,
        status: 500,
        ok: false,
      }
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }
}

export const http = new HttpClient(API_BASE_URL)
export default http
