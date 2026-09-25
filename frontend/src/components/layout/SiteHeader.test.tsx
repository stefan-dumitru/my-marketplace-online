import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import SiteHeader from './SiteHeader'
import * as client from '../../api/client'

describe('SiteHeader', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows login/signup links when logged out', async () => {
    vi.spyOn(client, 'getCurrentUser').mockRejectedValue(new client.ApiError(401, 'not logged in'))

    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })

  it('shows a become-a-seller link for a buyer with no application', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 1,
      email: 'buyer@example.com',
      full_name: 'Test Buyer',
      is_admin: false,
    })
    vi.spyOn(client, 'getMyApplication').mockRejectedValue(
      new client.ApiError(404, 'No application found'),
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'buyer@example.com' }))

    expect(await screen.findByRole('menuitem', { name: /become a seller/i })).toBeInTheDocument()
  })

  it('shows a seller dashboard link for an approved seller', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 2,
      email: 'seller@example.com',
      full_name: 'Test Seller',
      is_admin: false,
    })
    vi.spyOn(client, 'getMyApplication').mockResolvedValue({
      id: 1,
      business_name: 'Test Shop',
      status: 'approved',
      submitted_at: new Date().toISOString(),
      decided_at: new Date().toISOString(),
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'seller@example.com' }))

    expect(await screen.findByRole('menuitem', { name: /seller dashboard/i })).toBeInTheDocument()
  })

  it('shows the admin section for admins', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 3,
      email: 'admin@example.com',
      full_name: 'Admin',
      is_admin: true,
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'admin@example.com' }))

    expect(await screen.findByRole('menuitem', { name: /sellers/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /stats/i })).toBeInTheDocument()
  })
})
