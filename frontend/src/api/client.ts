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

export interface Category {
  id: number
  name: string
  slug: string
  parent_id: number | null
  children: Category[]
}

export interface ProductListItem {
  id: number
  name: string
  price: string
  stock_quantity: number
  category_id: number
  category_name: string
  seller_id: number
  seller_business_name: string
}

export interface ProductDetail extends ProductListItem {
  description: string
  images: { id: number; storage_key: string; display_order: number }[]
  created_at: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export function getCategories(): Promise<Category[]> {
  return request('/categories')
}

export interface ProductFilters {
  q?: string
  categoryId?: number
  sellerId?: number
  minPrice?: string
  maxPrice?: string
  page?: number
  pageSize?: number
}

export function getProducts(filters: ProductFilters = {}): Promise<Page<ProductListItem>> {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.categoryId !== undefined) params.set('category_id', String(filters.categoryId))
  if (filters.sellerId !== undefined) params.set('seller_id', String(filters.sellerId))
  if (filters.minPrice) params.set('min_price', filters.minPrice)
  if (filters.maxPrice) params.set('max_price', filters.maxPrice)
  params.set('page', String(filters.page ?? 1))
  params.set('page_size', String(filters.pageSize ?? 20))

  return request(`/products?${params.toString()}`)
}

export function getProduct(id: number): Promise<ProductDetail> {
  return request(`/products/${id}`)
}
