import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import AdminSellersPage from './AdminSellersPage'
import * as client from '../api/client'

describe('AdminSellersPage', () => {
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
        <AdminSellersPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/don't have permission/i)
    })
  })

  it('lists pending applications and approves one', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      full_name: 'Admin',
      is_admin: true,
    })
    vi.spyOn(client, 'getPendingSellers').mockResolvedValue([
      {
        id: 5,
        business_name: 'Pending Shop',
        status: 'pending',
        submitted_at: new Date().toISOString(),
        decided_at: null,
      },
    ])
    const approve = vi.spyOn(client, 'approveSeller').mockResolvedValue({
      id: 5,
      business_name: 'Pending Shop',
      status: 'approved',
      submitted_at: new Date().toISOString(),
      decided_at: new Date().toISOString(),
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <AdminSellersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Pending Shop')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /approve/i }))

    expect(approve).toHaveBeenCalledWith(5)
    await waitFor(() => {
      expect(screen.getByText(/no pending applications/i)).toBeInTheDocument()
    })
  })
})
