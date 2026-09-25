import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import AdminStatsPage from './AdminStatsPage'
import * as client from '../api/client'

describe('AdminStatsPage', () => {
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

    render(<AdminStatsPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/don't have permission/i)
    })
  })

  it('shows platform-wide stats for an admin', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      full_name: 'Admin',
      is_admin: true,
    })
    vi.spyOn(client, 'getAdminStats').mockResolvedValue({
      total_sellers: 3,
      sellers_by_status: { approved: 2, pending: 1 },
      total_products: 10,
      total_orders: 5,
      total_revenue: '150.00',
      orders_by_status: { placed: 4, cancelled: 1 },
    })

    render(
      <MemoryRouter>
        <AdminStatsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Total sellers: 3/)).toBeInTheDocument()
    expect(screen.getByText(/Total revenue: 150.00 lei/)).toBeInTheDocument()
  })
})
