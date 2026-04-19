import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Send,
  Search,
  Filter,
  Mail,
  Plus,
  X,
  IndianRupee,
  AlertTriangle,
  Users,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';
import paymentService from '../../services/payment.service';
import hostelService from '../../services/hostel.service';
import toast from 'react-hot-toast';

/**
 * Payment types available when creating a new payment.
 * Maps backend enum values to human-readable labels.
 */
const PAYMENT_TYPES = [
  { value: 'hostel_fee', label: 'Hostel Fee' },
  { value: 'mess_fee', label: 'Mess Fee' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'fine', label: 'Fine' },
  { value: 'other', label: 'Other' },
];

/**
 * Admin Payments Page
 *
 * Student search strategy for payment creation:
 *
 * The backend `student_id` field references the Student collection's
 * MongoDB _id. There is no dedicated "list all students" admin endpoint,
 * so we aggregate from two sources:
 *
 * Source 1 → GET /hostel/eligible-students
 *   Returns: unallocated active hostellers (room_no is null/empty)
 *
 * Source 2 → GET /hostel/layout (for every configured block)
 *   Returns: floors → rooms → students[] (populated, allocated students)
 *   We extract student data from each room's students array.
 *
 * Both lists are merged and deduplicated by _id to produce a
 * complete searchable list of all active hosteller students.
 */
