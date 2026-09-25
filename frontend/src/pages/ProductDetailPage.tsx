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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

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
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight">Reviews</h2>
      {reviews === null && <p className="text-muted-foreground">Loading reviews...</p>}
      {reviews !== null && reviews.length === 0 && (
        <p className="text-muted-foreground">No reviews yet.</p>
      )}
      {reviews !== null && reviews.length > 0 && (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-md border p-3 text-sm">
              {review.buyer_name}: {review.rating}/5 — {review.comment}
            </li>
          ))}
        </ul>
      )}

      {myReviewStatus === 'has-review' && myReview && !editing && (
        <div className="rounded-md border p-3 text-sm">
          <p>
            Your review: {myReview.rating}/5 — {myReview.comment}
          </p>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={startEditing}>
              Edit
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      )}

      {(myReviewStatus === 'none' || editing) && (
        <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rating">Rating</Label>
            <select
              id="rating"
              className="border-input h-9 w-24 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="comment">Comment</Label>
            <Input
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="self-start">
            {editing ? 'Save' : 'Submit review'}
          </Button>
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

  if (status === 'loading') return <p className="text-muted-foreground">Loading...</p>
  if (status === 'not-found') {
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <Link to="/catalog" className="text-sm underline underline-offset-4">
          Back to catalog
        </Link>
      </main>
    )
  }
  if (status === 'error' || !product) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load this product</AlertDescription>
      </Alert>
    )
  }

  return (
    <main className="flex flex-col gap-8">
      <Link to="/catalog" className="text-muted-foreground text-sm underline underline-offset-4">
        Back to catalog
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        {product.images.length > 0 ? (
          <div className="flex flex-col gap-2">
            {product.images.map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt={product.name}
                className="w-full rounded-lg border object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="bg-muted flex aspect-square items-center justify-center rounded-lg text-sm text-muted-foreground">
            No image
          </div>
        )}

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-semibold">{product.name}</h1>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-2xl font-bold">{product.price} lei</p>
            <p className="text-muted-foreground text-sm">
              {product.average_rating !== null
                ? `${product.average_rating.toFixed(1)} / 5 (${product.review_count} review${product.review_count === 1 ? '' : 's'})`
                : 'No reviews yet'}
            </p>
            <p>{product.description}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={product.stock_quantity > 0 ? 'secondary' : 'destructive'}>
                Stock: {product.stock_quantity}
              </Badge>
              <Badge variant="outline">{product.category_name}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">Sold by: {product.seller_business_name}</p>

            <Separator />

            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-20"
                />
              </div>
              <Button type="button" onClick={handleAddToCart}>
                Add to cart
              </Button>
            </div>
            {added && (
              <p className="text-sm">
                Added to cart.{' '}
                <Link to="/cart" className="underline underline-offset-4">
                  View cart
                </Link>
              </p>
            )}
            {cartError && (
              <Alert variant="destructive">
                <AlertDescription>{cartError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <ReviewsSection productId={product.id} />
    </main>
  )
}

export default ProductDetailPage
