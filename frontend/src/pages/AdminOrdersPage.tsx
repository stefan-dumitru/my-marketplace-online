import { useEffect, useState } from 'react'
import { getAdminOrders, getCurrentUser, type OrderListItem } from '../api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

type AccessStatus = 'checking' | 'allowed' | 'denied'

const selectClassName =
  'border-input flex h-9 w-52 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

const STATUS_VARIANT: Record<OrderListItem['status'], 'secondary' | 'destructive' | 'outline'> = {
  placed: 'secondary',
  shipped: 'outline',
  delivered: 'outline',
  cancelled: 'destructive',
}

function AdminOrdersPage() {
  const [access, setAccess] = useState<AccessStatus>('checking')
  const [orders, setOrders] = useState<OrderListItem[] | null>(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser()
      .then((user) => setAccess(user.is_admin ? 'allowed' : 'denied'))
      .catch(() => setAccess('denied'))
  }, [])

  useEffect(() => {
    if (access !== 'allowed') return
    getAdminOrders(filter || undefined)
      .then((page) => setOrders(page.items))
      .catch(() => setError('Could not load orders'))
  }, [access, filter])

  if (access === 'checking') return <p className="text-muted-foreground">Loading...</p>
  if (access === 'denied')
    return (
      <Alert variant="destructive">
        <AlertDescription>You don't have permission to view this page.</AlertDescription>
      </Alert>
    )

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">All orders</h1>

      <div className="flex flex-col gap-2">
        <Label htmlFor="statusFilter">Filter by status</Label>
        <select
          id="statusFilter"
          className={selectClassName}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="placed">Placed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {orders === null && <p className="text-muted-foreground">Loading orders...</p>}
      {orders !== null && orders.length === 0 && (
        <p className="text-muted-foreground">No orders match this filter.</p>
      )}
      {orders !== null && orders.length > 0 && (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-muted-foreground text-sm">
                      {order.seller_business_name} · {order.total_amount} lei
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default AdminOrdersPage
