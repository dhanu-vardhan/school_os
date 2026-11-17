import { API_BASE_PATH, USE_MOCK } from './env'
import { mockRequest } from './mock/adapter'
import { ApiError, normaliseError, type ApiErrorCode } from './errors'
import { sessionStore } from './session-store'

export interface ApiResponse<T> { data: T; mock?: boolean; correlationId?: string }
export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS'
export interface RequestSpec { path: string; method: Method; body: any }

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const correlationId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined

  if (USE_MOCK) {
    try {
      return mockRequest<T>({
        path,
        method: (init.method ?? 'GET').toUpperCase() as Method,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      })
    } catch (err) {
      const e = err as Error & { status?: number; code?: string }
      const status = e.status ?? 501
      throw new ApiError(e.message, status, (e.code as ApiErrorCode) ?? 'NOT_IMPLEMENTED', correlationId)
    }
  }

  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (!safeMethods.has(method)) {
    const csrf = sessionStore.csrfToken
    if (csrf) headers.set('X-CSRF-Token', csrf)
  }
  if (correlationId) headers.set('X-Request-Id', correlationId)
  // Deliberately no X-School-Id: the BFF derives the tenant from the signed session.

  const url = path.startsWith('/v1/') ? `${API_BASE_PATH}${path}` : path
  try {
    const res = await fetch(url, {
      ...init, method, headers, credentials: 'include',
      signal: AbortSignal.timeout(15_000),
    })
    const text = await res.text()
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { body = text }
    if (!res.ok) throw normaliseError(res.status, body, correlationId)
    return { data: body as T, mock: false, correlationId }
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new ApiError('The server took too long to respond.', 408, 'TIMEOUT', correlationId)
    }
    throw new ApiError('Network unavailable. Check your connection.', 0, 'NETWORK', correlationId)
  }
}

export const jsonBody = (value: unknown) => JSON.stringify(value)
