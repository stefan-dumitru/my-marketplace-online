const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message = (body && body.detail) || 'Something went wrong'
    throw new ApiError(response.status, message)
  }

  return body as T
}

export interface HealthStatus {
  status: string
  db: string
}

export function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>('/health')
}

export interface User {
  id: number
  email: string
  full_name: string
  is_admin: boolean
}

export function signup(
  email: string,
  password: string,
  fullName: string,
): Promise<{ message: string }> {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: fullName }),
  })
}

export function verifyEmail(token: string): Promise<{ message: string }> {
  return request('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function login(email: string, password: string): Promise<User> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout(): Promise<{ message: string }> {
  return request('/auth/logout', { method: 'POST' })
}

export function getCurrentUser(): Promise<User> {
  return request('/auth/me')
}
