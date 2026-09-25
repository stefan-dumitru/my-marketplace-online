import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getCart, removeFromCart, updateCartItem, ApiError, type Cart } from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<Cart | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reload() {
    getCart()
      .then(setCart)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          void navigate('/login')
        } else {
          setError('Could not load your cart')
        }
      })
  }

  useEffect(reload, [navigate])

  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  if (!cart) return <p className="text-muted-foreground">Loading...</p>

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
      {cart.items.length === 0 && (
        <p className="text-muted-foreground">
          Your cart is empty.{' '}
          <Link to="/catalog" className="text-foreground underline underline-offset-4">
            Browse the catalog
          </Link>
        </p>
      )}
      {cart.items.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            {cart.items.map((item, index) => (
              <div key={item.product_id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-muted-foreground text-sm">
                      {item.seller_business_name} · {item.unit_price} lei
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateCartItem(item.product_id, Number(e.target.value)).then(setCart)
                      }
                      className="w-16"
                    />
                    <p className="w-20 text-right font-medium">{item.line_total} lei</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromCart(item.product_id).then(setCart)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t pt-6">
            <p className="text-lg font-semibold">Total: {cart.total} lei</p>
            <Button type="button" onClick={() => navigate('/checkout')}>
              Checkout
            </Button>
          </CardFooter>
        </Card>
      )}
    </main>
  )
}

export default CartPage
