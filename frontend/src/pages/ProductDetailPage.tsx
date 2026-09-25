import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  addToCart,
  createReview,
  deleteReview,
  getMyReview,
  getProduct,
  getProductReviews,
  updateReview,
  ApiError,
  type ProductDetail,
  type Review,
} from '../api/client'

type Status = 'loading' | 'ready' | 'not-found' | 'error'
type MyReviewStatus = 'loading' | 'has-review' | 'none' | 'unauthenticated'

function ReviewsSection({ productId }: { productId: number }) {
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [myReview, setMyReview] = useState<Review | null>(null)
  const [myReviewStatus, setMyReviewStatus] = useState<MyReviewStatus>('loading')
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  function reloadReviews() {
    getProductReviews(productId).then((page) => setReviews(page.items))
  }

  function reloadMyReview() {
    getMyReview(productId)
      .then((review) => {
        setMyReview(review)
        setMyReviewStatus('has-review')
      })
      .catch((err) => {
        setMyReviewStatus(
          err instanceof ApiError && err.status === 401 ? 'unauthenticated' : 'none',
        )
      })
  }

  useEffect(() => {
    reloadReviews()
    reloadMyReview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const review = editing
        ? await updateReview(productId, rating, comment)
        : await createReview(productId, rating, comment)
      setMyReview(review)
      setMyReviewStatus('has-review')
      setEditing(false)
      reloadReviews()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  async function handleDelete() {
    await deleteReview(productId)
    setMyReview(null)
    setMyReviewStatus('none')
    reloadReviews()
  }

  function startEditing() {
    if (myReview) {
      setRating(myReview.rating)
      setComment(myReview.comment)
      setEditing(true)
    }
  }

  return (
    <section>
      <h2>Reviews</h2>
      {reviews === null && <p>Loading reviews...</p>}
      {reviews !== null && reviews.length === 0 && <p>No reviews yet.</p>}
      {reviews !== null && reviews.length > 0 && (
        <ul>
          {reviews.map((review) => (
            <li key={review.id}>
              {review.buyer_name}: {review.rating}/5 — {review.comment}
            </li>
          ))}
        </ul>
      )}

      {myReviewStatus === 'has-review' && myReview && !editing && (
        <div>
          <p>
            Your review: {myReview.rating}/5 — {myReview.comment}
          </p>
          <button type="button" onClick={startEditing}>
            Edit
          </button>
          <button type="button" onClick={handleDelete}>
            Delete
          </button>
        </div>
      )}

      {(myReviewStatus === 'none' || editing) && (
        <form onSubmit={handleSubmit}>
          <label htmlFor="rating">Rating</label>
          <select id="rating" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <label htmlFor="comment">Comment</label>
          <input
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
          {error && <p role="alert">{error}</p>}
          <button type="submit">{editing ? 'Save' : 'Submit review'}</button>
        </form>
      )}
    </section>
  )
}

function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [quantity, setQuantity] = useState(1)
  const [cartError, setCartError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
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

  async function handleAddToCart() {
    if (!product) return
    setCartError(null)
    setAdded(false)
    try {
      await addToCart(product.id, quantity)
      setAdded(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void navigate('/login')
        return
      }
      setCartError(err instanceof ApiError ? err.message : 'Could not add to cart')
    }
  }

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
      <p>
        {product.average_rating !== null
          ? `${product.average_rating.toFixed(1)} / 5 (${product.review_count} review${product.review_count === 1 ? '' : 's'})`
          : 'No reviews yet'}
      </p>
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
      <div>
        <label htmlFor="quantity">Quantity</label>
        <input
          id="quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          style={{ width: '4em' }}
        />
        <button type="button" onClick={handleAddToCart}>
          Add to cart
        </button>
        {added && (
          <span>
            {' '}
            Added to cart. <Link to="/cart">View cart</Link>
          </span>
        )}
        {cartError && <span role="alert"> {cartError}</span>}
      </div>
      <ReviewsSection productId={product.id} />
    </main>
  )
}

export default ProductDetailPage
