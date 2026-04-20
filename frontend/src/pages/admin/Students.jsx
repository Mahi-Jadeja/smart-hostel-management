import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  BedDouble,
  UserMinus,
  UserPlus,
  X,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
  Building2,
  RefreshCw,
  ArrowLeftRight,
  ShieldAlert,
  Link2,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonCard } from "../../components/ui/Skeleton";
import hostelService from "../../services/hostel.service";
import studentService from "../../services/student.service";
import toast from "react-hot-toast";

/**
 * Tab definitions for the Students page.
 */
const TABS = [
  { id: "all", label: "All Students", icon: Users },
  { id: "unallocated", label: "Unallocated", icon: UserPlus },
  { id: "preferences", label: "Room Preferences", icon: HeartHandshake },
];

/**
 * AdminStudents Page
 *
 * Full student management hub with three tabs:
 *
 * Tab 1 — All Students: Complete list of allocated + unallocated students.
 * Tab 2 — Unallocated: Card grid with quick "Assign Room" per student.
 *          Gender validation: only compatible rooms shown in picker.
 * Tab 3 — Room Preferences: Shows mutual pairs with "Assign Together"
 *          button that places both students in the same room.
 *
 * GENDER FIX:
 *   When assigning a room to a student, the room list is filtered to
 *   only show rooms in blocks that match the student's gender.
 *   e.g. Male student → only male block rooms shown.
 *
 * DATA SOURCES:
 *   Allocated students   → GET /hostel/layout (per block, extract from rooms)
 *   Unallocated students → GET /hostel/eligible-students
 *   Rooms                → GET /hostel/rooms (for allocation picker)
 *   Configs              → GET /hostel/config (for gender mapping)
 *   Preferences          → GET /student/room-preference per student (batched)
 */
