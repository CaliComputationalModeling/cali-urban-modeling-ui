const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"

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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<HttpResponse<T>> {
    const { params, ...init } = config

    let url = `${this.baseUrl}${endpoint}`

    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }

    const token = localStorage.getItem("auth_token")

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...init.headers,
    }

    if (token) {
      ;(headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...init,
      headers,
    })

    const data = await response.json()

    return {
      data,
      status: response.status,
      ok: response.ok,
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "GET" })
  }

  async post<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  async put<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PUT",
      body: JSON.stringify(body),
    })
  }

  async patch<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PATCH",
      body: JSON.stringify(body),
    })
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" })
  }
}

export const http = new HttpClient(API_BASE_URL)
export default http
