import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import AdminCategoriesPage from './AdminCategoriesPage'
import * as client from '../api/client'

describe('AdminCategoriesPage', () => {
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
        <AdminCategoriesPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/don't have permission/i)
    })
  })

  it('creates a new category', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      full_name: 'Admin',
      is_admin: true,
    })
    vi.spyOn(client, 'getCategories')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 1, name: 'Gadgets', slug: 'gadgets', parent_id: null, children: [] },
      ])
    const create = vi.spyOn(client, 'createCategory').mockResolvedValue({
      id: 1,
      name: 'Gadgets',
      slug: 'gadgets',
      parent_id: null,
      children: [],
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <AdminCategoriesPage />
      </MemoryRouter>,
    )

    await screen.findByText(/Add a category/i)
    await user.type(screen.getByLabelText('Name'), 'Gadgets')
    await user.type(screen.getByLabelText('Slug'), 'gadgets')
    await user.click(screen.getByRole('button', { name: /add category/i }))

    expect(create).toHaveBeenCalledWith('Gadgets', 'gadgets', undefined)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })
  })

  it('shows the server error when delete is blocked', async () => {
    vi.spyOn(client, 'getCurrentUser').mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      full_name: 'Admin',
      is_admin: true,
    })
    vi.spyOn(client, 'getCategories').mockResolvedValue([
      { id: 1, name: 'Gadgets', slug: 'gadgets', parent_id: null, children: [] },
    ])
    vi.spyOn(client, 'deleteCategory').mockRejectedValue(
      new client.ApiError(409, 'Category has products'),
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <AdminCategoriesPage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/category has products/i)
    })
  })
})
