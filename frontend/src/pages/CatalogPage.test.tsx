import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import CatalogPage from './CatalogPage'
import * as client from '../api/client'

const CATEGORY_TREE: client.Category[] = [
  { id: 1, name: 'Electronics', slug: 'electronics', parent_id: null, children: [] },
]

const PRODUCT: client.ProductListItem = {
  id: 1,
  name: 'ThinkPad',
  price: '1500.00',
  stock_quantity: 10,
  category_id: 1,
  category_name: 'Electronics',
  seller_id: 1,
  seller_business_name: 'Demo Seller',
}

describe('CatalogPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders products from the catalog', async () => {
    vi.spyOn(client, 'getCategories').mockResolvedValue(CATEGORY_TREE)
    vi.spyOn(client, 'getProducts').mockResolvedValue({
      items: [PRODUCT],
      total: 1,
      page: 1,
      page_size: 20,
    })

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('ThinkPad')).toBeInTheDocument()
    })
  })

  it('shows an empty-state message when nothing matches', async () => {
    vi.spyOn(client, 'getCategories').mockResolvedValue(CATEGORY_TREE)
    vi.spyOn(client, 'getProducts').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    })

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/no products match/i)).toBeInTheDocument()
    })
  })
})
