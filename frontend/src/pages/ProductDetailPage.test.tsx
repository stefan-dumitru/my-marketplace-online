import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import ProductDetailPage from './ProductDetailPage'
import * as client from '../api/client'

const SAMPLE_PRODUCT: client.ProductDetail = {
  id: 1,
  name: 'ThinkPad',
  price: '1500.00',
  stock_quantity: 10,
  category_id: 1,
  category_name: 'Electronics',
  seller_id: 1,
  seller_business_name: 'Demo Seller',
  description: 'A sturdy laptop.',
  images: [],
  created_at: new Date().toISOString(),
  average_rating: null,
  review_count: 0,
}

const EMPTY_REVIEWS = { items: [], total: 0, page: 1, page_size: 20 }

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/products/${id}`]}>
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProductDetailPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders product details when found', async () => {
    vi.spyOn(client, 'getProduct').mockResolvedValue(SAMPLE_PRODUCT)
    vi.spyOn(client, 'getProductReviews').mockResolvedValue(EMPTY_REVIEWS)
    vi.spyOn(client, 'getMyReview').mockRejectedValue(new client.ApiError(401, 'not logged in'))

    renderAt('1')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'ThinkPad' })).toBeInTheDocument()
    })
    expect(screen.getByText(/a sturdy laptop/i)).toBeInTheDocument()
    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument()
  })

  it('shows a not-found message for a 404', async () => {
    vi.spyOn(client, 'getProduct').mockRejectedValue(new client.ApiError(404, 'Product not found'))

    renderAt('999')

    await waitFor(() => {
      expect(screen.getByText(/product not found/i)).toBeInTheDocument()
    })
  })

  it('adds the product to the cart', async () => {
    vi.spyOn(client, 'getProduct').mockResolvedValue(SAMPLE_PRODUCT)
    vi.spyOn(client, 'getProductReviews').mockResolvedValue(EMPTY_REVIEWS)
    vi.spyOn(client, 'getMyReview').mockRejectedValue(new client.ApiError(401, 'not logged in'))
    const addSpy = vi.spyOn(client, 'addToCart').mockResolvedValue({ items: [], total: '0' })
    const user = userEvent.setup()

    renderAt('1')
    await screen.findByRole('heading', { name: 'ThinkPad' })
    await user.click(screen.getByRole('button', { name: /add to cart/i }))

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith(1, 1)
    })
    expect(await screen.findByText(/added to cart/i)).toBeInTheDocument()
  })

  it('lists existing reviews and the average rating', async () => {
    vi.spyOn(client, 'getProduct').mockResolvedValue({
      ...SAMPLE_PRODUCT,
      average_rating: 4.5,
      review_count: 2,
    })
    vi.spyOn(client, 'getProductReviews').mockResolvedValue({
      items: [
        {
          id: 1,
          product_id: 1,
          buyer_id: 2,
          buyer_name: 'Jane Buyer',
          rating: 5,
          comment: 'Excellent!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })
    vi.spyOn(client, 'getMyReview').mockRejectedValue(new client.ApiError(401, 'not logged in'))

    renderAt('1')

    expect(await screen.findByText(/4.5 \/ 5 \(2 reviews\)/)).toBeInTheDocument()
    expect(await screen.findByText(/Jane Buyer: 5\/5 — Excellent!/)).toBeInTheDocument()
  })

  it('lets an eligible buyer submit a review', async () => {
    vi.spyOn(client, 'getProduct').mockResolvedValue(SAMPLE_PRODUCT)
    vi.spyOn(client, 'getProductReviews').mockResolvedValue(EMPTY_REVIEWS)
    vi.spyOn(client, 'getMyReview').mockRejectedValue(new client.ApiError(404, 'No review found'))
    const createSpy = vi.spyOn(client, 'createReview').mockResolvedValue({
      id: 1,
      product_id: 1,
      buyer_id: 2,
      buyer_name: 'Me',
      rating: 4,
      comment: 'Pretty good',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const user = userEvent.setup()

    renderAt('1')
    await user.type(await screen.findByLabelText('Comment'), 'Pretty good')
    await user.click(screen.getByRole('button', { name: /submit review/i }))

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(1, 5, 'Pretty good')
    })
    expect(await screen.findByText(/Your review: 4\/5 — Pretty good/)).toBeInTheDocument()
  })

  it('shows the eligibility error inline when not yet allowed to review', async () => {
    vi.spyOn(client, 'getProduct').mockResolvedValue(SAMPLE_PRODUCT)
    vi.spyOn(client, 'getProductReviews').mockResolvedValue(EMPTY_REVIEWS)
    vi.spyOn(client, 'getMyReview').mockRejectedValue(new client.ApiError(404, 'No review found'))
    vi.spyOn(client, 'createReview').mockRejectedValue(
      new client.ApiError(403, 'You can review this product after your order for it is delivered'),
    )
    const user = userEvent.setup()

    renderAt('1')
    await user.type(await screen.findByLabelText('Comment'), 'Too soon')
    await user.click(screen.getByRole('button', { name: /submit review/i }))

    expect(await screen.findByText(/after your order for it is delivered/i)).toBeInTheDocument()
  })
})
