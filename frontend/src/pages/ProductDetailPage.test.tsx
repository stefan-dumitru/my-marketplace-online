import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import ProductDetailPage from './ProductDetailPage'
import * as client from '../api/client'

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
    vi.spyOn(client, 'getProduct').mockResolvedValue({
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
    })

    renderAt('1')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'ThinkPad' })).toBeInTheDocument()
    })
    expect(screen.getByText(/a sturdy laptop/i)).toBeInTheDocument()
  })

  it('shows a not-found message for a 404', async () => {
    vi.spyOn(client, 'getProduct').mockRejectedValue(new client.ApiError(404, 'Product not found'))

    renderAt('999')

    await waitFor(() => {
      expect(screen.getByText(/product not found/i)).toBeInTheDocument()
    })
  })
})
