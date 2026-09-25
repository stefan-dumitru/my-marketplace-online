import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import CartPage from './CartPage'
import * as client from '../api/client'

describe('CartPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders cart items and the total', async () => {
    vi.spyOn(client, 'getCart').mockResolvedValue({
      items: [
        {
          product_id: 1,
          product_name: 'Widget',
          unit_price: '10.00',
          quantity: 2,
          line_total: '20.00',
          seller_id: 1,
          seller_business_name: 'Demo Seller',
          available_stock: 5,
        },
      ],
      total: '20.00',
    })

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Widget/)).toBeInTheDocument()
    })
    expect(screen.getByText(/Total: 20.00 lei/)).toBeInTheDocument()
  })

  it('shows an empty-cart message with a link to the catalog', async () => {
    vi.spyOn(client, 'getCart').mockResolvedValue({ items: [], total: '0' })

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/cart is empty/i)).toBeInTheDocument()
  })
})
