import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import OrderHistoryPage from './OrderHistoryPage'
import * as client from '../api/client'

describe('OrderHistoryPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("lists the buyer's orders", async () => {
    vi.spyOn(client, 'getOrders').mockResolvedValue({
      items: [
        {
          id: 7,
          seller_id: 1,
          seller_business_name: 'Demo Seller',
          status: 'placed',
          placed_at: new Date().toISOString(),
          total_amount: '30.00',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })

    render(
      <MemoryRouter>
        <OrderHistoryPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Order #7/)).toBeInTheDocument()
    })
  })

  it('shows an empty-state message when there are no orders', async () => {
    vi.spyOn(client, 'getOrders').mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 })

    render(
      <MemoryRouter>
        <OrderHistoryPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/haven't placed any orders/i)).toBeInTheDocument()
  })
})
