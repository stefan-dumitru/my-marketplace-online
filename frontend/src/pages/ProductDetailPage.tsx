import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getProduct, ApiError, type ProductDetail } from '../api/client'

type Status = 'loading' | 'ready' | 'not-found' | 'error'

function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const hasRequested = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!id || hasRequested.current === id) return
    hasRequested.current = id
    getProduct(Number(id))
      .then((p) => {
        setProduct(p)
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
        <h1>Product not found</h1>
        <Link to="/catalog">Back to catalog</Link>
      </main>
    )
  }
  if (status === 'error' || !product) {
    return <p role="alert">Could not load this product</p>
  }

  return (
    <main>
      <Link to="/catalog">Back to catalog</Link>
      <h1>{product.name}</h1>
      <p>{product.price} lei</p>
      <p>{product.description}</p>
      <p>Stock: {product.stock_quantity}</p>
      <p>Category: {product.category_name}</p>
      <p>Sold by: {product.seller_business_name}</p>
      {product.images.length > 0 && (
        <div>
          {product.images.map((image) => (
            <img key={image.id} src={image.url} alt={product.name} width={200} />
          ))}
        </div>
      )}
    </main>
  )
}

export default ProductDetailPage
