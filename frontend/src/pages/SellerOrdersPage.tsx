import { useEffect, useState } from 'react'
import { getMyOrders, updateOrderStatus, type OrderListItem } from '../api/client'

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

  if (error) return <p role="alert">{error}</p>
  if (orders === null) return <p>Loading...</p>

  return (
    <main>
      <h1>Your orders to fulfill</h1>
      {orders.length === 0 && <p>No orders yet.</p>}
      <ul>
        {orders.map((order) => (
          <li key={order.id}>
            Order #{order.id} — {order.total_amount} lei · {order.status}{' '}
            {NEXT_STATUSES[order.status].map((next) => (
              <button
                key={next.status}
                type="button"
                onClick={() => handleTransition(order.id, next.status)}
              >
                {next.label}
              </button>
            ))}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default SellerOrdersPage
