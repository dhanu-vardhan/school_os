export type ApiErrorCode = 'NETWORK' | 'TIMEOUT' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'NOT_IMPLEMENTED' | 'SERVER'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: ApiErrorCode,
    public correlationId?: string,
    public details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function normaliseError(status: number, body: unknown, correlationId?: string): ApiError {
  const payload = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const message = typeof payload.message === 'string' ? payload.message
    : typeof payload.error === 'string' ? payload.error : 'Request failed'
  const code: ApiErrorCode = status === 401 ? 'UNAUTHENTICATED'
    : status === 403 ? 'FORBIDDEN'
      : status === 404 ? 'NOT_FOUND'
        : status === 422 || status === 400 ? 'VALIDATION'
          : status === 501 ? 'NOT_IMPLEMENTED' : 'SERVER'
  return new ApiError(message, status, code, correlationId, payload.details as Record<string, string[]> | undefined)
}