const Payments = () => {
  // ---- List state ----
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filters, setFilters] = useState({ status: '', student_id: '' });

  // ---- Create modal state ----
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // ---- Student picker state ----
  const [studentSearch, setStudentSearch] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ---- Payment form state ----
  const [createForm, setCreateForm] = useState({
    type: 'hostel_fee',
    amount: '',
    description: '',
    due_date: '',
  });

  /**
   * Fetch all payments with current filters and page number.
   * @param {number} page - Page number (1-based)
   */
  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 10, ...filters };
      const response = await paymentService.getAll(params);
      setPayments(response.data.data.data);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  /**
   * Load all students for the payment creation modal.
   *
   * We need ALL active hosteller students — both allocated and unallocated.
   * Since no single endpoint returns all of them, we merge two sources:
   *
   * Step 1: Get all hostel block configs → we know which blocks exist
   * Step 2: Call getLayout() for EACH block → extract populated students
   *         from rooms[].students[] (these are ALLOCATED students)
   * Step 3: Call getEligibleStudents() → get UNALLOCATED students
   * Step 4: Merge + deduplicate by _id → complete list
   *
   * This approach uses existing endpoints with zero backend changes.
   */
  const loadStudentsForModal = async () => {
    try {
      setStudentsLoading(true);

      // Run config fetch + eligible students fetch in parallel
      const [configsRes, eligibleRes] = await Promise.allSettled([
        hostelService.getConfigs(),
        hostelService.getEligibleStudents({ limit: 200 }),
      ]);

      // ---- Source 1: Unallocated students ----
      const eligibleStudents =
        eligibleRes.status === 'fulfilled'
          ? (eligibleRes.value.data.data.students || []).map((s) => ({
              _id: s._id,
              name: s.name,
              email: s.email,
              college_id: s.college_id || '',
              branch: s.branch || '',
              year: s.year,
              hostel_block: null, // Not allocated yet
              room_no: null,
            }))
          : [];

      // ---- Source 2: Allocated students from room layout ----
      // We need to call getLayout() once per block to get all students
      let allocatedStudents = [];

      if (configsRes.status === 'fulfilled') {
        const configs = configsRes.value.data.data.configs || [];

        // Fetch layout for every configured block in parallel
        const layoutResults = await Promise.allSettled(
          configs.map((config) =>
            hostelService.getLayout({ block: config.hostel_block })
          )
        );

        // Extract student data from each block's layout
        layoutResults.forEach((result) => {
          if (result.status !== 'fulfilled') return;

          const floors = result.value.data.data.floors || [];

          floors.forEach((floorGroup) => {
            floorGroup.rooms.forEach((room) => {
              // room.students is populated with full student objects
              // because getRoomLayout uses .populate('students', '...')
              (room.students || []).forEach((student) => {
                allocatedStudents.push({
                  // student._id is the Student collection ObjectId
                  // This is exactly what payment.student_id needs
                  _id: student._id,
                  name: student.name,
                  email: student.email,
                  college_id: student.college_id || '',
                  branch: student.branch || '',
                  year: student.year,
                  // Room info from the room document (more reliable than student fields)
                  hostel_block: room.hostel_block,
                  room_no: room.room_no,
                });
              });
            });
          });
        });
      }

      // ---- Merge + deduplicate by _id string ----
      // Use a Map so later entries don't overwrite earlier ones for same _id.
      // We put allocated students first so their room info takes priority.
      const uniqueMap = new Map();

      [...allocatedStudents, ...eligibleStudents].forEach((student) => {
        const key = student._id?.toString();
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, student);
        }
      });

      // Sort alphabetically by name for easy scanning
      const finalList = Array.from(uniqueMap.values()).sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );

      setAllStudents(finalList);
    } catch (error) {
      console.error('Failed to load students for modal:', error);
      toast.error('Could not load student list. Please try again.');
    } finally {
      setStudentsLoading(false);
    }
  };

  /**
   * Open the create payment modal.
   * Resets all form state and triggers student list fetch.
   */
  const openCreateModal = () => {
    setCreateModalOpen(true);
    setSelectedStudent(null);
    setStudentSearch('');
    setAllStudents([]);
    setCreateForm({
      type: 'hostel_fee',
      amount: '',
      description: '',
      due_date: '',
    });
    // Load students after modal opens
    loadStudentsForModal();
  };

  /**
   * Close the create modal and reset all related state.
   */
  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setSelectedStudent(null);
    setStudentSearch('');
    setAllStudents([]);
  };

  /**
   * Filter the student list based on search query.
   * Searches: name, email, college_id (PRN), branch.
   */
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter((s) =>
      [s.name, s.email, s.college_id, s.branch]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [allStudents, studentSearch]);

  /**
   * Handle payment form field changes.
   */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Submit the new payment creation form.
   *
   * Sends selectedStudent._id (Student collection ObjectId)
   * as student_id — this is what the backend's Student.findById() expects.
   */
  const handleCreatePayment = async (e) => {
    e.preventDefault();

    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }
    if (!createForm.amount || Number(createForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!createForm.due_date) {
      toast.error('Due date is required');
      return;
    }

    try {
      setCreating(true);
      await paymentService.create({
        student_id: selectedStudent._id, // Student._id (ObjectId)
        type: createForm.type,
        amount: Number(createForm.amount),
        description: createForm.description.trim(),
        due_date: createForm.due_date,
      });

      toast.success(`Payment created for ${selectedStudent.name}`);
      closeCreateModal();
      fetchPayments(1);
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to create payment';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => fetchPayments(1);

  /**
   * Send bulk reminders to all students with pending payments.
   */
  const sendBulkReminders = async () => {
    try {
      setSending(true);
      const response = await paymentService.triggerReminders();
      toast.success(`Reminders sent: ${response.data.data.emailsSent} email(s)`);
      fetchPayments(pagination?.currentPage || 1);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to send reminders'
      );
    } finally {
      setSending(false);
    }
  };

  /**
   * Send reminder for a single specific payment.
   * @param {string} paymentId - Payment document _id
   */
  const sendSingleReminder = async (paymentId) => {
    try {
      setSending(true);
      const response = await paymentService.triggerReminders(paymentId);
      toast.success(response.data.message);
      fetchPayments(pagination?.currentPage || 1);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to send reminder'
      );
    } finally {
      setSending(false);
    }
  };

  // ---- Helpers ----
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatType = (type) =>
    type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '-';

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground">
          Payment Management
        </h1>
        <SkeletonTable rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ======== HEADER ======== */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Payment Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage student payments and send reminders
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Create payment button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Payment
          </motion.button>

          {/* Bulk reminder button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={sendBulkReminders}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/25 disabled:opacity-50 transition-all"
          >
            <Mail className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send All Reminders'}
          </motion.button>
        </div>
      </div>

      {/* ======== FILTERS ======== */}
      <Card className="p-4 glass-card">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              name="student_id"
              value={filters.student_id}
              onChange={handleFilterChange}
              placeholder="Filter by Student ID..."
              className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-w-[140px]"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={applyFilters}
            className="px-5 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply
          </motion.button>
        </div>
      </Card>

      {/* ======== PAYMENTS TABLE ======== */}
      {payments.length > 0 ? (
        <Card className="overflow-hidden glass-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">
                    Student
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">
                    Due Date
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">
                    Reminders
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, index) => (
                  <motion.tr
                    key={p._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="border-b border-border/50 last:border-b-0 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {p.student_id?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.student_id?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatType(p.type)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(p.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={p.status}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {p.reminder_count || 0} sent
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'pending' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => sendSingleReminder(p._id)}
                          disabled={sending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 disabled:opacity-50 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Remind
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
            icon={CreditCard}
            title="No payments found"
            description="Adjust filters or create a new payment record."
            action={{ label: 'Create Payment', onClick: openCreateModal }}
          />
        </Card>
      )}

      {/* ======== PAGINATION ======== */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchPayments(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="px-4 py-2 border border-input rounded-lg disabled:opacity-50 hover:bg-secondary transition-colors"
          >
            Previous
          </motion.button>
          <span className="text-sm text-muted-foreground px-4">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchPayments(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="px-4 py-2 border border-input rounded-lg disabled:opacity-50 hover:bg-secondary transition-colors"
          >
            Next
          </motion.button>
        </div>
      )}

      {/* ======== CREATE PAYMENT MODAL ======== */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeCreateModal}
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative glass-card bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Create Payment
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Select a student then fill in the payment details
                  </p>
                </div>
                <button
                  onClick={closeCreateModal}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
                <form onSubmit={handleCreatePayment} className="space-y-6">

                  {/* ---- STEP 1: STUDENT SEARCH ---- */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                        1
                      </span>
                      Select Student *
                    </p>

                    {/* Search input */}
                    <div className="relative mb-3">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search by name, email, PRN, or branch..."
                        className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>

                    {/* Selected student chip */}
                    {selectedStudent && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3 mb-3 bg-primary/5 border-2 border-primary/50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                            {selectedStudent.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {selectedStudent.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {selectedStudent.email}
                              {selectedStudent.college_id &&
                                ` • PRN: ${selectedStudent.college_id}`}
                              {selectedStudent.room_no &&
                                ` • Room ${selectedStudent.hostel_block}-${selectedStudent.room_no}`}
                            </p>
                          </div>
                        </div>
                        {/* Deselect button */}
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(null)}
                          className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </motion.div>
                    )}

                    {/* Student list */}
                    <div className="border border-border rounded-xl overflow-hidden bg-background">
                      {studentsLoading ? (
                        <div className="p-4 space-y-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <SkeletonCard key={i} />
                          ))}
                        </div>
                      ) : filteredStudents.length > 0 ? (
                        <div className="max-h-52 overflow-y-auto divide-y divide-border">
                          {filteredStudents.map((student) => {
                            const isSelected =
                              selectedStudent?._id?.toString() ===
                              student._id?.toString();
                            return (
                              <motion.button
                                key={student._id}
                                type="button"
                                whileHover={{ backgroundColor: 'var(--secondary)' }}
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setStudentSearch('');
                                }}
                                className={`
                                  w-full text-left flex items-center justify-between gap-3
                                  px-4 py-3 transition-colors
                                  ${isSelected ? 'bg-primary/5' : ''}
                                `}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Avatar */}
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                                    {student.name?.charAt(0)?.toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground text-sm truncate">
                                      {student.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {student.email}
                                      {student.college_id &&
                                        ` • ${student.college_id}`}
                                      {student.branch && ` • ${student.branch}`}
                                    </p>
                                  </div>
                                </div>

                                {/* Room status badge */}
                                <div className="shrink-0">
                                  {student.room_no ? (
                                    <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                                      {student.hostel_block}-{student.room_no}
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                                      Unallocated
                                    </span>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p>
                            {allStudents.length === 0
                              ? 'No students found. Make sure hostel blocks are configured.'
                              : 'No students match your search.'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Count indicator */}
                    {!studentsLoading && allStudents.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {allStudents.length} student
                        {allStudents.length !== 1 ? 's' : ''} found
                        {studentSearch && ` • ${filteredStudents.length} matching search`}
                      </p>
                    )}
                  </div>

                  {/* ---- STEP 2: PAYMENT DETAILS ---- */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                        2
                      </span>
                      Payment Details
                    </p>

                    <div className="space-y-4">
                      {/* Type */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Payment Type
                        </label>
                        <select
                          name="type"
                          value={createForm.type}
                          onChange={handleFormChange}
                          required
                          className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        >
                          {PAYMENT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Amount + Due date */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            Amount (₹) *
                          </label>
                          <div className="relative">
                            <IndianRupee className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="number"
                              name="amount"
                              value={createForm.amount}
                              onChange={handleFormChange}
                              placeholder="0"
                              min="1"
                              required
                              className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            Due Date *
                          </label>
                          <input
                            type="date"
                            name="due_date"
                            value={createForm.due_date}
                            onChange={handleFormChange}
                            required
                            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Description{' '}
                          <span className="text-muted-foreground font-normal">
                            (Optional)
                          </span>
                        </label>
                        <textarea
                          name="description"
                          value={createForm.description}
                          onChange={handleFormChange}
                          rows={2}
                          placeholder="e.g. Hostel fee for Jan–Mar 2025"
                          maxLength={200}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                          {createForm.description.length}/200
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      This creates a <strong>pending</strong> payment. The
                      student will see it immediately. Reminders will be sent
                      when triggered manually or by the scheduled cron job.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2 border-t border-border">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={closeCreateModal}
                      className="px-6 py-2.5 text-foreground hover:bg-secondary rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={creating || !selectedStudent}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {creating
                        ? 'Creating...'
                        : selectedStudent
                        ? `Create for ${selectedStudent.name.split(' ')[0]}`
                        : 'Create Payment'}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Payments;