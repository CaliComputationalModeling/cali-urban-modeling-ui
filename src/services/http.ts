const API_BASE_URL = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

interface RequestConfig extends RequestInit {
  params?: Record<string, string>
  responseType?: 'auto' | 'json' | 'blob' | 'arrayBuffer' | 'text'
}

interface HttpResponse<T> {
  data: T
  status: number
  ok: boolean
  headers: Headers
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

    return headers
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<HttpResponse<T>> {
    const { params, responseType = 'auto', ...init } = config
    const url = this.buildUrl(endpoint, params)
    const headers = this.buildHeaders(init.headers)

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        credentials: 'include',
      })

      if (response.status === 401) {
        this.unauthorizedHandler?.()
      }

      const contentType = response.headers.get('content-type') ?? ''
      let data: T = null as T

      const shouldParseJson =
        responseType === 'json' || (responseType === 'auto' && contentType.includes('application/json'))

      if (shouldParseJson) {
        data = (await response.json()) as T
      } else if (responseType === 'blob') {
        data = (await response.blob()) as T
      } else if (responseType === 'arrayBuffer') {
        data = (await response.arrayBuffer()) as T
      } else if (responseType === 'text') {
        data = (await response.text()) as T
      }

      return { data, status: response.status, ok: response.ok, headers: response.headers }
    } catch (error) {
      console.error('[HTTP_CLIENT_ERROR]:', error)

      return {
        data: { detail: 'Error de red o conexión rechazada' } as unknown as T,
        status: 500,
        ok: false,
        headers: new Headers(),
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

  async postForm<T>(endpoint: string, body: FormData, config: RequestConfig = {}): Promise<HttpResponse<T>> {
    const { params, responseType = 'auto', ...init } = config
    const url = this.buildUrl(endpoint, params)

    try {
      const response = await fetch(url, {
        ...init,
        method: 'POST',
        body,
        headers: init.headers,
        credentials: 'include',
      })

      if (response.status === 401) this.unauthorizedHandler?.()

      const contentType = response.headers.get('content-type') ?? ''
      let data: T = null as T
      const shouldParseJson = responseType === 'json' || (responseType === 'auto' && contentType.includes('application/json'))
      if (shouldParseJson) data = (await response.json()) as T
      else if (responseType === 'text') data = (await response.text()) as T

      return { data, status: response.status, ok: response.ok, headers: response.headers }
    } catch (error) {
      console.error('[HTTP_CLIENT_ERROR]:', error)
      return {
        data: { detail: 'Error de red o conexión rechazada' } as unknown as T,
        status: 500,
        ok: false,
        headers: new Headers(),
      }
    }
  }

  async postBlob(
    endpoint: string,
    body?: unknown,
    config?: Omit<RequestConfig, 'responseType'>
  ): Promise<HttpResponse<Blob>> {
    return this.request<Blob>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(body),
      responseType: 'blob',
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

  async put<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }
}

export const http = new HttpClient(API_BASE_URL)
export default http
