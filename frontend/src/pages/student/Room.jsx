import { useEffect, useState } from 'react';
import {
  BedDouble,
  Building2,
  Layers,
  Users,
  Search,
  AlertCircle,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import studentService from '../../services/student.service';
import toast from 'react-hot-toast';

// Helper to determine room color based on status
const getStatusStyles = (isMyRoom, status) => {
  if (isMyRoom) {
    return 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200';
  }

  switch (status) {
    case 'empty':
      return 'bg-green-50 border-green-200 hover:bg-green-100';
    case 'partial':
      return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
    case 'full':
      return 'bg-red-50 border-red-200 hover:bg-red-100';
    case 'maintenance':
      return 'bg-gray-100 border-gray-300';
    default:
      return 'bg-white border-gray-200';
  }
};

const Room = () => {
  // ---- State for Allocated View ----
  const [layoutData, setLayoutData] = useState(null);
  const [myRoom, setMyRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAllocated, setIsAllocated] = useState(false);

  // ---- State for Unallocated Preview ----
  const [previewBlock, setPreviewBlock] = useState('');
  const [previewFloor, setPreviewFloor] = useState(1);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [availableBlocks, setAvailableBlocks] = useState([]);

  // Fetch Layout on Mount
  useEffect(() => {
    const fetchLayout = async () => {
      try {
        setLoading(true);
        const response = await studentService.getRoomLayout();
        const data = response.data.data;

        setIsAllocated(data.allocated);
        setLayoutData(data.layout);
        setMyRoom(data.my_room);

        // Extract unique blocks from layout for preview dropdown
        if (data.layout && data.layout.length > 0) {
          const blocks = [...new Set(data.layout.map((r) => r.hostel_block))];
          setAvailableBlocks(blocks);
        }
      } catch (error) {
        console.error('Failed to fetch room layout:', error);
        toast.error('Failed to load room information');
      } finally {
        setLoading(false);
      }
    };

    fetchLayout();
  }, []);

  // Handle Preview Search
  const handlePreview = async () => {
    if (!previewBlock) {
      toast.error('Please select a block');
      return;
    }

    try {
      setPreviewLoading(true);
      const response = await studentService.getLayoutPreview(
        previewBlock,
        previewFloor
      );
      setPreviewData(response.data.data);
    } catch (error) {
      toast.error('Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // ---- Loading State ----
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Room Allocation</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ---- Unallocated View ----
  if (!isAllocated) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Room Allocation</h1>

        {/* Alert */}
        <Card className="p-6 mb-6 border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-yellow-900">
                Not Allocated Yet
              </h2>
              <p className="text-yellow-800 mt-1">
                You haven't been assigned a room. Please contact the warden.
                Meanwhile, you can browse the hostel layout below.
              </p>
            </div>
          </div>
        </Card>

        {/* Preview Tool */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            Browse Hostel Layout
          </h2>

          <div className="flex flex-wrap gap-4 items-end mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Block
              </label>
              <select
                value={previewBlock}
                onChange={(e) => setPreviewBlock(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Select Block</option>
                {availableBlocks.map((block) => (
                  <option key={block} value={block}>
                    Block {block}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floor
              </label>
              <select
                value={previewFloor}
                onChange={(e) => setPreviewFloor(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {[1, 2, 3, 4, 5].map((f) => (
                  <option key={f} value={f}>
                    Floor {f}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePreview}
              disabled={previewLoading || !previewBlock}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {previewLoading ? 'Loading...' : 'View Layout'}
            </button>
          </div>

          {/* Preview Grid */}
          {previewLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : previewData ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-700">
                  Block {previewData.block} • Floor {previewData.floor}
                </h3>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-400"></span> Empty
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-yellow-400"></span> Partial
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-400"></span> Full
                  </span>
                </div>
              </div>

              {previewData.rooms.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {previewData.rooms.map((room) => (
                    <div
                      key={room.room_no}
                      className={`p-4 rounded-xl border ${getStatusStyles(
                        false,
                        room.status
                      )}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-800">
                          {room.room_no}
                        </span>
                        <Badge status={room.status} className="text-xs px-2 py-0.5">
                          {room.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {room.occupied} / {room.capacity} Occupied
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Building2}
                  title="No rooms found"
                  description="This floor has no rooms generated yet."
                />
              )}
            </div>
          ) : (
            <EmptyState
              icon={MapPin}
              title="Select a block to preview"
              description="Choose a block and floor to see the room layout."
            />
          )}
        </Card>
      </div>
    );
  }

  // ---- Allocated View ----
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Room Allocation</h1>

      {/* My Room Hero Card */}
      {myRoom && (
        <Card className="p-6 mb-8 border-2 border-indigo-200 bg-indigo-50/30">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            {/* Left: Room Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="success" className="text-xs">
                  My Room
                </Badge>
                <span className="text-sm text-gray-500">
                  Block {myRoom.block} • Floor {myRoom.floor} • Bed {myRoom.bed_no}
                </span>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Room {myRoom.room_no}
              </h2>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <BedDouble className="w-4 h-4" />
                  <span>
                    {myRoom.occupied}/{myRoom.capacity} Occupied
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>{myRoom.status.charAt(0).toUpperCase() + myRoom.status.slice(1)}</span>
                </div>
              </div>
            </div>

            {/* Right: Roommates */}
            <div className="md:w-64 bg-white rounded-xl p-4 shadow-sm border border-indigo-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Roommates ({myRoom.roommates?.length || 0})
              </h3>

              {myRoom.roommates?.length > 0 ? (
                <div className="space-y-3">
                  {myRoom.roommates.map((mate) => (
                    <div key={mate.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                        {mate.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {mate.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {mate.branch} • Year {mate.year}
                        </p>
                        <p className="text-xs text-gray-400">Bed {mate.bed_no}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No roommates yet.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Floor Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-gray-600" />
          Floor {myRoom?.floor || layoutData?.[0]?.floor} Layout
        </h2>

        {layoutData && layoutData.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {layoutData.map((room) => {
              // Skip rendering "My Room" again in the grid if we want, 
              // OR render it as a highlighted tile. 
              // Let's render it as a highlighted tile for context.
              
              return (
                <div
                  key={room._id || room.room_no}
                  className={`p-4 rounded-xl border transition-all ${getStatusStyles(
                    room.is_my_room,
                    room.status
                  )}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold ${room.is_my_room ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {room.room_no}
                    </span>
                    {room.is_my_room && (
                      <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-1">
                    {room.occupied} / {room.capacity} Occupied
                  </p>

                  {/* Privacy Check: Only show status badge for others */}
                  <div className="mt-2">
                    <Badge status={room.status} className="text-xs px-2 py-0.5">
                      {room.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No layout data"
            description="Unable to load the floor layout."
          />
        )}
      </div>
    </div>
  );
};

export default Room;
