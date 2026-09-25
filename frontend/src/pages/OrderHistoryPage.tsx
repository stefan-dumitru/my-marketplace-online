import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getOrders, type OrderListItem } from '../api/client'

function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderListItem[] | null>(null)

  useEffect(() => {
    getOrders()
      .then((page) => setOrders(page.items))
      .catch(() => setOrders([]))
  }, [])

  if (orders === null) return <p>Loading...</p>

  return (
    <main>
      <h1>Your orders</h1>
      {orders.length === 0 && <p>You haven't placed any orders yet.</p>}
      <ul>
        {orders.map((order) => (
          <li key={order.id}>
            <Link to={`/orders/${order.id}`}>Order #{order.id}</Link> — {order.seller_business_name}{' '}
            · {order.total_amount} lei · {order.status}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default OrderHistoryPage
