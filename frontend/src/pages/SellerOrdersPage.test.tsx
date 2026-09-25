import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SellerOrdersPage from './SellerOrdersPage'
import * as client from '../api/client'

const PLACED_ORDER: client.OrderListItem = {
  id: 1,
  seller_id: 1,
  seller_business_name: 'Demo Seller',
  status: 'placed',
  placed_at: new Date().toISOString(),
  total_amount: '20.00',
}

describe('SellerOrdersPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the right action buttons for a placed order', async () => {
    vi.spyOn(client, 'getMyOrders').mockResolvedValue({
      items: [PLACED_ORDER],
      total: 1,
      page: 1,
      page_size: 20,
    })

    render(<SellerOrdersPage />)

    await waitFor(() => {
      expect(screen.getByText(/Order #1/)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /mark shipped/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark delivered/i })).not.toBeInTheDocument()
  })

  it('advances an order to shipped and reloads the list', async () => {
    vi.spyOn(client, 'getMyOrders')
      .mockResolvedValueOnce({ items: [PLACED_ORDER], total: 1, page: 1, page_size: 20 })
      .mockResolvedValueOnce({
        items: [{ ...PLACED_ORDER, status: 'shipped' }],
        total: 1,
        page: 1,
        page_size: 20,
      })
    const updateSpy = vi.spyOn(client, 'updateOrderStatus').mockResolvedValue({
      ...PLACED_ORDER,
      status: 'shipped',
    })
    const user = userEvent.setup()

    render(<SellerOrdersPage />)
    await screen.findByText(/Order #1/)
    await user.click(screen.getByRole('button', { name: /mark shipped/i }))

    expect(updateSpy).toHaveBeenCalledWith(1, 'shipped')
    await waitFor(() => {
      expect(screen.getByText(/· shipped/)).toBeInTheDocument()
    })
  })
})
