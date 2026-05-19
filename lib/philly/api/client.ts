/* ---------------------------------------------------------------
   Generic API Client — Philly Dashboard
   Wraps fetch with typed responses, error handling, and auth headers.
   --------------------------------------------------------------- */

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface ApiClientConfig {
  baseUrl: string
  headers?: Record<string, string>
  timeout?: number
}

export class ApiClient {
  private baseUrl: string
  private headers: Record<string, string>
  private timeout: number

  constructor({ baseUrl, headers = {}, timeout = 15000 }: ApiClientConfig) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    }
    this.timeout = timeout
  }

  /* ---- Header management ---- */

  setHeader(key: string, value: string): void {
    this.headers[key] = value
  }

  removeHeader(key: string): void {
    delete this.headers[key]
  }

  /* ---- Factory ---- */

  static create(baseUrl: string): ApiClient {
    return new ApiClient({ baseUrl })
  }

  /* ---- HTTP verbs ---- */

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET' })
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'DELETE' })
  }

  /* ---- Internal fetch wrapper ---- */

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      const res = await fetch(url, {
        ...init,
        headers: { ...this.headers },
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        return { data: null, error: `${res.status} ${text}` }
      }

      /* Handle 204 No Content */
      if (res.status === 204) {
        return { data: null, error: null }
      }

      const data = (await res.json()) as T
      return { data, error: null }
    } catch (err: unknown) {
      clearTimeout(timer)

      if (err instanceof DOMException && err.name === 'AbortError') {
        return { data: null, error: 'Request timed out' }
      }

      const message =
        err instanceof Error ? err.message : 'Unknown network error'
      return { data: null, error: message }
    }
  }
}

/* ---- Default singleton ---- */

const baseUrl =
  (typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_API_URL) ||
  '/philly/api'

export const api = new ApiClient({ baseUrl })
