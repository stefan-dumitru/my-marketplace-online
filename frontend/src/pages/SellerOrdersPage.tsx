import { useEffect, useState } from 'react'
import { getMyOrders, updateOrderStatus, type OrderListItem } from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

const NEXT_STATUSES: Record<
  OrderListItem['status'],
  { label: string; status: OrderListItem['status'] }[]
> = {
  placed: [
    { label: 'Mark shipped', status: 'shipped' },
    { label: 'Cancel', status: 'cancelled' },
  ],
  shipped: [
    { label: 'Mark delivered', status: 'delivered' },
    { label: 'Cancel', status: 'cancelled' },
  ],
  delivered: [],
  cancelled: [],
}

function SellerOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reload() {
    getMyOrders()
      .then((page) => setOrders(page.items))
      .catch(() => setError('Could not load your orders'))
  }

  useEffect(reload, [])

  async function handleTransition(orderId: number, newStatus: OrderListItem['status']) {
    setError(null)
    try {
      await updateOrderStatus(orderId, newStatus)
      reload()
    } catch {
      setError('Could not update this order')
    }
  }

  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  if (orders === null) return <p className="text-muted-foreground">Loading...</p>

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Your orders to fulfill</h1>
      {orders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
      {orders.length > 0 && (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    Order #{order.id} — {order.total_amount} lei · {order.status}
                  </span>
                  <span className="flex gap-2">
                    {NEXT_STATUSES[order.status].map((next) => (
                      <Button
                        key={next.status}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleTransition(order.id, next.status)}
                      >
                        {next.label}
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

export default SellerOrdersPage
