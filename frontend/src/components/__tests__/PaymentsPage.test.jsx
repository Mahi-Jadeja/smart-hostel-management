import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Payments from '../../pages/student/Payments';

vi.mock('../../services/payment.service', () => ({
  default: {
    getMine: vi.fn(),
    markPaid: vi.fn(),
  },
}));

import paymentService from '../../services/payment.service';

describe('Student Payments Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show empty state when no payments exist', async () => {
    paymentService.getMine.mockResolvedValue({
      data: {
        data: {
          payments: [],
          reminders: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <Payments />
      </MemoryRouter>
    );

    expect(await screen.findByText('No payments yet')).toBeInTheDocument();
  });

  it('should render payment list when data exists', async () => {
    paymentService.getMine.mockResolvedValue({
      data: {
        data: {
          payments: [
            {
              _id: '1',
              amount: 5000,
              type: 'hostel_fee',
              description: 'Semester hostel fee',
              status: 'pending',
              due_date: '2025-05-10T00:00:00.000Z',
              createdAt: '2025-05-01T00:00:00.000Z',
            },
          ],
          reminders: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <Payments />
      </MemoryRouter>
    );

    expect(await screen.findByText('Hostel Fee')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});