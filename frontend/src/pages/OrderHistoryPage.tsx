import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getOrders, type OrderListItem } from '../api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const STATUS_VARIANT: Record<OrderListItem['status'], 'secondary' | 'destructive' | 'outline'> = {
  placed: 'secondary',
  shipped: 'outline',
  delivered: 'outline',
  cancelled: 'destructive',
}

function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderListItem[] | null>(null)

  useEffect(() => {
    getOrders()
      .then((page) => setOrders(page.items))
      .catch(() => setOrders([]))
  }, [])

  if (orders === null) return <p className="text-muted-foreground">Loading...</p>

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Your orders</h1>
      {orders.length === 0 && (
        <p className="text-muted-foreground">You haven't placed any orders yet.</p>
      )}
      {orders.length > 0 && (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link to={`/orders/${order.id}`}>
                <Card className="transition-shadow hover:shadow-md">
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default OrderHistoryPage
