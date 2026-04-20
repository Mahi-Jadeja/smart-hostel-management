import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoomLayout from '../../pages/admin/RoomLayout';

vi.mock('../../services/hostel.service', () => ({
  default: {
    getConfigs: vi.fn(),
    getLayout: vi.fn(),
    saveConfig: vi.fn(),
    generateRooms: vi.fn(),
    getEligibleStudents: vi.fn(),
    allocateStudent: vi.fn(),
    deallocateStudent: vi.fn(),
  },
}));

import hostelService from '../../services/hostel.service';

describe('Admin Room Layout Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show empty state when no config/layout exists', async () => {
    hostelService.getConfigs.mockResolvedValue({
      data: {
        data: {
          configs: [],
        },
      },
    });

    hostelService.getLayout.mockResolvedValue({
      data: {
        data: {
          block: null,
          config: null,
          floors: [],
          stats: {
            totalRooms: 0,
            totalBeds: 0,
            occupiedBeds: 0,
            availableBeds: 0,
            emptyRooms: 0,
            partialRooms: 0,
            fullRooms: 0,
            maintenanceRooms: 0,
          },
        },
      },
    });

    render(<RoomLayout />);

    expect(await screen.findByText('Room Management')).toBeInTheDocument();
  });

  it('should render room cards when layout data exists', async () => {
    hostelService.getConfigs.mockResolvedValue({
      data: {
        data: {
          configs: [
            {
              _id: 'config1',
              hostel_name: 'Boys Hostel',
              hostel_block: 'A',
              total_floors: 1,
              rooms_per_floor: 2,
              default_capacity: 2,
            },
          ],
        },
      },
    });

    hostelService.getLayout.mockResolvedValue({
      data: {
        data: {
          block: 'A',
          config: {
            hostel_name: 'Boys Hostel',
            hostel_block: 'A',
          },
          floors: [
            {
              floor: 1,
              rooms: [
                {
                  _id: 'room1',
                  room_no: '101',
                  hostel_block: 'A',
                  floor: 1,
                  capacity: 2,
                  occupied: 0,
                  status: 'empty',
                  students: [],
                },
              ],
            },
          ],
          stats: {
            totalRooms: 1,
            totalBeds: 2,
            occupiedBeds: 0,
            availableBeds: 2,
            emptyRooms: 1,
            partialRooms: 0,
            fullRooms: 0,
            maintenanceRooms: 0,
          },
        },
      },
    });

    render(<RoomLayout />);

    expect(await screen.findByText('101')).toBeInTheDocument();
  });
});