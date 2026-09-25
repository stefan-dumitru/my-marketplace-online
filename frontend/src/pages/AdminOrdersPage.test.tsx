import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import AdminOrdersPage from './AdminOrdersPage'
import * as client from '../api/client'

describe('AdminOrdersPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('denies access to a non-admin', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 1,
      email: 'buyer@example.com',
      full_name: 'Buyer',
      is_admin: false,
    })

    render(
      <MemoryRouter>
        <AdminOrdersPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/don't have permission/i)
    })
  })

  it('lists orders across sellers for an admin', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      full_name: 'Admin',
      is_admin: true,
    })
    vi.spyOn(client, 'getAdminOrders').mockResolvedValue({
      items: [
        {
          id: 42,
          seller_id: 2,
          seller_business_name: "Seller's Shop",
          status: 'placed',
          placed_at: new Date().toISOString(),
          total_amount: '20.00',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })

    render(
      <MemoryRouter>
        <AdminOrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Order #42/)).toBeInTheDocument()
  })
})
