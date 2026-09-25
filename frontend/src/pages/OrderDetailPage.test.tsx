import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import OrderDetailPage from './OrderDetailPage'
import * as client from '../api/client'

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/orders/${id}`]}>
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OrderDetailPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders order lines and total when found', async () => {
    vi.spyOn(client, 'getOrder').mockResolvedValue({
      id: 7,
      seller_id: 1,
      seller_business_name: 'Demo Seller',
      status: 'placed',
      placed_at: new Date().toISOString(),
      total_amount: '20.00',
      shipped_at: null,
      delivered_at: null,
      cancelled_at: null,
      ship_recipient_name: 'Test Buyer',
      ship_street: '1 Main St',
      ship_city: 'Bucharest',
      ship_region: 'Bucharest',
      ship_postal_code: '010101',
      ship_country: 'Romania',
      lines: [
        {
          id: 1,
          product_id: 1,
          product_name_snapshot: 'Widget',
          unit_price_snapshot: '10.00',
          quantity: 2,
          line_total: '20.00',
        },
      ],
    })

    renderAt('7')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Order #7' })).toBeInTheDocument()
    })
    expect(screen.getByText(/Widget × 2/)).toBeInTheDocument()
  })

  it('shows a not-found message for a 404', async () => {
    vi.spyOn(client, 'getOrder').mockRejectedValue(new client.ApiError(404, 'Order not found'))

    renderAt('999')

    await waitFor(() => {
      expect(screen.getByText(/order not found/i)).toBeInTheDocument()
    })
  })
})
