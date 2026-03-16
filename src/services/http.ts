const API_BASE_URL = "http://localhost:3000";

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
}

interface HttpResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<HttpResponse<T>> {
    const { params, ...init } = config;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...init.headers,
    };

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        credentials: "include", 
      });

      const contentType = response.headers.get("content-type");
      let data: T = null as T;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      }

      return {
        data,
        status: response.status,
        ok: response.ok,
      };
    } catch (error) {
      console.error("[HTTP_CLIENT_ERROR]:", error);
      
      return {
        data: { detail: "Error de red o conexión rechazada" } as unknown as T,
        status: 500,
        ok: false,
      };
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }
}

export const http = new HttpClient(API_BASE_URL);
export default http;