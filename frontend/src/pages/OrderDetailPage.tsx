import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getOrder, ApiError, type OrderDetail } from '../api/client'

type Status = 'loading' | 'ready' | 'not-found' | 'error'

function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const hasRequested = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!id || hasRequested.current === id) return
    hasRequested.current = id
    getOrder(Number(id))
      .then((o) => {
        setOrder(o)
        setStatus('ready')
      })
      .catch((err) => {
        setStatus(err instanceof ApiError && err.status === 404 ? 'not-found' : 'error')
      })
  }, [id])

  if (status === 'loading') return <p>Loading...</p>
  if (status === 'not-found') {
    return (
      <main>
        <h1>Order not found</h1>
        <Link to="/orders">Back to your orders</Link>
      </main>
    )
  }
  if (status === 'error' || !order) {
    return <p role="alert">Could not load this order</p>
  }

  return (
    <main>
      <Link to="/orders">Back to your orders</Link>
      <h1>Order #{order.id}</h1>
      <p>Status: {order.status}</p>
      <p>Sold by: {order.seller_business_name}</p>
      <p>
        Shipping to: {order.ship_recipient_name}, {order.ship_street}, {order.ship_city},{' '}
        {order.ship_region} {order.ship_postal_code}, {order.ship_country}
      </p>
      <ul>
        {order.lines.map((line) => (
          <li key={line.id}>
            {line.product_name_snapshot} × {line.quantity} @ {line.unit_price_snapshot} lei ={' '}
            {line.line_total} lei
          </li>
        ))}
      </ul>
      <p>Total: {order.total_amount} lei</p>
    </main>
  )
}

export default OrderDetailPage
