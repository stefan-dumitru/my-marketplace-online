import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import SellerApplyPage from './SellerApplyPage'
import * as client from '../api/client'

describe('SellerApplyPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('submits an application and shows the pending status', async () => {
    vi.spyOn(client, 'getMyApplication').mockRejectedValue(
      new client.ApiError(404, 'No application found'),
    )
    vi.spyOn(client, 'applySeller').mockResolvedValue({
      id: 1,
      business_name: 'My Shop',
      status: 'pending',
      submitted_at: new Date().toISOString(),
      decided_at: null,
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SellerApplyPage />
      </MemoryRouter>,
    )

    await user.type(await screen.findByLabelText(/business name/i), 'My Shop')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => {
      expect(screen.getByText(/pending review/i)).toBeInTheDocument()
    })
  })

  it('shows a link to the dashboard when already approved', async () => {
    vi.spyOn(client, 'getMyApplication').mockResolvedValue({
      id: 1,
      business_name: 'My Shop',
      status: 'approved',
      submitted_at: new Date().toISOString(),
      decided_at: new Date().toISOString(),
    })

    render(
      <MemoryRouter>
        <SellerApplyPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/seller dashboard/i)).toBeInTheDocument()
  })
})
