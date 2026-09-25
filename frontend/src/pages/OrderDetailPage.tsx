import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getOrder, ApiError, type OrderDetail } from '../api/client'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

type Status = 'loading' | 'ready' | 'not-found' | 'error'

const STATUS_VARIANT: Record<OrderDetail['status'], 'secondary' | 'destructive' | 'outline'> = {
  placed: 'secondary',
  shipped: 'outline',
  delivered: 'outline',
  cancelled: 'destructive',
}

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

  if (status === 'loading') return <p className="text-muted-foreground">Loading...</p>
  if (status === 'not-found') {
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Order not found</h1>
        <Link to="/orders" className="text-sm underline underline-offset-4">
          Back to your orders
        </Link>
      </main>
    )
  }
  if (status === 'error' || !order) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load this order</AlertDescription>
      </Alert>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link to="/orders" className="text-muted-foreground text-sm underline underline-offset-4">
        Back to your orders
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h1 className="text-2xl font-semibold">Order #{order.id}</h1>
          <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">Sold by: {order.seller_business_name}</p>
          <p className="text-muted-foreground text-sm">
            Shipping to: {order.ship_recipient_name}, {order.ship_street}, {order.ship_city},{' '}
            {order.ship_region} {order.ship_postal_code}, {order.ship_country}
          </p>

          <Separator />

          <ul className="flex flex-col gap-2 text-sm">
            {order.lines.map((line) => (
              <li key={line.id} className="flex justify-between">
                <span>
                  {line.product_name_snapshot} × {line.quantity} @ {line.unit_price_snapshot} lei
                </span>
                <span className="font-medium">{line.line_total} lei</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <p className="text-lg font-semibold">Total: {order.total_amount} lei</p>
        </CardFooter>
      </Card>
    </main>
  )
}

export default OrderDetailPage
