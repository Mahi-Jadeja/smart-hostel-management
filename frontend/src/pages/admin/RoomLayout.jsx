import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Settings,
  Wand2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import hostelService from '../../services/hostel.service';
import toast from 'react-hot-toast';

// Status color mapping for room cards
const statusStyles = {
  empty: 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30',
  partial: 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30',
  full: 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30',
  maintenance: 'bg-slate-500/5 border-slate-500/20 hover:bg-slate-500/10 hover:border-slate-500/30',
};

// Metadata for allocation stages in bulk preview
const allocationStageMeta = {
  random: { label: 'Random', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  preferred_pair: { label: 'Preferred Pair', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  same_year_same_branch: { label: 'Same Year + Branch', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  same_year: { label: 'Same Year', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  final_random: { label: 'Final Random', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  same_gender_mixed: { label: 'Same Gender Mixed', className: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
};

const modeDescriptions = {
  random: 'Randomly allocate students into gender-compatible blocks. Branch is ignored.',
  preference: 'Honor clean mutual roommate pairs first, then fallback to same year/branch rules.',
  branch: 'Try to keep same year and same branch together first, then same year, then same gender.',
};

const scopeDescriptions = {
  unallocated: 'Only currently unallocated students will be considered.',
  reshuffle_selected_blocks: 'Reshuffle students in selected blocks and also include matching unallocated students.',
  reshuffle_all: 'Clear all eligible allocations and run allocation again for everyone.',
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
  const [showPreviewDetails, setShowPreviewDetails] = useState(false);

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

  /**
   * BUG FIX — Block Switching:
   *
   * The original bug: `loadConfigs` was called inside an async function
   * that also set `selectedBlock`. When `loadConfigs` ran, it checked
   * `if (!selectedBlock && items.length > 0)` — but `selectedBlock` in
   * that closure was the OLD state value (stale closure).
   *
   * Fix: Use a ref to track if this is the FIRST load.
   * On first load → set selectedBlock to first config.
   * On subsequent loads (after save) → preserve the current selectedBlock.
   * The dropdown onChange handler sets selectedBlock directly, so it always works.
   */
  const isFirstLoad = useRef(true);

  /**
   * Load all hostel configs from backend.
   * Only auto-selects first block on initial mount.
   */
  const loadConfigs = async () => {
    try {
      const response = await hostelService.getConfigs();
      const items = response.data.data.configs || [];
      setConfigs(items);

      // Only auto-select the first block on the very first load
      // After that, preserve whatever block the admin has selected
      if (isFirstLoad.current && items.length > 0) {
        setSelectedBlock(items[0].hostel_block);
        isFirstLoad.current = false;
      }
    } catch (error) {
      console.error('Failed to load configs:', error);
      toast.error('Failed to load hostel configs');
    }
  };

  /**
   * Load room layout for a specific block.
   * Called whenever selectedBlock changes.
   */
  const loadLayout = async (block) => {
    if (!block) return;
    try {
      setLoading(true);
      const response = await hostelService.getLayout({ block });
      setLayoutData(response.data.data);
    } catch (error) {
      console.error('Failed to load layout:', error);
      toast.error('Failed to load room layout');
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    loadConfigs();
  }, []);

  /**
   * When selectedBlock changes, update the config form and reload layout.
   * This fires when:
   * 1. Admin selects a different block from the dropdown
   * 2. After saving a new config (selectedBlock is set to new block)
   */
  useEffect(() => {
    if (!selectedBlock || configs.length === 0) return;

    const selectedConfig = configs.find(
      (config) => config.hostel_block === selectedBlock
    );

    if (selectedConfig) {
      // Populate config form with the selected block's settings
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
  }, [selectedBlock, configs]);

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfigForm((prev) => ({
      ...prev,
      [name]: ['total_floors', 'rooms_per_floor', 'default_capacity'].includes(name)
        ? Number(value)
        : value,
    }));
  };

  const handleSaveConfig = async () => {
    if (!configForm.hostel_name.trim() || !configForm.hostel_block.trim() || !configForm.block_gender) {
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

      // Reload configs — isFirstLoad.current is false so it won't override selectedBlock
      await loadConfigs();

      // Explicitly set to the saved block so admin sees its layout
      setSelectedBlock(payload.hostel_block);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save hostel config');
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
      await hostelService.generateRooms({ hostel_block: payload.hostel_block });

      toast.success('Rooms generated successfully');
      await loadConfigs();
      setSelectedBlock(payload.hostel_block);
      await loadLayout(payload.hostel_block);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate rooms');
    } finally {
      setGenerating(false);
    }
  };

  const openRoomModal = (room) => setRoomModal(room);
  const closeRoomModal = () => setRoomModal(null);

  /**
   * Open allocation modal for a room.
   *
   * GENDER FIX: We fetch eligible students then filter them by the
   * room's block gender. A male block should only show male students.
   *
   * We find the block gender from the configs array using the room's hostel_block.
   */
  const openAllocationModal = async (room) => {
    setAllocationRoom(room);
    setSelectedStudentId('');
    setStudentSearch('');

    try {
      setEligibleLoading(true);
      const response = await hostelService.getEligibleStudents({ limit: 200 });
      const allEligible = response.data.data.students || [];

      // Find this room's block config to get its gender
      const blockConfig = configs.find(
        (c) => c.hostel_block === room.hostel_block
      );
      const blockGender = blockConfig?.block_gender;

      // Filter students by gender to match the block
      // If block gender is set, only show matching gender students
      const genderFiltered = blockGender
        ? allEligible.filter((s) => s.gender === blockGender)
        : allEligible;

      setEligibleStudents(genderFiltered);
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

  /**
   * Get the current room's block gender for UI display.
   * Used to show a warning/info banner in the allocation modal.
   */
  const getAllocationRoomGender = () => {
    if (!allocationRoom) return null;
    const blockConfig = configs.find(
      (c) => c.hostel_block === allocationRoom.hostel_block
    );
    return blockConfig?.block_gender || null;
  };

  // Filter students by search query
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
      toast.error(error.response?.data?.message || 'Failed to allocate student');
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
      toast.error(error.response?.data?.message || 'Failed to deallocate student');
    } finally {
      setDeallocatingId('');
    }
  };

  /**
   * Create new config — clear form and block selection.
   * isFirstLoad stays false so after saving, switching still works.
   */
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
    setShowPreviewDetails(false);
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
    setShowPreviewDetails(false);
    setBulkForm({ mode: 'random', scope: 'unallocated', selected_blocks: [] });
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
                  : selectedBlock ? [selectedBlock] : []
                : [],
          }
        : {}),
    }));
  };

  const toggleBulkSelectedBlock = (block) => {
    setBulkPreview(null);
    setBulkForm((prev) => {
      const normalized = block.toUpperCase();
      const exists = prev.selected_blocks.includes(normalized);
      return {
        ...prev,
        selected_blocks: exists
          ? prev.selected_blocks.filter((b) => b !== normalized)
          : [...prev.selected_blocks, normalized].sort(),
      };
    });
  };

  const getBulkPayload = () => {
    const payload = { mode: bulkForm.mode, scope: bulkForm.scope };
    if (bulkForm.scope === 'reshuffle_selected_blocks') {
      payload.selected_blocks = bulkForm.selected_blocks;
    }
    return payload;
  };

  const handlePreviewBulkAllocation = async () => {
    if (bulkForm.scope === 'reshuffle_selected_blocks' && bulkForm.selected_blocks.length === 0) {
      toast.error('Please select at least one block');
      return;
    }

    try {
      setBulkPreviewLoading(true);
      const response = await hostelService.previewBulkAllocation(getBulkPayload());
      setBulkPreview(response.data.data.preview);
      toast.success('Bulk allocation preview generated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate preview');
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
      toast.error('Execution blocked: some students could not be allocated');
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
      toast.error(error.response?.data?.message || 'Failed to execute allocation');
    } finally {
      setBulkExecuting(false);
    }
  };

  const stats = layoutData?.stats || {
    totalRooms: 0, totalBeds: 0, occupiedBeds: 0, availableBeds: 0,
    emptyRooms: 0, partialRooms: 0, fullRooms: 0, maintenanceRooms: 0,
  };

  // Get current block's gender for display
  const currentBlockGender = configs.find(
    (c) => c.hostel_block === selectedBlock
  )?.block_gender;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ======== HEADER ======== */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Room Management</h1>
          <p className="text-muted-foreground mt-1">
            Configure hostel blocks and manage room allocations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* 
            Block selector dropdown.
            Shows ALL configs from the configs state array.
            Changing this sets selectedBlock which triggers the useEffect
            to load that block's config form + layout.
          */}
          {configs.length > 0 && (
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            >
              {configs.map((config) => (
                <option key={config._id} value={config.hostel_block}>
                  Block {config.hostel_block} •{' '}
                  {config.block_gender === 'male' ? '♂ Male' : '♀ Female'}
                </option>
              ))}
            </select>
          )}

          {/* Current block gender indicator */}
          {currentBlockGender && (
            <span className={`
              px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5
              ${currentBlockGender === 'male'
                ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                : 'bg-pink-500/10 text-pink-600 border border-pink-500/20'
              }
            `}>
              <ShieldAlert className="w-4 h-4" />
              {currentBlockGender === 'male' ? 'Male Only' : 'Female Only'}
            </span>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => loadLayout(selectedBlock)}
            className="p-2.5 border border-input rounded-lg hover:bg-secondary transition-colors"
            title="Refresh Layout"
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openBulkModal}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-lg shadow-emerald-500/25 flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            Bulk Allocation
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={createNewConfig}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium shadow-lg shadow-primary/25 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            New Config
          </motion.button>
        </div>
      </div>

      {/* ======== CONFIGURATION FORM ======== */}
      <Card className="p-6 glass-card">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Hostel Block Configuration
          {configForm.hostel_block && (
            <span className="text-sm font-normal text-muted-foreground">
              — Editing Block {configForm.hostel_block.toUpperCase()}
            </span>
          )}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Hostel Name</label>
            <input
              type="text"
              name="hostel_name"
              value={configForm.hostel_name}
              onChange={handleConfigChange}
              placeholder="e.g. Boys Hostel"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Block</label>
            <input
              type="text"
              name="hostel_block"
              value={configForm.hostel_block}
              onChange={handleConfigChange}
              maxLength={1}
              placeholder="A"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Block Gender</label>
            <select
              name="block_gender"
              value={configForm.block_gender}
              onChange={handleConfigChange}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            >
              <option value="">Select gender</option>
              <option value="male">♂ Male Block</option>
              <option value="female">♀ Female Block</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Floors</label>
            <input
              type="number"
              name="total_floors"
              value={configForm.total_floors}
              onChange={handleConfigChange}
              min={1} max={10}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Rooms / Floor</label>
            <input
              type="number"
              name="rooms_per_floor"
              value={configForm.rooms_per_floor}
              onChange={handleConfigChange}
              min={1} max={20}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Beds / Room</label>
            <input
              type="number"
              name="default_capacity"
              value={configForm.default_capacity}
              onChange={handleConfigChange}
              min={1} max={6}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 font-medium transition-all"
          >
            {savingConfig ? 'Saving...' : 'Save Config'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateRooms}
            disabled={generating}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium shadow-lg shadow-primary/25 transition-all"
          >
            {generating ? 'Generating...' : 'Generate Rooms'}
          </motion.button>
        </div>
      </Card>

      {/* ======== STATISTICS ======== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total Rooms" value={stats.totalRooms} subtext={`Block ${layoutData?.block || '-'}`} color="indigo" />
        <StatCard icon={BedDouble} label="Occupied Beds" value={stats.occupiedBeds} subtext={`of ${stats.totalBeds} total beds`} color="amber" trend={stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0} />
        <StatCard icon={Users} label="Available Beds" value={stats.availableBeds} subtext={`${stats.emptyRooms} empty rooms`} color="emerald" />
        <StatCard icon={Layers} label="Full Rooms" value={stats.fullRooms} subtext={`${stats.partialRooms} partial rooms`} color="rose" />
      </div>

      {/* ======== ROOM LAYOUT GRID ======== */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : layoutData?.floors?.length > 0 ? (
        <div className="space-y-6">
          {layoutData.floors.map((floorGroup) => (
            <Card key={floorGroup.floor} className="p-6 glass-card">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-muted-foreground" />
                Floor {floorGroup.floor}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {floorGroup.rooms.map((room) => (
                  <motion.button
                    key={room._id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openRoomModal(room)}
                    className={`text-left rounded-xl border p-4 transition-all ${statusStyles[room.status] || statusStyles.empty}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-foreground">{room.room_no}</p>
                      <Badge status={room.status} className="text-xs">{room.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {room.occupied} / {room.capacity} occupied
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {room.students.length > 0
                        ? room.students.slice(0, 2).map((s) => s.name).join(', ')
                        : 'No students'}
                    </p>
                  </motion.button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 glass-card">
          <EmptyState
            icon={BedDouble}
            title="No rooms generated yet"
            description="Save a hostel config and click Generate Rooms to create the room layout."
            action={{ label: 'Create Config', onClick: createNewConfig }}
          />
        </Card>
      )}

      {/* ======== ROOM DETAILS MODAL ======== */}
      <AnimatePresence>
        {roomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeRoomModal} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-card w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-auto shadow-2xl border border-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Room {roomModal.hostel_block}-{roomModal.room_no}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Floor {roomModal.floor} • Capacity {roomModal.capacity}
                    {(() => {
                      const gc = configs.find(c => c.hostel_block === roomModal.hostel_block)?.block_gender;
                      return gc ? ` • ${gc === 'male' ? '♂ Male Block' : '♀ Female Block'}` : '';
                    })()}
                  </p>
                </div>
                <button onClick={closeRoomModal} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Badge status={roomModal.status}>{roomModal.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  Occupancy: {roomModal.occupied}/{roomModal.capacity}
                </span>
              </div>

              {roomModal.students?.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {roomModal.students.map((student) => (
                    <motion.div key={student._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border">
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {student.college_id || 'No PRN'} • {student.branch || 'No branch'} • Bed {student.bed_no || '-'}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeallocate(student._id)}
                        disabled={deallocatingId === student._id}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                      >
                        <UserMinus className="w-4 h-4" />
                        {deallocatingId === student._id ? 'Removing...' : 'Deallocate'}
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-secondary/30 rounded-xl mb-6 border border-dashed border-border">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No students allocated yet</p>
                </div>
              )}

              {roomModal.occupied < roomModal.capacity && roomModal.status !== 'maintenance' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openAllocationModal(roomModal)}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Allocate Student
                </motion.button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======== MANUAL ALLOCATION MODAL (WITH GENDER FILTER) ======== */}
      <AnimatePresence>
        {allocationRoom && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAllocationModal} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-card w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-auto shadow-2xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Allocate Student</h2>
                  <p className="text-sm text-muted-foreground">
                    Room {allocationRoom.hostel_block}-{allocationRoom.room_no}
                  </p>
                </div>
                <button onClick={closeAllocationModal} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Gender filter info banner */}
              {getAllocationRoomGender() && (
                <div className={`
                  flex items-center gap-3 p-3 rounded-xl mb-4 text-sm font-medium
                  ${getAllocationRoomGender() === 'male'
                    ? 'bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400'
                    : 'bg-pink-500/10 border border-pink-500/20 text-pink-700 dark:text-pink-400'
                  }
                `}>
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="font-semibold">
                      {getAllocationRoomGender() === 'male' ? 'Male Block' : 'Female Block'}
                    </span>
                    {' — '}Only{' '}
                    {getAllocationRoomGender() === 'male' ? 'male' : 'female'}{' '}
                    students are shown below. Gender-based filtering is enforced.
                  </div>
                </div>
              )}

              <div className="relative mb-4">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name, email, PRN, branch..."
                  className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              {eligibleLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filteredStudents.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-auto pr-2">
                  {filteredStudents.map((student) => (
                    <motion.button
                      key={student._id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedStudentId(student._id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedStudentId === student._id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30 hover:bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {student.college_id || 'No PRN'} • {student.branch || 'No branch'}
                            {student.year ? ` • Year ${student.year}` : ''}
                          </p>
                        </div>
                        {/* Gender badge on each student */}
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize shrink-0 ${
                          student.gender === 'male'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-pink-500/10 text-pink-600'
                        }`}>
                          {student.gender || 'unknown'}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-foreground font-medium mb-1">
                    No eligible {getAllocationRoomGender()} students found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All {getAllocationRoomGender()} hosteller students may already be allocated,
                    or no {getAllocationRoomGender()} students have registered yet.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                Showing {filteredStudents.length} eligible{' '}
                {getAllocationRoomGender() || ''} student
                {filteredStudents.length !== 1 ? 's' : ''}
              </p>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
                <button onClick={closeAllocationModal} className="px-6 py-2.5 text-foreground hover:bg-secondary rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAllocateStudent}
                  disabled={!selectedStudentId || allocating}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium shadow-lg shadow-primary/25 transition-all"
                >
                  {allocating ? 'Allocating...' : 'Allocate Student'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======== BULK ALLOCATION MODAL ======== */}
      <AnimatePresence>
        {bulkModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeBulkModal} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-card w-full max-w-6xl rounded-2xl p-6 max-h-[92vh] overflow-auto shadow-2xl border border-border">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Wand2 className="w-6 h-6 text-primary" />
                    Bulk Room Allocation
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Preview the allocation first, then execute only when the plan looks correct.
                  </p>
                </div>
                <button onClick={closeBulkModal} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <Card className="p-6 mb-6 glass-card border-primary/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Allocation Mode</label>
                    <select name="mode" value={bulkForm.mode} onChange={handleBulkFieldChange} className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                      <option value="random">Random</option>
                      <option value="preference">Preference</option>
                      <option value="branch">Branch</option>
                    </select>
                    <p className="text-xs text-muted-foreground">{modeDescriptions[bulkForm.mode]}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Allocation Scope</label>
                    <select name="scope" value={bulkForm.scope} onChange={handleBulkFieldChange} className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                      <option value="unallocated">Allocate Unallocated Only</option>
                      <option value="reshuffle_selected_blocks">Reshuffle Selected Blocks</option>
                      <option value="reshuffle_all">Reshuffle All Eligible Students</option>
                    </select>
                    <p className="text-xs text-muted-foreground">{scopeDescriptions[bulkForm.scope]}</p>
                  </div>
                </div>

                {bulkForm.scope === 'reshuffle_selected_blocks' && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <label className="block text-sm font-medium text-foreground mb-3">Select Blocks to Reshuffle</label>
                    {configs.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {configs.map((config) => {
                          const checked = bulkForm.selected_blocks.includes(config.hostel_block);
                          return (
                            <motion.label key={config._id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleBulkSelectedBlock(config.hostel_block)} className="w-4 h-4 rounded border-primary text-primary focus:ring-primary" />
                              <span className="text-sm font-medium text-foreground">
                                Block {config.hostel_block} • {config.block_gender === 'male' ? '♂ Male' : '♀ Female'}
                              </span>
                            </motion.label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hostel blocks configured yet.</p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3 mt-6 pt-6 border-t border-border">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handlePreviewBulkAllocation} disabled={bulkPreviewLoading} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium shadow-lg shadow-primary/25 transition-all">
                    {bulkPreviewLoading ? 'Generating Preview...' : 'Preview Allocation'}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleExecuteBulkAllocation} disabled={!bulkPreview || bulkExecuting || (bulkPreview?.unallocated_students?.length || 0) > 0} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-emerald-500/25 transition-all">
                    {bulkExecuting ? 'Executing...' : 'Execute Allocation'}
                  </motion.button>
                </div>
              </Card>

              {/* Preview Content */}
              {bulkPreview && (
                <div className="space-y-6">
                  <Card className="p-6 glass-card">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Preview Summary</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary">{bulkPreview.mode}</Badge>
                          <span>•</span>
                          <span>{bulkPreview.scope}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">Seed: {bulkPreview.seed}</p>
                      </div>
                      <div className="text-sm text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg">
                        Blocks: <span className="font-medium text-foreground">{bulkPreview.selected_blocks?.join(', ') || 'All'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Eligible Students', value: bulkPreview.summary.totalEligibleStudents },
                        { label: 'Available Beds', value: bulkPreview.room_stats.availableBedsBeforeAllocation },
                        { label: 'Skipped', value: bulkPreview.summary.studentsSkipped },
                        { label: 'Unallocated', value: bulkPreview.summary.studentsCouldNotBeAllocated },
                        { label: 'Pairs Honored', value: bulkPreview.summary.preferencePairsHonored },
                        { label: 'Fallback', value: bulkPreview.summary.fallbackAllocationsCount },
                        { label: 'To Allocate', value: bulkPreview.summary.studentsToAllocate },
                        { label: 'Rooms Considered', value: bulkPreview.room_stats.totalRoomsConsidered },
                      ].map((stat, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-secondary/30 border border-border">
                          <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {(bulkPreview.unallocated_students?.length || 0) > 0 && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-destructive">Execution Blocked</h3>
                        <p className="text-sm text-destructive/80 mt-1">Some students could not be allocated. Review capacity/scope before executing.</p>
                      </div>
                    </div>
                  )}

                  <Card className="glass-card overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Planned Allocations ({bulkPreview.allocations?.length || 0})</h3>
                      <button onClick={() => setShowPreviewDetails(!showPreviewDetails)} className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
                        {showPreviewDetails ? <>Hide <ChevronUp className="w-4 h-4" /></> : <>Show <ChevronDown className="w-4 h-4" /></>}
                      </button>
                    </div>
                    {showPreviewDetails && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-secondary/50 border-b border-border">
                            <tr>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Student</th>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Branch</th>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Year</th>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Room</th>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Bed</th>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Stage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkPreview.allocations?.map((item) => {
                              const stage = allocationStageMeta[item.allocation_stage] || { label: item.allocation_stage, className: 'bg-secondary text-secondary-foreground' };
                              return (
                                <tr key={item.student_id} className="border-b border-border/50 last:border-b-0 hover:bg-secondary/20">
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-foreground">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.gender}</p>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">{item.branch}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{item.year || '-'}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{item.hostel_block}-{item.room_no} (Floor {item.floor})</td>
                                  <td className="px-4 py-3 text-muted-foreground">{item.bed_no}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${stage.className}`}>{stage.label}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Card className="p-5 glass-card">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Skipped Students ({bulkPreview.skipped_students?.length || 0})</h3>
                      {bulkPreview.skipped_students?.length > 0 ? (
                        <div className="space-y-3 max-h-72 overflow-auto">
                          {bulkPreview.skipped_students.map((student) => (
                            <div key={student.student_id} className="p-3 rounded-lg bg-secondary/30 border border-border">
                              <p className="font-medium text-foreground">{student.name}</p>
                              <p className="text-sm text-muted-foreground mt-1">{student.reason}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No skipped students.</p>
                      )}
                    </Card>

                    <Card className="p-5 glass-card">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Unallocated Students ({bulkPreview.unallocated_students?.length || 0})</h3>
                      {bulkPreview.unallocated_students?.length > 0 ? (
                        <div className="space-y-3 max-h-72 overflow-auto">
                          {bulkPreview.unallocated_students.map((student) => (
                            <div key={student.student_id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                              <p className="font-medium text-foreground">{student.name}</p>
                              <p className="text-sm text-muted-foreground">{student.branch} • {student.gender}</p>
                              <p className="text-sm text-destructive mt-1">{student.reason}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 p-3 rounded-lg">
                          <CheckCircle className="w-4 h-4" />
                          All students can be allocated
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoomLayout;