import { useEffect, useState } from 'react'
import { getAdminProducts, getCurrentUser, moderateProduct, type AdminProduct } from '../api/client'
import AdminNav from './AdminNav'

type AccessStatus = 'checking' | 'allowed' | 'denied'

const ACTIONS_BY_STATUS: Record<
  AdminProduct['moderation_status'],
  { label: string; action: 'removed' | 'suspended' | 'reinstated' }[]
> = {
  active: [
    { label: 'Remove', action: 'removed' },
    { label: 'Suspend', action: 'suspended' },
  ],
  removed_by_admin: [{ label: 'Reinstate', action: 'reinstated' }],
  suspended_by_admin: [{ label: 'Reinstate', action: 'reinstated' }],
}

function AdminProductsPage() {
  const [access, setAccess] = useState<AccessStatus>('checking')
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)

  function reload() {
    getAdminProducts(filter || undefined)
      .then((page) => setProducts(page.items))
      .catch(() => setError('Could not load products'))
  }

  useEffect(() => {
    getCurrentUser()
      .then((user) => setAccess(user.is_admin ? 'allowed' : 'denied'))
      .catch(() => setAccess('denied'))
  }, [])

  useEffect(() => {
    if (access === 'allowed') reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, filter])

  if (access === 'checking') return <p>Loading...</p>
  if (access === 'denied') return <p role="alert">You don't have permission to view this page.</p>

  async function handleModerate(productId: number, action: 'removed' | 'suspended' | 'reinstated') {
    const reason =
      action === 'removed' || action === 'suspended'
        ? (window.prompt('Reason (optional):') ?? undefined)
        : undefined
    await moderateProduct(productId, action, reason)
    reload()
  }

  return (
    <main>
      <h1>Products</h1>
      <AdminNav />

      <label htmlFor="statusFilter">Filter by status</label>
      <select id="statusFilter" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="">All</option>
        <option value="active">Active</option>
        <option value="removed_by_admin">Removed</option>
        <option value="suspended_by_admin">Suspended</option>
      </select>

      {error && <p role="alert">{error}</p>}
      {products === null && <p>Loading products...</p>}
      {products !== null && products.length === 0 && <p>No products match this filter.</p>}
      <ul>
        {(products ?? []).map((product) => (
          <li key={product.id}>
            {product.name} ({product.seller_business_name}) — {product.moderation_status}{' '}
            {ACTIONS_BY_STATUS[product.moderation_status].map((opt) => (
              <button
                key={opt.action}
                type="button"
                onClick={() => handleModerate(product.id, opt.action)}
              >
                {opt.label}
              </button>
            ))}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default AdminProductsPage
