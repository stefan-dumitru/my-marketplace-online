import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import CheckoutPage from './CheckoutPage'
import * as client from '../api/client'

const ADDRESS: client.Address = {
  id: 1,
  label: 'Home',
  recipient_name: 'Test Buyer',
  street: '1 Main St',
  city: 'Bucharest',
  region: 'Bucharest',
  postal_code: '010101',
  country: 'Romania',
  is_default: true,
  created_at: new Date().toISOString(),
}

describe('CheckoutPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('places an order and shows the result', async () => {
    vi.spyOn(client, 'getAddresses').mockResolvedValue([ADDRESS])
    vi.spyOn(client, 'checkout').mockResolvedValue({ order_ids: [42], skipped: [] })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: /place order/i }))

    await waitFor(() => {
      expect(screen.getByText(/order placed/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/42/)).toBeInTheDocument()
  })

  it('shows skipped items when checkout is a partial success', async () => {
    vi.spyOn(client, 'getAddresses').mockResolvedValue([ADDRESS])
    vi.spyOn(client, 'checkout').mockResolvedValue({
      order_ids: [],
      skipped: [{ product_id: 1, product_name: 'Widget', reason: 'Out of stock' }],
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/Widget — Out of stock/)).toBeInTheDocument()
  })
})
