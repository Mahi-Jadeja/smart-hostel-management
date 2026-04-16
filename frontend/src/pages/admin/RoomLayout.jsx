import { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  Building2,
  Layers,
  Users,
  RefreshCw,
  Search,
  UserPlus,
  UserMinus,
  X,
  AlertTriangle,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import hostelService from '../../services/hostel.service';
import toast from 'react-hot-toast';

const statusStyles = {
  empty: 'bg-green-50 border-green-200 hover:bg-green-100',
  partial: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
  full: 'bg-red-50 border-red-200 hover:bg-red-100',
  maintenance: 'bg-gray-100 border-gray-300 hover:bg-gray-200',
};

const allocationStageMeta = {
  random: {
    label: 'Random',
    className: 'bg-blue-100 text-blue-700',
  },
  preferred_pair: {
    label: 'Preferred Pair',
    className: 'bg-green-100 text-green-700',
  },
  same_year_same_branch: {
    label: 'Same Year + Branch',
    className: 'bg-purple-100 text-purple-700',
  },
  same_year: {
    label: 'Same Year',
    className: 'bg-yellow-100 text-yellow-700',
  },
  final_random: {
    label: 'Final Random',
    className: 'bg-orange-100 text-orange-700',
  },
  same_gender_mixed: {
    label: 'Same Gender Mixed',
    className: 'bg-pink-100 text-pink-700',
  },
};

const modeDescriptions = {
  random:
    'Randomly allocate students into gender-compatible blocks. Branch is ignored.',
  preference:
    'Honor clean mutual roommate pairs first, then fallback to same year/branch rules.',
  branch:
    'Try to keep same year and same branch together first, then same year, then same gender.',
};

const scopeDescriptions = {
  unallocated:
    'Only currently unallocated students will be considered.',
  reshuffle_selected_blocks:
    'Reshuffle students in selected blocks and also include matching unallocated students.',
  reshuffle_all:
    'Clear all eligible allocations and run allocation again for everyone.',
};

const RoomLayout = () => {
  const [configs, setConfigs] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('');

  const [layoutData, setLayoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [deallocatingId, setDeallocatingId] = useState('');

  const [roomModal, setRoomModal] = useState(null);
  const [allocationRoom, setAllocationRoom] = useState(null);

  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkExecuting, setBulkExecuting] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(null);

  const [bulkForm, setBulkForm] = useState({
    mode: 'random',
    scope: 'unallocated',
    selected_blocks: [],
  });

  const [configForm, setConfigForm] = useState({
    hostel_name: '',
    hostel_block: '',
    block_gender: '',
    total_floors: 1,
    rooms_per_floor: 1,
    default_capacity: 3,
  });

  const loadConfigs = async () => {
    const response = await hostelService.getConfigs();
    const items = response.data.data.configs || [];
    setConfigs(items);

    if (!selectedBlock && items.length > 0) {
      const first = items[0].hostel_block;
      setSelectedBlock(first);
    }
  };

  const loadLayout = async (block) => {
    try {
      setLoading(true);
      const response = await hostelService.getLayout(block ? { block } : {});
      setLayoutData(response.data.data);
    } catch (error) {
      console.error('Failed to load layout:', error);
      toast.error('Failed to load room layout');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await loadConfigs();
      } catch (error) {
        console.error(error);
        toast.error('Failed to load hostel configs');
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (selectedBlock) {
      const selectedConfig = configs.find(
        (config) => config.hostel_block === selectedBlock
      );

      if (selectedConfig) {
        setConfigForm({
          hostel_name: selectedConfig.hostel_name,
          hostel_block: selectedConfig.hostel_block,
          block_gender: selectedConfig.block_gender || '',
          total_floors: selectedConfig.total_floors,
          rooms_per_floor: selectedConfig.rooms_per_floor,
          default_capacity: selectedConfig.default_capacity,
        });
      }

      loadLayout(selectedBlock);
    }
  }, [selectedBlock, configs]);

  const handleConfigChange = (e) => {
    const { name, value } = e.target;

    setConfigForm((prev) => ({
      ...prev,
      [name]:
        ['total_floors', 'rooms_per_floor', 'default_capacity'].includes(name)
          ? Number(value)
          : value,
    }));
  };

  const handleSaveConfig = async () => {
    if (
      !configForm.hostel_name.trim() ||
      !configForm.hostel_block.trim() ||
      !configForm.block_gender
    ) {
      toast.error('Hostel name, block, and block gender are required');
      return;
    }

    try {
      setSavingConfig(true);

      const payload = {
        ...configForm,
        hostel_block: configForm.hostel_block.toUpperCase(),
      };

      await hostelService.saveConfig(payload);

      toast.success('Hostel config saved successfully');
      await loadConfigs();
      setSelectedBlock(payload.hostel_block);
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to save hostel config';
      toast.error(message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleGenerateRooms = async () => {
    if (!configForm.hostel_block.trim()) {
      toast.error('Please enter a hostel block first');
      return;
    }

    try {
      setGenerating(true);

      const payload = {
        ...configForm,
        hostel_block: configForm.hostel_block.toUpperCase(),
      };

      await hostelService.saveConfig(payload);

      await hostelService.generateRooms({
        hostel_block: payload.hostel_block,
      });

      toast.success('Rooms generated successfully');
      await loadConfigs();
      setSelectedBlock(payload.hostel_block);
      await loadLayout(payload.hostel_block);
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to generate rooms';
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const openRoomModal = (room) => {
    setRoomModal(room);
  };

  const closeRoomModal = () => {
    setRoomModal(null);
  };

  const openAllocationModal = async (room) => {
    setAllocationRoom(room);
    setSelectedStudentId('');
    setStudentSearch('');

    try {
      setEligibleLoading(true);
      const response = await hostelService.getEligibleStudents({ limit: 100 });
      setEligibleStudents(response.data.data.students || []);
    } catch (error) {
      toast.error('Failed to load eligible students');
    } finally {
      setEligibleLoading(false);
    }
  };

  const closeAllocationModal = () => {
    setAllocationRoom(null);
    setEligibleStudents([]);
    setSelectedStudentId('');
    setStudentSearch('');
  };

  const filteredStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();

    if (!search) return eligibleStudents;

    return eligibleStudents.filter((student) =>
      [student.name, student.email, student.college_id, student.branch]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search))
    );
  }, [eligibleStudents, studentSearch]);

  const handleAllocateStudent = async () => {
    if (!allocationRoom || !selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    try {
      setAllocating(true);

      await hostelService.allocateStudent({
        student_id: selectedStudentId,
        room_id: allocationRoom._id,
      });

      toast.success('Student allocated successfully');
      closeAllocationModal();
      closeRoomModal();
      await loadLayout(selectedBlock);
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to allocate student';
      toast.error(message);
    } finally {
      setAllocating(false);
    }
  };

  const handleDeallocate = async (studentId) => {
    try {
      setDeallocatingId(studentId);

      await hostelService.deallocateStudent(studentId);

      toast.success('Student deallocated successfully');
      closeRoomModal();
      await loadLayout(selectedBlock);
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to deallocate student';
      toast.error(message);
    } finally {
      setDeallocatingId('');
    }
  };

  const createNewConfig = () => {
    setSelectedBlock('');
    setLayoutData(null);
    setConfigForm({
      hostel_name: '',
      hostel_block: '',
      block_gender: '',
      total_floors: 1,
      rooms_per_floor: 1,
      default_capacity: 3,
    });
  };

  const openBulkModal = () => {
    setBulkPreview(null);
    setBulkForm({
      mode: 'random',
      scope: 'unallocated',
      selected_blocks: selectedBlock ? [selectedBlock] : [],
    });
    setBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    setBulkModalOpen(false);
    setBulkPreview(null);
    setBulkForm({
      mode: 'random',
      scope: 'unallocated',
      selected_blocks: [],
    });
  };

  const handleBulkFieldChange = (e) => {
    const { name, value } = e.target;

    setBulkPreview(null);

    setBulkForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'scope'
        ? {
            selected_blocks:
              value === 'reshuffle_selected_blocks'
                ? prev.selected_blocks.length > 0
                  ? prev.selected_blocks
                  : selectedBlock
                    ? [selectedBlock]
                    : []
                : [],
          }
        : {}),
    }));
  };

  const toggleBulkSelectedBlock = (block) => {
    setBulkPreview(null);

    setBulkForm((prev) => {
      const normalizedBlock = block.toUpperCase();
      const exists = prev.selected_blocks.includes(normalizedBlock);

      return {
        ...prev,
        selected_blocks: exists
          ? prev.selected_blocks.filter((item) => item !== normalizedBlock)
          : [...prev.selected_blocks, normalizedBlock].sort(),
      };
    });
  };

  const getBulkPayload = () => {
    const payload = {
      mode: bulkForm.mode,
      scope: bulkForm.scope,
    };

    if (bulkForm.scope === 'reshuffle_selected_blocks') {
      payload.selected_blocks = bulkForm.selected_blocks;
    }

    return payload;
  };

  const handlePreviewBulkAllocation = async () => {
    if (
      bulkForm.scope === 'reshuffle_selected_blocks' &&
      bulkForm.selected_blocks.length === 0
    ) {
      toast.error('Please select at least one block for selected-block reshuffle');
      return;
    }

    try {
      setBulkPreviewLoading(true);
      const response = await hostelService.previewBulkAllocation(getBulkPayload());
      setBulkPreview(response.data.data.preview);
      toast.success('Bulk allocation preview generated');
    } catch (error) {
      console.error('Failed to preview bulk allocation:', error);
      const message =
        error.response?.data?.message || 'Failed to generate bulk allocation preview';
      toast.error(message);
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  const handleExecuteBulkAllocation = async () => {
    if (!bulkPreview) {
      toast.error('Please generate a preview first');
      return;
    }

    if (bulkPreview.unallocated_students?.length > 0) {
      toast.error(
        'Execution is blocked because some students could not be allocated. Please review the preview first.'
      );
      return;
    }

    try {
      setBulkExecuting(true);

      const payload = {
        mode: bulkPreview.mode,
        scope: bulkPreview.scope,
        seed: bulkPreview.seed,
      };

      if (bulkPreview.scope === 'reshuffle_selected_blocks') {
        payload.selected_blocks = bulkPreview.selected_blocks;
      }

      await hostelService.executeBulkAllocation(payload);

      toast.success('Bulk allocation executed successfully');
      closeBulkModal();
      await loadLayout(selectedBlock);
    } catch (error) {
      console.error('Failed to execute bulk allocation:', error);
      const message =
        error.response?.data?.message || 'Failed to execute bulk allocation';
      toast.error(message);
    } finally {
      setBulkExecuting(false);
    }
  };

  const stats = layoutData?.stats || {
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    emptyRooms: 0,
    partialRooms: 0,
    fullRooms: 0,
    maintenanceRooms: 0,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>

        <div className="flex flex-wrap items-center gap-2">
          {configs.length > 0 && (
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              {configs.map((config) => (
                <option key={config._id} value={config.hostel_block}>
                  Block {config.hostel_block} •{' '}
                  {config.block_gender === 'male' ? 'Male' : 'Female'}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => loadLayout(selectedBlock)}
            className="p-2 border rounded-lg hover:bg-gray-50"
            title="Refresh Layout"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={openBulkModal}
            className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            Bulk Allocation
          </button>

          <button
            onClick={createNewConfig}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            New Config
          </button>
        </div>
      </div>

      {/* Config Form */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Hostel Block Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hostel Name
            </label>
            <input
              type="text"
              name="hostel_name"
              value={configForm.hostel_name}
              onChange={handleConfigChange}
              placeholder="e.g. Boys Hostel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Block
            </label>
            <input
              type="text"
              name="hostel_block"
              value={configForm.hostel_block}
              onChange={handleConfigChange}
              maxLength={1}
              placeholder="A"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Block Gender
            </label>
            <select
              name="block_gender"
              value={configForm.block_gender}
              onChange={handleConfigChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select gender type</option>
              <option value="male">Male Block</option>
              <option value="female">Female Block</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Floors
            </label>
            <input
              type="number"
              name="total_floors"
              value={configForm.total_floors}
              onChange={handleConfigChange}
              min={1}
              max={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rooms / Floor
            </label>
            <input
              type="number"
              name="rooms_per_floor"
              value={configForm.rooms_per_floor}
              onChange={handleConfigChange}
              min={1}
              max={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beds / Room
            </label>
            <input
              type="number"
              name="default_capacity"
              value={configForm.default_capacity}
              onChange={handleConfigChange}
              min={1}
              max={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50"
          >
            {savingConfig ? 'Saving...' : 'Save Config'}
          </button>

          <button
            onClick={handleGenerateRooms}
            disabled={generating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Rooms'}
          </button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Building2}
          label="Total Rooms"
          value={stats.totalRooms}
          subtext={`Block ${layoutData?.block || '-'}`}
          color="indigo"
        />

        <StatCard
          icon={BedDouble}
          label="Occupied Beds"
          value={stats.occupiedBeds}
          subtext={`of ${stats.totalBeds} total beds`}
          color="yellow"
        />

        <StatCard
          icon={Users}
          label="Available Beds"
          value={stats.availableBeds}
          subtext={`${stats.emptyRooms} empty rooms`}
          color="green"
        />

        <StatCard
          icon={Layers}
          label="Full Rooms"
          value={stats.fullRooms}
          subtext={`${stats.partialRooms} partial rooms`}
          color="red"
        />
      </div>

      {/* Layout */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : layoutData?.floors?.length > 0 ? (
        <div className="space-y-6">
          {layoutData.floors.map((floorGroup) => (
            <Card key={floorGroup.floor} className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Floor {floorGroup.floor}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {floorGroup.rooms.map((room) => (
                  <button
                    key={room._id}
                    onClick={() => openRoomModal(room)}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      statusStyles[room.status] || statusStyles.empty
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{room.room_no}</p>
                      <Badge status={room.status}>{room.status}</Badge>
                    </div>

                    <p className="text-sm text-gray-600 mb-1">
                      {room.occupied} / {room.capacity} occupied
                    </p>

                    <p className="text-xs text-gray-500">
                      {room.students.length > 0
                        ? room.students
                            .slice(0, 2)
                            .map((student) => student.name)
                            .join(', ')
                        : 'No students'}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={BedDouble}
            title="No rooms generated yet"
            description="Save a hostel config and click Generate Rooms to create the room layout."
          />
        </Card>
      )}

      {/* Room Details Modal */}
      {roomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeRoomModal} />

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Room {roomModal.hostel_block}-{roomModal.room_no}
                </h2>
                <p className="text-sm text-gray-500">
                  Floor {roomModal.floor} • Capacity {roomModal.capacity}
                </p>
              </div>

              <button
                onClick={closeRoomModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5">
              <Badge status={roomModal.status}>{roomModal.status}</Badge>
              <span className="text-sm text-gray-500">
                Occupancy: {roomModal.occupied}/{roomModal.capacity}
              </span>
            </div>

            {roomModal.students?.length > 0 ? (
              <div className="space-y-3 mb-5">
                {roomModal.students.map((student) => (
                  <div
                    key={student._id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {student.college_id || 'No PRN'} • {student.branch || 'No branch'} • Bed {student.bed_no || '-'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeallocate(student._id)}
                      disabled={deallocatingId === student._id}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      <UserMinus className="w-4 h-4" />
                      {deallocatingId === student._id ? 'Removing...' : 'Deallocate'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg mb-5">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No students allocated yet</p>
              </div>
            )}

            {roomModal.occupied < roomModal.capacity &&
              roomModal.status !== 'maintenance' && (
                <button
                  onClick={() => openAllocationModal(roomModal)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <UserPlus className="w-4 h-4" />
                  Allocate Student
                </button>
              )}
          </div>
        </div>
      )}

      {/* Manual Allocation Modal */}
      {allocationRoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeAllocationModal}
          />

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Allocate Student
                </h2>
                <p className="text-sm text-gray-500">
                  Room {allocationRoom.hostel_block}-{allocationRoom.room_no}
                </p>
              </div>

              <button
                onClick={closeAllocationModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name, email, PRN, branch..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {eligibleLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-auto">
                {filteredStudents.map((student) => (
                  <button
                    key={student._id}
                    onClick={() => setSelectedStudentId(student._id)}
                    className={`w-full text-left p-4 border rounded-lg transition-all ${
                      selectedStudentId === student._id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {student.college_id || 'No PRN'} • {student.branch || 'No branch'}
                      {student.year ? ` • Year ${student.year}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No eligible students found"
                description="All hosteller students may already be allocated."
              />
            )}

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={closeAllocationModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>

              <button
                onClick={handleAllocateStudent}
                disabled={!selectedStudentId || allocating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {allocating ? 'Allocating...' : 'Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Allocation Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeBulkModal}
          />

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-6xl p-6 max-h-[92vh] overflow-auto">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Bulk Room Allocation
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Preview the allocation first, then execute only when the plan looks correct.
                </p>
              </div>

              <button
                onClick={closeBulkModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls */}
            <Card className="p-5 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allocation Mode
                  </label>
                  <select
                    name="mode"
                    value={bulkForm.mode}
                    onChange={handleBulkFieldChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="random">Random</option>
                    <option value="preference">Preference</option>
                    <option value="branch">Branch</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-2">
                    {modeDescriptions[bulkForm.mode]}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allocation Scope
                  </label>
                  <select
                    name="scope"
                    value={bulkForm.scope}
                    onChange={handleBulkFieldChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="unallocated">Allocate Unallocated Only</option>
                    <option value="reshuffle_selected_blocks">Reshuffle Selected Blocks</option>
                    <option value="reshuffle_all">Reshuffle All Eligible Students</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-2">
                    {scopeDescriptions[bulkForm.scope]}
                  </p>
                </div>
              </div>

              {bulkForm.scope === 'reshuffle_selected_blocks' && (
                <div className="mt-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Blocks to Reshuffle
                  </label>

                  {configs.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {configs.map((config) => {
                        const checked = bulkForm.selected_blocks.includes(
                          config.hostel_block
                        );

                        return (
                          <label
                            key={config._id}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all ${
                              checked
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleBulkSelectedBlock(config.hostel_block)}
                            />
                            <span className="text-sm text-gray-700">
                              Block {config.hostel_block} •{' '}
                              {config.block_gender === 'male' ? 'Male' : 'Female'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No hostel blocks configured yet.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 mt-5">
                <button
                  onClick={handlePreviewBulkAllocation}
                  disabled={bulkPreviewLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
                >
                  {bulkPreviewLoading ? 'Generating Preview...' : 'Preview Allocation'}
                </button>

                <button
                  onClick={handleExecuteBulkAllocation}
                  disabled={
                    !bulkPreview ||
                    bulkExecuting ||
                    (bulkPreview?.unallocated_students?.length || 0) > 0
                  }
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed"
                >
                  {bulkExecuting ? 'Executing...' : 'Execute Allocation'}
                </button>
              </div>
            </Card>

            {/* Preview */}
            {bulkPreview && (
              <div className="space-y-6">
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Preview Summary
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Mode: <span className="font-medium text-gray-700">{bulkPreview.mode}</span> •
                        Scope: <span className="font-medium text-gray-700 ml-1">{bulkPreview.scope}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Seed: {bulkPreview.seed}
                      </p>
                    </div>

                    <div className="text-sm text-gray-500">
                      Blocks in scope:{' '}
                      <span className="font-medium text-gray-700">
                        {bulkPreview.selected_blocks?.join(', ') || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-gray-50 border">
                      <p className="text-xs text-gray-500 mb-1">Eligible Students</p>
                      <p className="text-xl font-bold text-gray-900">
                        {bulkPreview.summary.totalEligibleStudents}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border">
                      <p className="text-xs text-gray-500 mb-1">Available Beds Before</p>
                      <p className="text-xl font-bold text-gray-900">
                        {bulkPreview.room_stats.availableBedsBeforeAllocation}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border">
                      <p className="text-xs text-gray-500 mb-1">Skipped Students</p>
                      <p className="text-xl font-bold text-gray-900">
                        {bulkPreview.summary.studentsSkipped}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border">
                      <p className="text-xs text-gray-500 mb-1">Could Not Be Allocated</p>
                      <p className="text-xl font-bold text-gray-900">
                        {bulkPreview.summary.studentsCouldNotBeAllocated}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border">
                      <p className="text-xs text-gray-500 mb-1">Pairs Honored</p>
                      <p className="text-xl font-bold text-gray-900">
                        {bulkPreview.summary.preferencePairsHonored}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border">
                      <p className="text-xs text-gray-500 mb-1">Fallback Allocations</p>
                      <p className="text-xl font-bold text-gray-900">
                        {bulkPreview.summary.fallbackAllocationsCount}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border">
                      <p className="text-xs text-gray-500 mb-1">Students To Allocate</p>
                      <p className="text-xl font-bold text-gray-900">
                        {bulkPreview.summary.studentsToAllocate}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border">
                      <p className="text-xs text-gray-500 mb-1">Rooms Considered</p>
                      <p className="text-xl font-bold text-gray-900">
                        {bulkPreview.room_stats.totalRoomsConsidered}
                      </p>
                    </div>
                  </div>
                </Card>

                {(bulkPreview.unallocated_students?.length || 0) > 0 && (
                  <Card className="p-5 border-red-200 bg-red-50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-red-900">
                          Execution Blocked
                        </h3>
                        <p className="text-sm text-red-700 mt-1">
                          Some students could not be allocated in this preview. Please review and fix capacity/scope before executing.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Planned Allocations ({bulkPreview.allocations?.length || 0})
                  </h3>

                  {bulkPreview.allocations?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-gray-700">
                              Student
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-700">
                              Branch
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-700">
                              Year
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-700">
                              Room
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-700">
                              Bed
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-700">
                              Stage
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {bulkPreview.allocations.map((item) => {
                            const stage =
                              allocationStageMeta[item.allocation_stage] || {
                                label: item.allocation_stage,
                                className: 'bg-gray-100 text-gray-700',
                              };

                            return (
                              <tr key={item.student_id} className="border-b last:border-b-0">
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.gender}</p>
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-gray-600">
                                  {item.branch}
                                </td>

                                <td className="px-4 py-3 text-gray-600">
                                  {item.year || '-'}
                                </td>

                                <td className="px-4 py-3 text-gray-600">
                                  {item.hostel_block}-{item.room_no} (Floor {item.floor})
                                </td>

                                <td className="px-4 py-3 text-gray-600">
                                  {item.bed_no}
                                </td>

                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${stage.className}`}
                                  >
                                    {stage.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="No allocations generated"
                      description="Try changing the mode or scope and generate preview again."
                    />
                  )}
                </Card>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Skipped Students ({bulkPreview.skipped_students?.length || 0})
                    </h3>

                    {bulkPreview.skipped_students?.length > 0 ? (
                      <div className="space-y-3 max-h-72 overflow-auto">
                        {bulkPreview.skipped_students.map((student) => (
                          <div key={student.student_id} className="border rounded-lg p-3">
                            <p className="font-medium text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-500 mt-1">{student.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No skipped students in this preview.</p>
                    )}
                  </Card>

                  <Card className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Unallocated Students ({bulkPreview.unallocated_students?.length || 0})
                    </h3>

                    {bulkPreview.unallocated_students?.length > 0 ? (
                      <div className="space-y-3 max-h-72 overflow-auto">
                        {bulkPreview.unallocated_students.map((student) => (
                          <div key={student.student_id} className="border rounded-lg p-3">
                            <p className="font-medium text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-500">
                              {student.branch} • {student.gender}
                            </p>
                            <p className="text-sm text-red-600 mt-1">{student.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Great — every student in this preview can be allocated.
                      </p>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomLayout;