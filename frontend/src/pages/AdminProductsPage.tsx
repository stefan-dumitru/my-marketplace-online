import { useEffect, useState } from 'react'
import { getAdminProducts, getCurrentUser, moderateProduct, type AdminProduct } from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

type AccessStatus = 'checking' | 'allowed' | 'denied'

const selectClassName =
  'border-input flex h-9 w-52 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

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

  if (access === 'checking') return <p className="text-muted-foreground">Loading...</p>
  if (access === 'denied')
    return (
      <Alert variant="destructive">
        <AlertDescription>You don't have permission to view this page.</AlertDescription>
      </Alert>
    )

  async function handleModerate(productId: number, action: 'removed' | 'suspended' | 'reinstated') {
    const reason =
      action === 'removed' || action === 'suspended'
        ? (window.prompt('Reason (optional):') ?? undefined)
        : undefined
    await moderateProduct(productId, action, reason)
    reload()
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Products</h1>

      <div className="flex flex-col gap-2">
        <Label htmlFor="statusFilter">Filter by status</Label>
        <select
          id="statusFilter"
          className={selectClassName}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="removed_by_admin">Removed</option>
          <option value="suspended_by_admin">Suspended</option>
        </select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {products === null && <p className="text-muted-foreground">Loading products...</p>}
      {products !== null && products.length === 0 && (
        <p className="text-muted-foreground">No products match this filter.</p>
      )}
      {products !== null && products.length > 0 && (
        <ul className="flex flex-col gap-3">
          {products.map((product) => (
            <li key={product.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    {product.name} ({product.seller_business_name}) — {product.moderation_status}
                  </span>
                  <span className="flex gap-2">
                    {ACTIONS_BY_STATUS[product.moderation_status].map((opt) => (
                      <Button
                        key={opt.action}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleModerate(product.id, opt.action)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default AdminProductsPage
