import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getCart, removeFromCart, updateCartItem, ApiError, type Cart } from '../api/client'

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

  if (error) return <p role="alert">{error}</p>
  if (!cart) return <p>Loading...</p>

  return (
    <main>
      <h1>Your cart</h1>
      {cart.items.length === 0 && (
        <p>
          Your cart is empty. <Link to="/catalog">Browse the catalog</Link>
        </p>
      )}
      {cart.items.length > 0 && (
        <>
          <ul>
            {cart.items.map((item) => (
              <li key={item.product_id}>
                {item.product_name} ({item.seller_business_name}) — {item.unit_price} lei ×{' '}
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateCartItem(item.product_id, Number(e.target.value)).then(setCart)
                  }
                  style={{ width: '4em' }}
                />{' '}
                = {item.line_total} lei{' '}
                <button type="button" onClick={() => removeFromCart(item.product_id).then(setCart)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p>Total: {cart.total} lei</p>
          <button type="button" onClick={() => navigate('/checkout')}>
            Checkout
          </button>
        </>
      )}
    </main>
  )
}

export default CartPage
