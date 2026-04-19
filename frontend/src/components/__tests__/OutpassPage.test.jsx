import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Outpass from '../../pages/student/Outpass';

// Mock service
vi.mock('../../services/outpass.service', () => ({
  default: {
    getMine: vi.fn(),
    create: vi.fn(),
  },
}));

import outpassService from '../../services/outpass.service';

describe('Student Outpass Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show empty state when no outpasses exist', async () => {
    outpassService.getMine.mockResolvedValue({
      data: {
        data: {
          data: [],
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
        <Outpass />
      </MemoryRouter>
    );

    expect(await screen.findByText('No outpass requests yet')).toBeInTheDocument();
  });

  it('should render outpass history when data exists', async () => {
    outpassService.getMine.mockResolvedValue({
      data: {
        data: {
          data: [
            {
              _id: '1',
              reason: 'Going home',
              from_date: '2025-05-10T00:00:00.000Z',
              to_date: '2025-05-12T00:00:00.000Z',
              status: 'pending',
              createdAt: '2025-05-01T00:00:00.000Z',
            },
          ],
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
        <Outpass />
      </MemoryRouter>
    );

    expect(await screen.findByText('Going home')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});