const AdminStudents = () => {
  const [activeTab, setActiveTab] = useState("all");

  // ---- Data ----
  const [allStudents, setAllStudents] = useState([]);
  const [unallocatedStudents, setUnallocatedStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [configs, setConfigs] = useState([]);

  // ---- Preference pairs (mutual) ----
  const [mutualPairs, setMutualPairs] = useState([]);
  const [oneWayPreferences, setOneWayPreferences] = useState([]);
  const [preferencesLoading, setPreferencesLoading] = useState(false);

  // ---- UI state ----
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [blockFilter, setBlockFilter] = useState("");

  // ---- Allocate modal ----
  const [allocateModal, setAllocateModal] = useState(null);
  const [roomSearch, setRoomSearch] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [allocating, setAllocating] = useState(false);

  // ---- Pair allocate modal ----
  const [pairAllocateModal, setPairAllocateModal] = useState(null);
  const [pairRoomSearch, setPairRoomSearch] = useState("");
  const [selectedPairRoomId, setSelectedPairRoomId] = useState("");
  const [pairAllocating, setPairAllocating] = useState(false);

  // ---- Deallocate confirmation ----
  const [deallocateModal, setDeallocateModal] = useState(null);
  const [deallocating, setDeallocating] = useState(false);

  /**
   * Build a map from hostel_block → block_gender using configs.
   * Used for gender-based room filtering.
   */
  const blockGenderMap = useMemo(() => {
    const map = {};
    configs.forEach((c) => {
      map[c.hostel_block] = c.block_gender;
    });
    return map;
  }, [configs]);

  /**
   * Load all data needed for the Students page.
   *
   * Strategy:
   * 1. Fetch configs + eligible students + rooms in parallel
   * 2. For each config block, fetch layout to get allocated students
   * 3. Merge + deduplicate all students by _id
   */
  /**
   * Load all data needed for the Students page.
   *
   * IMPORTANT FIX: We now use getLayout() for ALL blocks to extract rooms
   * instead of getRooms(). This ensures both the Students page and RoomLayout
   * page use the exact same data source, keeping them in sync.
   *
   * Strategy:
   * 1. Fetch configs + eligible students in parallel
   * 2. For each config block, fetch layout (this gives us BOTH allocated
   *    students AND accurate room data with correct occupied/status fields)
   * 3. Extract rooms from layout (same data RoomLayout page uses)
   * 4. Extract allocated students from those same layouts
   * 5. Merge allocated + unallocated students, deduplicate by _id
   */
  const loadData = async () => {
    try {
      // Step 1: Fetch configs and eligible (unallocated) students in parallel
      // We no longer call getRooms() here — rooms come from getLayout() below
      const [configsRes, eligibleRes] = await Promise.allSettled([
        hostelService.getConfigs(),
        hostelService.getEligibleStudents({ limit: 500 }),
      ]);

      // ---- Extract configs ----
      const fetchedConfigs =
        configsRes.status === "fulfilled"
          ? configsRes.value.data.data.configs || []
          : [];

      setConfigs(fetchedConfigs);

      // ---- Extract unallocated students (Source 1) ----
      const eligible =
        eligibleRes.status === "fulfilled"
          ? (eligibleRes.value.data.data.students || []).map((s) => ({
              _id: s._id,
              name: s.name,
              email: s.email,
              college_id: s.college_id || "",
              branch: s.branch || "",
              year: s.year,
              gender: s.gender || "",
              phone: s.phone || "",
              hostel_block: null,
              room_no: null,
              floor: null,
              bed_no: null,
              is_allocated: false,
            }))
          : [];

      setUnallocatedStudents(eligible);

      // Step 2: Fetch layout for every configured block in parallel.
      //
      // This single loop gives us TWO things at once:
      //   (a) All allocated students (from room.students[])
      //   (b) All rooms with accurate occupancy/status data
      //
      // Previously we called getRooms() for rooms — that endpoint returns
      // different data than getLayout() causing a mismatch with RoomLayout page.
      // Now BOTH pages use getLayout() so they are always in sync.
      let allocatedStudents = [];
      let allRoomsFromLayout = [];

      if (fetchedConfigs.length > 0) {
        const layoutResults = await Promise.allSettled(
          fetchedConfigs.map((config) =>
            hostelService.getLayout({ block: config.hostel_block }),
          ),
        );

        layoutResults.forEach((result) => {
          if (result.status !== "fulfilled") return;

          const floors = result.value.data.data.floors || [];

          floors.forEach((floorGroup) => {
            floorGroup.rooms.forEach((room) => {
              // ---- (a) Extract room for our rooms state ----
              // This room object has accurate occupied, capacity, status fields
              // because it comes from the same endpoint RoomLayout page uses.
              allRoomsFromLayout.push(room);

              // ---- (b) Extract allocated students from this room ----
              // room.students[] is populated by getLayout's .populate() call
              // so each student has name, email, college_id, branch, year,
              // phone, bed_no fields available.
              (room.students || []).forEach((student) => {
                allocatedStudents.push({
                  _id: student._id,
                  name: student.name,
                  email: student.email,
                  college_id: student.college_id || "",
                  branch: student.branch || "",
                  year: student.year,
                  gender: student.gender || "",
                  phone: student.phone || "",
                  hostel_block: room.hostel_block,
                  room_no: room.room_no,
                  floor: room.floor,
                  bed_no: student.bed_no,
                  is_allocated: true,
                });
              });
            });
          });
        });
      }

      // Step 3: Set rooms from layout data (replaces old getRooms() call)
      // These rooms are guaranteed to match what RoomLayout page shows.
      setRooms(allRoomsFromLayout);

      // Step 4: Merge allocated + unallocated students and deduplicate.
      //
      // Why deduplication is needed:
      // A student could theoretically appear in both lists if there's a
      // data inconsistency (e.g., student has room_no set but also appears
      // in eligible students). We prioritize allocated students (they have
      // more data) by putting them first in the merge.
      const uniqueMap = new Map();

      // Allocated students first (they have room data — higher priority)
      [...allocatedStudents, ...eligible].forEach((s) => {
        const key = s._id?.toString();
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, s);
        }
      });

      // Sort alphabetically by name for easy scanning
      const merged = Array.from(uniqueMap.values()).sort((a, b) =>
        (a.name || "").localeCompare(b.name || ""),
      );

      setAllStudents(merged);
    } catch (error) {
      console.error("Failed to load student data:", error);
      toast.error("Failed to load student data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Load room preferences for all unallocated students.
   *
   * We call GET /student/room-preference for each unallocated student.
   * This endpoint returns { preferred_roommate, is_mutual }.
   *
   * From these responses we build:
   * - mutualPairs: [{studentA, studentB}] where both chose each other
   * - oneWayPreferences: [{student, preferredStudent}] one-way choices
   *
   * NOTE: This is called when the preferences tab is opened to avoid
   * making too many API calls on initial load.
   */
  const loadPreferences = async () => {
    if (unallocatedStudents.length === 0) return;

    try {
      setPreferencesLoading(true);

      // We need to get preferences for ALL students (allocated + unallocated)
      // since a student could have a preference even if already allocated
      // For now, focus on unallocated students as they need allocation
      const preferenceResults = await Promise.allSettled(
        unallocatedStudents.map(async (student) => {
          try {
            // Unfortunately getRoomPreference requires student auth context
            // We can only get this from the student's own token.
            // Since admin doesn't have a specific "get student preference" endpoint,
            // we use the roommate search which includes has_selected_you field.
            return { student, preference: null };
          } catch {
            return { student, preference: null };
          }
        }),
      );

      // Since we don't have a dedicated admin endpoint for preferences,
      // we use a different approach:
      // We search roommates for each student and look for mutual selections
      // by checking the has_selected_you field.
      //
      // Better approach: We call eligible students with their preference data.
      // The eligible students endpoint doesn't return preferences, but
      // searchRoommateOptions does (with has_selected_you).
      //
      // For the admin view, we'll build pairs from what we know:
      // We call getEligibleStudents and check cross-references.
      // This requires multiple calls, so we limit to showing
      // unallocated students grouped and let admin identify pairs.

      // For now build a visual representation based on available data
      // In a production app, you'd want a backend endpoint:
      // GET /admin/room-preferences → returns all student preferences
      setMutualPairs([]);
      setOneWayPreferences([]);
    } catch (error) {
      console.error("Failed to load preferences:", error);
    } finally {
      setPreferencesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "preferences") {
      loadPreferences();
    }
  }, [activeTab, unallocatedStudents]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ---- Filtered students ----
  const filteredAllStudents = useMemo(() => {
    let list = allStudents;
    if (blockFilter) list = list.filter((s) => s.hostel_block === blockFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        [s.name, s.email, s.college_id, s.branch, s.room_no]
          .filter(Boolean)
          .some((f) => f.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [allStudents, search, blockFilter]);

  const filteredUnallocated = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return unallocatedStudents;
    return unallocatedStudents.filter((s) =>
      [s.name, s.email, s.college_id, s.branch]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q)),
    );
  }, [unallocatedStudents, search]);

  /**
   * Get rooms compatible with a student's gender.
   * Filters by:
   * 1. Block gender must match student gender (or block has no gender set)
   * 2. Room must have available beds
   * 3. Room must not be under maintenance
   *
   * This is the CORE gender validation fix.
   */
  const getCompatibleRooms = (studentGender) => {
    return rooms.filter((room) => {
      const blockGender = blockGenderMap[room.hostel_block];
      const genderCompatible = !blockGender || blockGender === studentGender;
      const hasSpace = room.occupied < room.capacity;
      const notMaintenance = room.status !== "maintenance";
      return genderCompatible && hasSpace && notMaintenance;
    });
  };

  /**
   * Get rooms compatible for a PAIR of students.
   * For a pair to be assigned together, the room must have:
   * 1. At least 2 available beds
   * 2. Gender compatibility with the pair's gender
   * 3. Not under maintenance
   */
  const getCompatibleRoomsForPair = (pairGender) => {
    return rooms.filter((room) => {
      const blockGender = blockGenderMap[room.hostel_block];
      const genderCompatible = !blockGender || blockGender === pairGender;
      const hasEnoughSpace = room.capacity - room.occupied >= 2; // Need at least 2 beds
      const notMaintenance = room.status !== "maintenance";
      return genderCompatible && hasEnoughSpace && notMaintenance;
    });
  };

  /**
   * Filter rooms for the allocate modal's search.
   */
  const filteredRooms = useMemo(() => {
    if (!allocateModal) return [];
    const compatible = getCompatibleRooms(allocateModal.gender);
    const q = roomSearch.trim().toLowerCase();
    if (!q) return compatible;
    return compatible.filter(
      (r) =>
        `${r.hostel_block}${r.room_no}`.toLowerCase().includes(q) ||
        `block ${r.hostel_block}`.toLowerCase().includes(q),
    );
  }, [rooms, allocateModal, roomSearch, blockGenderMap]);

  /**
   * Filter rooms for pair allocation modal.
   */
  const filteredPairRooms = useMemo(() => {
    if (!pairAllocateModal) return [];
    const compatible = getCompatibleRoomsForPair(
      pairAllocateModal.studentA.gender,
    );
    const q = pairRoomSearch.trim().toLowerCase();
    if (!q) return compatible;
    return compatible.filter(
      (r) =>
        `${r.hostel_block}${r.room_no}`.toLowerCase().includes(q) ||
        `block ${r.hostel_block}`.toLowerCase().includes(q),
    );
  }, [rooms, pairAllocateModal, pairRoomSearch, blockGenderMap]);

  const openAllocateModal = (student) => {
    setAllocateModal(student);
    setRoomSearch("");
    setSelectedRoomId("");
  };

  const openPairAllocateModal = (studentA, studentB) => {
    setPairAllocateModal({ studentA, studentB });
    setPairRoomSearch("");
    setSelectedPairRoomId("");
  };

  /**
   * Allocate a single student to selected room.
   */
  const handleAllocate = async () => {
    if (!allocateModal || !selectedRoomId) {
      toast.error("Please select a room");
      return;
    }

    try {
      setAllocating(true);
      await hostelService.allocateStudent({
        student_id: allocateModal._id,
        room_id: selectedRoomId,
      });
      toast.success(`${allocateModal.name} allocated successfully`);
      setAllocateModal(null);
      setLoading(true);
      loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to allocate student",
      );
    } finally {
      setAllocating(false);
    }
  };

  /**
   * Allocate BOTH students in a mutual pair to the same room.
   * Makes two sequential API calls — first student A, then student B.
   * If student A succeeds but B fails, student A is still allocated.
   * The room capacity check in the backend prevents over-allocation.
   */
  const handlePairAllocate = async () => {
    if (!pairAllocateModal || !selectedPairRoomId) {
      toast.error("Please select a room");
      return;
    }

    const { studentA, studentB } = pairAllocateModal;

    try {
      setPairAllocating(true);

      // Allocate student A first
      await hostelService.allocateStudent({
        student_id: studentA._id,
        room_id: selectedPairRoomId,
      });

      // Then allocate student B to the same room
      await hostelService.allocateStudent({
        student_id: studentB._id,
        room_id: selectedPairRoomId,
      });

      toast.success(
        `✓ ${studentA.name} and ${studentB.name} allocated to the same room!`,
      );
      setPairAllocateModal(null);
      setLoading(true);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to allocate pair");
    } finally {
      setPairAllocating(false);
    }
  };

  const handleDeallocate = async () => {
    if (!deallocateModal) return;
    try {
      setDeallocating(true);
      await hostelService.deallocateStudent(deallocateModal._id);
      toast.success(`${deallocateModal.name} deallocated successfully`);
      setDeallocateModal(null);
      setLoading(true);
      loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to deallocate student",
      );
    } finally {
      setDeallocating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground">Students</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ======== HEADER ======== */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">
            {allStudents.length} total •{" "}
            <span className="text-emerald-600 font-medium">
              {allStudents.filter((s) => s.is_allocated).length} allocated
            </span>{" "}
            •{" "}
            <span className="text-amber-600 font-medium">
              {unallocatedStudents.length} unallocated
            </span>
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all font-medium"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </motion.button>
      </div>

      {/* ======== QUICK STATS ======== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Students",
            value: allStudents.length,
            color: "bg-blue-500/10 border-blue-500/20",
            text: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Allocated",
            value: allStudents.filter((s) => s.is_allocated).length,
            color: "bg-emerald-500/10 border-emerald-500/20",
            text: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Unallocated",
            value: unallocatedStudents.length,
            color: "bg-amber-500/10 border-amber-500/20",
            text: "text-amber-600 dark:text-amber-400",
          },
          {
            label: "Available Beds",
            value: rooms.reduce(
              (sum, r) =>
                r.status !== "maintenance"
                  ? sum + (r.capacity - r.occupied)
                  : sum,
              0,
            ),
            color: "bg-violet-500/10 border-violet-500/20",
            text: "text-violet-600 dark:text-violet-400",
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`glass-card rounded-xl border p-5 ${stat.color}`}
          >
            <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.text}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ======== TABS ======== */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch("");
              }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "unallocated" && unallocatedStudents.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                  {unallocatedStudents.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ======== SEARCH + FILTER BAR ======== */}
      {activeTab !== "preferences" && (
        <Card className="p-4 glass-card">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, PRN, branch..."
                className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            {activeTab === "all" && configs.length > 0 && (
              <select
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                className="px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-w-[160px]"
              >
                <option value="">All Blocks</option>
                {configs.map((c) => (
                  <option key={c._id} value={c.hostel_block}>
                    Block {c.hostel_block} ({c.block_gender})
                  </option>
                ))}
              </select>
            )}
          </div>
        </Card>
      )}

      {/* ======== TAB: ALL STUDENTS ======== */}
      {activeTab === "all" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {filteredAllStudents.length > 0 ? (
              <Card className="overflow-hidden glass-card">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-secondary/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">
                          Student
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">
                          Academic
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">
                          Room
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">
                          Status
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllStudents.map((student, index) => (
                        <motion.tr
                          key={student._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-border/50 last:border-b-0 hover:bg-secondary/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                {student.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {student.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {student.email}
                                </p>
                                {student.college_id && (
                                  <p className="text-xs text-muted-foreground">
                                    PRN: {student.college_id}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <p className="text-sm">
                              {student.branch || "No branch"}
                            </p>
                            {student.year && (
                              <p className="text-xs">Year {student.year}</p>
                            )}
                            {student.gender && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full capitalize ${student.gender === "male" ? "bg-blue-500/10 text-blue-600" : "bg-pink-500/10 text-pink-600"}`}
                              >
                                {student.gender}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {student.is_allocated ? (
                              <div>
                                <p className="font-medium text-foreground">
                                  Block {student.hostel_block} — Room{" "}
                                  {student.room_no}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Floor {student.floor} • Bed {student.bed_no}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-amber-600 bg-amber-500/10 px-2 py-1 rounded-full">
                                Not allocated
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {student.is_allocated ? (
                              <Badge status="success">Allocated</Badge>
                            ) : (
                              <Badge status="warning">Unallocated</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {student.is_allocated ? (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDeallocateModal(student)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                              >
                                <UserMinus className="w-3.5 h-3.5" /> Deallocate
                              </motion.button>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => openAllocateModal(student)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                              >
                                <UserPlus className="w-3.5 h-3.5" /> Assign Room
                              </motion.button>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card className="p-12 glass-card">
                <EmptyState
                  icon={Users}
                  title="No students found"
                  description={
                    search
                      ? "No students match your search."
                      : "No active hosteller students yet."
                  }
                />
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ======== TAB: UNALLOCATED ======== */}
      {activeTab === "unallocated" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="unallocated"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {unallocatedStudents.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {unallocatedStudents.length} student
                    {unallocatedStudents.length !== 1 ? "s" : ""} need room
                    allocation
                  </p>
                  <p className="text-sm text-amber-600/80 dark:text-amber-500/80 mt-0.5">
                    Room assignment automatically filters by the student's
                    gender. Only compatible rooms are shown.
                  </p>
                </div>
              </div>
            )}

            {filteredUnallocated.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredUnallocated.map((student, index) => (
                  <motion.div
                    key={student._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="glass-card rounded-xl border border-amber-500/20 p-5"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                        {student.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      {student.gender && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Gender</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${student.gender === "male" ? "bg-blue-500/10 text-blue-600" : "bg-pink-500/10 text-pink-600"}`}
                          >
                            {student.gender}
                          </span>
                        </div>
                      )}
                      {student.college_id && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">PRN</span>
                          <span className="text-foreground font-medium">
                            {student.college_id}
                          </span>
                        </div>
                      )}
                      {student.branch && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Branch</span>
                          <span className="text-foreground font-medium text-right text-xs max-w-[140px] truncate">
                            {student.branch}
                          </span>
                        </div>
                      )}
                      {student.year && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Year</span>
                          <span className="text-foreground font-medium">
                            Year {student.year}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Show compatible rooms count as a hint */}
                    <p className="text-xs text-muted-foreground mb-3">
                      {getCompatibleRooms(student.gender).length} compatible
                      rooms available
                    </p>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openAllocateModal(student)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      Assign{" "}
                      {student.gender === "male"
                        ? "♂"
                        : student.gender === "female"
                          ? "♀"
                          : ""}{" "}
                      Room
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="p-12 glass-card">
                <EmptyState
                  icon={CheckCircle2}
                  title={
                    search
                      ? "No students match your search"
                      : "All students are allocated!"
                  }
                  description={
                    search
                      ? "Try a different search term."
                      : "Every active hosteller has been assigned a room."
                  }
                />
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ======== TAB: ROOM PREFERENCES ======== */}
      {activeTab === "preferences" && (
        <AnimatePresence mode="wait">
          <motion.div
            key="preferences"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Info about how preferences work */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <HeartHandshake className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-700 dark:text-blue-400">
                  Room Preference Pairs
                </p>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                  When two students mutually select each other as preferred
                  roommates, they form a pair. Use{" "}
                  <strong>"Assign Together"</strong> to place both in the same
                  room. Or use{" "}
                  <strong>Bulk Allocation → Preference mode</strong> to honor
                  all mutual pairs automatically.
                </p>
              </div>
            </div>

            {/* Mutual pair allocation explanation */}
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-primary" />
                Preference-Based Allocation Workflow
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    step: "1",
                    title: "Students Submit Preferences",
                    desc: "Students go to their Profile → Room Preference page and select a preferred roommate by searching for their name or PRN.",
                    color:
                      "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400",
                  },
                  {
                    step: "2",
                    title: "Mutual Pairs Form",
                    desc: "When Student A selects Student B AND Student B selects Student A, a mutual pair is created and shown here.",
                    color:
                      "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
                  },
                  {
                    step: "3",
                    title: "Assign Together or Bulk",
                    desc: 'Click "Assign Together" on a mutual pair to manually place them in the same room, or use Bulk Allocation with Preference mode.',
                    color:
                      "bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-400",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className={`p-4 rounded-xl border ${item.color}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm border ${item.color}`}
                      >
                        {item.step}
                      </span>
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                    </div>
                    <p className="text-xs opacity-80">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* 
              Mutual Pairs Section
              
              IMPORTANT NOTE: We cannot directly access all students' room preferences
              from the admin side because the backend's getRoomPreference endpoint
              requires student auth context (it finds the student from req.user.id).
              
              There is no GET /admin/room-preferences endpoint in the backend.
              
              SOLUTION: We show the unallocated students and allow admin to:
              1. See who is waiting for allocation
              2. Manually assign pairs by selecting 2 students + assigning them together
              3. Use Bulk Allocation with Preference mode for automatic handling
              
              For a production system, you'd add:
              GET /api/v1/admin/room-preferences → returns all student preference pairs
            */}

            {/* Manual Pair Assignment */}
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Manual Pair Assignment
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select any two unallocated students to assign them to the same
                room. The room picker will only show rooms with 2+ available
                beds that match their gender.
              </p>

              {unallocatedStudents.length >= 2 ? (
                <ManualPairSelector
                  students={unallocatedStudents}
                  configs={configs}
                  blockGenderMap={blockGenderMap}
                  rooms={rooms}
                  getCompatibleRoomsForPair={getCompatibleRoomsForPair}
                  onAssignTogether={openPairAllocateModal}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Not enough unallocated students</p>
                  <p className="text-sm mt-1">
                    Need at least 2 unallocated students to form a pair.
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ======== ALLOCATE ROOM MODAL (SINGLE STUDENT, GENDER FILTERED) ======== */}
      <AnimatePresence>
        {allocateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setAllocateModal(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative glass-card bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Assign Room
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Selecting a room for{" "}
                    <span className="font-semibold text-foreground">
                      {allocateModal.name}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setAllocateModal(null)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Student chip */}
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl border border-border">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                    {allocateModal.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {allocateModal.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {allocateModal.email}
                      {allocateModal.branch && ` • ${allocateModal.branch}`}
                    </p>
                  </div>
                  {/* Gender badge */}
                  {allocateModal.gender && (
                    <span
                      className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium capitalize shrink-0 ${allocateModal.gender === "male" ? "bg-blue-500/10 text-blue-600" : "bg-pink-500/10 text-pink-600"}`}
                    >
                      {allocateModal.gender === "male" ? "♂ Male" : "♀ Female"}
                    </span>
                  )}
                </div>

                {/* Gender filter banner */}
                {allocateModal.gender && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-xl text-sm ${allocateModal.gender === "male" ? "bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400" : "bg-pink-500/10 border border-pink-500/20 text-pink-700 dark:text-pink-400"}`}
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    Only{" "}
                    <strong className="mx-1">
                      {allocateModal.gender}
                    </strong>{" "}
                    blocks are shown. Gender-based filtering is enforced to
                    prevent cross-gender allocation.
                  </div>
                )}

                {/* Room search */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Search Available Rooms
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={roomSearch}
                      onChange={(e) => setRoomSearch(e.target.value)}
                      placeholder="e.g. Block A, 101..."
                      className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Room list */}
                <div className="border border-border rounded-xl overflow-hidden">
                  {filteredRooms.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto divide-y divide-border">
                      {filteredRooms.map((room) => {
                        const isSelected = selectedRoomId === room._id;
                        const available = room.capacity - room.occupied;
                        const roomBlockGender =
                          blockGenderMap[room.hostel_block];
                        return (
                          <motion.button
                            key={room._id}
                            type="button"
                            onClick={() => setSelectedRoomId(room._id)}
                            className={`w-full text-left flex items-center justify-between px-4 py-3 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-secondary/50"}`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  Block {room.hostel_block} — Room{" "}
                                  {room.room_no}
                                </span>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded-full ${roomBlockGender === "male" ? "bg-blue-500/10 text-blue-600" : "bg-pink-500/10 text-pink-600"}`}
                                >
                                  {roomBlockGender === "male" ? "♂" : "♀"}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Floor {room.floor} • {room.occupied}/
                                {room.capacity} occupied • {available} bed
                                {available !== 1 ? "s" : ""} free
                              </p>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-border"}`}
                            >
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      <BedDouble className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-medium">
                        No compatible rooms available
                      </p>
                      <p className="text-xs mt-1">
                        No {allocateModal.gender} block rooms with available
                        beds found.
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {filteredRooms.length} compatible room
                  {filteredRooms.length !== 1 ? "s" : ""} found for{" "}
                  {allocateModal.gender} students
                </p>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-border">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAllocateModal(null)}
                    className="px-6 py-2.5 text-foreground hover:bg-secondary rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAllocate}
                    disabled={!selectedRoomId || allocating}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {allocating ? "Assigning..." : "Assign Room"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======== PAIR ALLOCATE MODAL (2 STUDENTS → SAME ROOM) ======== */}
      <AnimatePresence>
        {pairAllocateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setPairAllocateModal(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative glass-card bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Assign Together
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Place both students in the same room
                  </p>
                </div>
                <button
                  onClick={() => setPairAllocateModal(null)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Pair display */}
                <div className="flex items-center gap-3">
                  {[pairAllocateModal.studentA, pairAllocateModal.studentB].map(
                    (student, i) => (
                      <div key={student._id} className="flex-1">
                        <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl border border-border">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {student.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {student.name}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {student.gender}
                            </p>
                          </div>
                        </div>
                        {i === 0 && (
                          <div className="flex items-center justify-center my-2">
                            <HeartHandshake className="w-5 h-5 text-rose-500" />
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>

                {/* Gender check */}
                {pairAllocateModal.studentA.gender !==
                  pairAllocateModal.studentB.gender && (
                  <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">
                      Warning: These students have different genders. They
                      cannot be placed in the same gender-specific block.
                    </p>
                  </div>
                )}

                {/* Room search for pair */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Select Room (needs 2+ free beds)
                  </label>
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pairRoomSearch}
                      onChange={(e) => setPairRoomSearch(e.target.value)}
                      placeholder="e.g. Block A, 101..."
                      className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden">
                    {filteredPairRooms.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto divide-y divide-border">
                        {filteredPairRooms.map((room) => {
                          const isSelected = selectedPairRoomId === room._id;
                          const available = room.capacity - room.occupied;
                          return (
                            <motion.button
                              key={room._id}
                              type="button"
                              onClick={() => setSelectedPairRoomId(room._id)}
                              className={`w-full text-left flex items-center justify-between px-4 py-3 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-secondary/50"}`}
                            >
                              <div>
                                <p className="font-semibold text-foreground">
                                  Block {room.hostel_block} — Room{" "}
                                  {room.room_no}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Floor {room.floor} • {available} beds
                                  available
                                </p>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-border"}`}
                              >
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        <BedDouble className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>
                          No rooms with 2+ available beds found for this gender.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-border">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPairAllocateModal(null)}
                    className="px-6 py-2.5 text-foreground hover:bg-secondary rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePairAllocate}
                    disabled={
                      !selectedPairRoomId ||
                      pairAllocating ||
                      pairAllocateModal.studentA.gender !==
                        pairAllocateModal.studentB.gender
                    }
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    <HeartHandshake className="w-4 h-4" />
                    {pairAllocating ? "Assigning..." : "Assign Together"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======== DEALLOCATE CONFIRMATION ======== */}
      <AnimatePresence>
        {deallocateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeallocateModal(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative glass-card bg-card w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl border border-border"
            >
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserMinus className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Deallocate Student?
              </h3>
              <p className="text-muted-foreground text-sm mb-1">
                <span className="font-semibold text-foreground">
                  {deallocateModal.name}
                </span>{" "}
                will be removed from
              </p>
              <p className="text-sm font-medium text-foreground mb-6">
                Block {deallocateModal.hostel_block} — Room{" "}
                {deallocateModal.room_no}
              </p>
              <div className="flex justify-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeallocateModal(null)}
                  className="px-6 py-2.5 text-foreground hover:bg-secondary rounded-lg font-medium transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeallocate}
                  disabled={deallocating}
                  className="px-6 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-medium disabled:opacity-50 transition-all"
                >
                  {deallocating ? "Removing..." : "Deallocate"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * ManualPairSelector
 *
 * Sub-component inside the Preferences tab.
 * Lets admin select 2 unallocated students from a searchable list
 * and then click "Assign Together" to place them in the same room.
 *
 * The pair selection enforces same-gender (can't pair male + female).
 */
const ManualPairSelector = ({
  students,
  configs,
  blockGenderMap,
  rooms,
  getCompatibleRoomsForPair,
  onAssignTogether,
}) => {
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [pairSearch, setPairSearch] = useState("");

  const filteredForPair = useMemo(() => {
    const q = pairSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.name, s.email, s.college_id, s.branch]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q)),
    );
  }, [students, pairSearch]);

  const handleSelect = (student) => {
    if (selectedA?._id === student._id) {
      setSelectedA(null);
      return;
    }
    if (selectedB?._id === student._id) {
      setSelectedB(null);
      return;
    }
    if (!selectedA) {
      setSelectedA(student);
    } else if (!selectedB) {
      // Gender check
      if (student.gender !== selectedA.gender) {
        toast.error(
          `Cannot pair ${selectedA.gender} and ${student.gender} students`,
        );
        return;
      }
      setSelectedB(student);
    } else {
      // Replace A (circular selection)
      setSelectedA(selectedB);
      setSelectedB(student);
    }
  };

  const compatibleRooms = selectedA
    ? getCompatibleRoomsForPair(selectedA.gender)
    : [];

  return (
    <div className="space-y-4">
      {/* Selected pair display */}
      {(selectedA || selectedB) && (
        <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-xl border border-border">
          <div className="flex-1 text-center">
            {selectedA ? (
              <div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold mx-auto mb-1">
                  {selectedA.name?.charAt(0)?.toUpperCase()}
                </div>
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedA.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {selectedA.gender}
                </p>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-border mx-auto" />
            )}
          </div>

          <HeartHandshake
            className={`w-6 h-6 shrink-0 ${selectedA && selectedB ? "text-rose-500" : "text-muted-foreground"}`}
          />

          <div className="flex-1 text-center">
            {selectedB ? (
              <div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold mx-auto mb-1">
                  {selectedB.name?.charAt(0)?.toUpperCase()}
                </div>
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedB.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {selectedB.gender}
                </p>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-border mx-auto" />
            )}
          </div>

          <div className="shrink-0">
            {selectedA && selectedB ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAssignTogether(selectedA, selectedB)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 transition-all"
              >
                <HeartHandshake className="w-4 h-4" />
                Assign Together
                <span className="text-xs opacity-80">
                  ({compatibleRooms.length} rooms)
                </span>
              </motion.button>
            ) : (
              <p className="text-xs text-muted-foreground">Select 2 students</p>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={pairSearch}
          onChange={(e) => setPairSearch(e.target.value)}
          placeholder="Search students to pair..."
          className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      {/* Student selection grid */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {filteredForPair.map((student) => {
          const isA = selectedA?._id === student._id;
          const isB = selectedB?._id === student._id;
          const isSelected = isA || isB;
          const isGenderMismatch =
            selectedA && !isA && student.gender !== selectedA.gender;

          return (
            <motion.button
              key={student._id}
              onClick={() => handleSelect(student)}
              disabled={isGenderMismatch}
              className={`
                w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl border-2 transition-all
                ${isA ? "border-blue-500 bg-blue-500/5" : ""}
                ${isB ? "border-emerald-500 bg-emerald-500/5" : ""}
                ${!isSelected && !isGenderMismatch ? "border-border hover:border-primary/30 hover:bg-secondary/50" : ""}
                ${isGenderMismatch ? "opacity-30 cursor-not-allowed border-border" : ""}
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${isA ? "bg-gradient-to-br from-blue-500 to-purple-600" : isB ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-slate-400 to-slate-600"}`}
                >
                  {student.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {student.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {student.email}
                    {student.college_id && ` • ${student.college_id}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full capitalize ${student.gender === "male" ? "bg-blue-500/10 text-blue-600" : "bg-pink-500/10 text-pink-600"}`}
                >
                  {student.gender || "?"}
                </span>
                {isA && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                    A
                  </span>
                )}
                {isB && (
                  <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                    B
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Click to select Student A, then Student B. Only same-gender pairs
        allowed.
      </p>
    </div>
  );
};

export default AdminStudents;
