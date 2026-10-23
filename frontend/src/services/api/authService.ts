import type { AuthSessionResponse } from '../../types/auth.types'

const basePath = '/api/v1/auth'

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${basePath}${path}`, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
    })
  } catch {
    throw new Error('Could not connect to AuRA. Start the backend and try again.')
  }
}

async function requireSuccess(response: Response): Promise<void> {
  if (response.ok) return
  const body: unknown = await response.json().catch(() => null)
  const error = body && typeof body === 'object' && 'error' in body ? body.error : null
  const message = error && typeof error === 'object' && 'message' in error &&
    typeof error.message === 'string' ? error.message : 'AuRA could not complete this request.'
  throw new Error(message)
}

async function sessionBody(response: Response): Promise<AuthSessionResponse> {
  await requireSuccess(response)
  const body: unknown = await response.json().catch(() => null)
  if (!body || typeof body !== 'object' || !('user' in body) ||
    !body.user || typeof body.user !== 'object' ||
    !('id' in body.user) || typeof body.user.id !== 'string' ||
    !('email' in body.user) || typeof body.user.email !== 'string' ||
    !('csrfToken' in body) || typeof body.csrfToken !== 'string')
    throw new Error('AuRA returned an invalid session. Please try again.')
  return body as AuthSessionResponse
}

export const authService = {
  async restore(): Promise<AuthSessionResponse | null> {
    const response = await request('/session')
    if (response.status === 401) return null
    return sessionBody(response)
  },
  async signIn(mode: 'login' | 'register', email: string, password: string): Promise<AuthSessionResponse> {
    const response = await request(`/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    return sessionBody(response)
  },
  async signOut(csrfToken: string): Promise<void> {
    const response = await request('/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
    })
    await requireSuccess(response)
  },
}
