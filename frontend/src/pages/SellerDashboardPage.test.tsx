import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import SellerDashboardPage from './SellerDashboardPage'
import * as client from '../api/client'

const CATEGORIES: client.Category[] = [
  { id: 1, name: 'Electronics', slug: 'electronics', parent_id: null, children: [] },
]

describe('SellerDashboardPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists existing products', async () => {
    vi.spyOn(client, 'getCategories').mockResolvedValue(CATEGORIES)
    vi.spyOn(client, 'getMyStats').mockResolvedValue({
      total_orders: 0,
      total_revenue: '0.00',
      top_products: [],
    })
    vi.spyOn(client, 'getMyProducts').mockResolvedValue({
      items: [
        {
          id: 1,
          name: 'Widget',
          description: 'A widget',
          price: '10.00',
          stock_quantity: 5,
          category_id: 1,
          is_active: true,
          moderation_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })

    render(
      <MemoryRouter>
        <SellerDashboardPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Widget/)).toBeInTheDocument()
  })

  it('creates a new product from the form', async () => {
    vi.spyOn(client, 'getCategories').mockResolvedValue(CATEGORIES)
    vi.spyOn(client, 'getMyStats').mockResolvedValue({
      total_orders: 0,
      total_revenue: '0.00',
      top_products: [],
    })
    vi.spyOn(client, 'getMyProducts').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    })
    const createSpy = vi.spyOn(client, 'createProduct').mockResolvedValue({
      id: 2,
      name: 'New Gadget',
      description: 'Shiny',
      price: '25.00',
      stock_quantity: 4,
      category_id: 1,
      is_active: true,
      moderation_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SellerDashboardPage />
      </MemoryRouter>,
    )

    await user.type(await screen.findByLabelText('Name'), 'New Gadget')
    await user.type(screen.getByLabelText('Description'), 'Shiny')
    await user.type(screen.getByLabelText('Price'), '25.00')
    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.click(screen.getByRole('button', { name: /add product/i }))

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled()
    })
    expect(await screen.findByText(/New Gadget/)).toBeInTheDocument()
  })
})
