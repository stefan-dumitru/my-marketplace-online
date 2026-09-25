const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
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

export interface ProductImage {
  id: number
  storage_key: string
  display_order: number
  url: string
}

export interface ProductDetail extends ProductListItem {
  description: string
  images: ProductImage[]
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

export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface SellerApplication {
  id: number
  business_name: string
  status: SellerStatus
  submitted_at: string
  decided_at: string | null
}

export function applySeller(businessName: string): Promise<SellerApplication> {
  return request('/sellers/apply', {
    method: 'POST',
    body: JSON.stringify({ business_name: businessName }),
  })
}

export function getMyApplication(): Promise<SellerApplication> {
  return request('/sellers/me/application')
}

export function getPendingSellers(): Promise<SellerApplication[]> {
  return request('/admin/sellers?status_filter=pending')
}

export function approveSeller(sellerId: number): Promise<SellerApplication> {
  return request(`/admin/sellers/${sellerId}/approve`, { method: 'POST' })
}

export function rejectSeller(sellerId: number, reason?: string): Promise<SellerApplication> {
  return request(`/admin/sellers/${sellerId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  })
}

export interface SellerProduct {
  id: number
  name: string
  description: string
  price: string
  stock_quantity: number
  category_id: number
  is_active: boolean
  moderation_status: string
  created_at: string
  updated_at: string
}

export function getMyProducts(): Promise<Page<SellerProduct>> {
  return request('/sellers/me/products')
}

export interface ProductInput {
  name: string
  description: string
  price: string
  category_id: number
  stock_quantity: number
}

export function createProduct(input: ProductInput): Promise<SellerProduct> {
  return request('/sellers/me/products', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateProduct(
  id: number,
  updates: Partial<ProductInput & { is_active: boolean }>,
): Promise<SellerProduct> {
  return request(`/sellers/me/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export function uploadProductImage(productId: number, file: File): Promise<{ id: number }> {
  const formData = new FormData()
  formData.append('file', file)
  return request(`/sellers/me/products/${productId}/images`, {
    method: 'POST',
    body: formData,
  })
}
