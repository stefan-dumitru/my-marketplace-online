import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import AdminProductsPage from './AdminProductsPage'
import * as client from '../api/client'

describe('AdminProductsPage', () => {
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
        <AdminProductsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/don't have permission/i)
    })
  })

  it('moderates an active product and reloads the list', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      full_name: 'Admin',
      is_admin: true,
    })
    vi.spyOn(client, 'getAdminProducts')
      .mockResolvedValueOnce({
        items: [
          {
            id: 10,
            name: 'Widget',
            seller_id: 2,
            seller_business_name: "Seller's Shop",
            category_id: 1,
            is_active: true,
            moderation_status: 'active',
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 10,
            name: 'Widget',
            seller_id: 2,
            seller_business_name: "Seller's Shop",
            category_id: 1,
            is_active: false,
            moderation_status: 'removed_by_admin',
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      })
    const moderate = vi.spyOn(client, 'moderateProduct').mockResolvedValue({
      id: 10,
      name: 'Widget',
      seller_id: 2,
      seller_business_name: "Seller's Shop",
      category_id: 1,
      is_active: false,
      moderation_status: 'removed_by_admin',
    })
    vi.spyOn(window, 'prompt').mockReturnValue(null)
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <AdminProductsPage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: /remove/i }))

    expect(moderate).toHaveBeenCalledWith(10, 'removed', undefined)
    await waitFor(() => {
      expect(screen.getByText(/removed_by_admin/)).toBeInTheDocument()
    })
  })
})
