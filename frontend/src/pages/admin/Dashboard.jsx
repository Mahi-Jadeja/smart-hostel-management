import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  BedDouble,
  ClipboardList,
  FileText,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import hostelService from '../../services/hostel.service';
import complaintsService from '../../services/complaint.service';
import paymentService from '../../services/payment.service';
import outpassService from '../../services/outpass.service';
import toast from 'react-hot-toast';

/**
 * Pie chart colors for room occupancy by status
 */
const PIE_COLORS = {
  empty: '#10b981',
  partial: '#f59e0b',
  full: '#ef4444',
  maintenance: '#94a3b8',
};

/**
 * Container animation: staggers child elements in
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

/**
 * Individual card animation: slides up and fades in
 */
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * AdminDashboard
 * 
 * Aggregates data from multiple endpoints since there is no dedicated
 * admin dashboard stats endpoint. Calls are made in parallel with
 * Promise.allSettled so a single failed endpoint doesn't crash the page.
 * 
 * Data sources:
 *  - hostelService.getLayout()         → room stats
 *  - complaintsService.getAll()        → complaint stats + recent list
 *  - paymentService.getAll()           → payment stats + recent list
 *  - outpassService.getAll()           → outpass stats + pending list
 */
const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ---- Aggregated stat values ----
  const [roomStats, setRoomStats] = useState({
    totalRooms: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    totalBeds: 0,
  });

  const [complaintStats, setComplaintStats] = useState({
    pending: 0,
    in_progress: 0,
    resolved: 0,
    total: 0,
  });

  const [paymentStats, setPaymentStats] = useState({
    totalPendingAmount: 0,
    pendingCount: 0,
    paidCount: 0,
  });

  const [outpassStats, setOutpassStats] = useState({
    pending: 0,
    approved: 0,
    total: 0,
  });

  // ---- Chart data ----
  const [complaintChartData, setComplaintChartData] = useState([]);
  const [roomPieData, setRoomPieData] = useState([]);

  // ---- Recent activity tables ----
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [pendingOutpasses, setPendingOutpasses] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);

  /**
   * Fetch all dashboard data in parallel.
   * Promise.allSettled ensures one failure doesn't block others.
   */
  const fetchDashboardData = async () => {
    try {
      const [layoutRes, complaintsRes, paymentsRes, outpassRes] =
        await Promise.allSettled([
          hostelService.getLayout(),
          complaintsService.getAll({ limit: 100 }),
          paymentService.getAll({ limit: 100 }),
          outpassService.getAll({ limit: 100 }),
        ]);

      // ---- Process room layout data ----
      if (layoutRes.status === 'fulfilled') {
        const stats = layoutRes.value.data.data.stats || {};
        setRoomStats({
          totalRooms: stats.totalRooms || 0,
          occupiedBeds: stats.occupiedBeds || 0,
          availableBeds: stats.availableBeds || 0,
          totalBeds: stats.totalBeds || 0,
        });

        // Build pie chart data from room status counts
        setRoomPieData([
          { name: 'Empty', value: stats.emptyRooms || 0, key: 'empty' },
          { name: 'Partial', value: stats.partialRooms || 0, key: 'partial' },
          { name: 'Full', value: stats.fullRooms || 0, key: 'full' },
          { name: 'Maintenance', value: stats.maintenanceRooms || 0, key: 'maintenance' },
        ].filter((d) => d.value > 0)); // Remove zero-value slices
      }

      // ---- Process complaints data ----
      if (complaintsRes.status === 'fulfilled') {
        const complaints = complaintsRes.value.data.data.data || [];

        // Count by status
        const pending = complaints.filter((c) => c.status === 'pending').length;
        const inProgress = complaints.filter((c) => c.status === 'in_progress').length;
        const resolved = complaints.filter((c) => c.status === 'resolved').length;

        setComplaintStats({
          pending,
          in_progress: inProgress,
          resolved,
          total: complaints.length,
        });

        // Build bar chart: complaints grouped by category
        const categoryMap = {};
        complaints.forEach((c) => {
          const label = c.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
          categoryMap[label] = (categoryMap[label] || 0) + 1;
        });
        setComplaintChartData(
          Object.entries(categoryMap)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count) // Most frequent first
            .slice(0, 8) // Max 8 bars
        );

        // Recent 5 complaints (pending or in_progress first)
        setRecentComplaints(
          [...complaints]
            .sort((a, b) => {
              // Prioritize pending > in_progress > resolved
              const priority = { pending: 0, in_progress: 1, resolved: 2 };
              return (priority[a.status] ?? 3) - (priority[b.status] ?? 3);
            })
            .slice(0, 5)
        );
      }

      // ---- Process payments data ----
      if (paymentsRes.status === 'fulfilled') {
        const payments = paymentsRes.value.data.data.data || [];

        const pendingPayments = payments.filter((p) => p.status === 'pending');
        const paidPayments = payments.filter((p) => p.status === 'paid');
        const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

        setPaymentStats({
          totalPendingAmount,
          pendingCount: pendingPayments.length,
          paidCount: paidPayments.length,
        });

        // Recent 5 payments
        setRecentPayments(
          [...payments]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
        );
      }

      // ---- Process outpass data ----
      if (outpassRes.status === 'fulfilled') {
        const outpasses = outpassRes.value.data.data.data || [];

        const pending = outpasses.filter((o) => o.status === 'pending').length;
        const approved = outpasses.filter((o) => o.status === 'approved').length;

        setOutpassStats({ pending, approved, total: outpasses.length });

        // Show only pending outpasses in the table
        setPendingOutpasses(
          outpasses
            .filter((o) => o.status === 'pending')
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast.error('Some dashboard data could not be loaded');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  /**
   * Manual refresh handler with visual feedback
   */
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // ---- Helper formatters ----
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatType = (type) =>
    type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '-';

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        </div>
        {/* Skeleton stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* ======== PAGE HEADER ======== */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of all hostel operations
          </p>
        </div>

        {/* Manual refresh button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </motion.button>
      </motion.div>

      {/* ======== STAT CARDS ROW 1 — ROOMS ======== */}
      <motion.div variants={itemVariants}>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Room Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Total Rooms"
            value={roomStats.totalRooms}
            color="indigo"
            subtext="Across all blocks"
          />
          <StatCard
            icon={BedDouble}
            label="Total Beds"
            value={roomStats.totalBeds}
            color="blue"
            subtext="Bed capacity"
          />
          <StatCard
            icon={Users}
            label="Occupied Beds"
            value={roomStats.occupiedBeds}
            color="amber"
            subtext={`${roomStats.totalBeds > 0 ? Math.round((roomStats.occupiedBeds / roomStats.totalBeds) * 100) : 0}% occupancy`}
          />
          <StatCard
            icon={BedDouble}
            label="Available Beds"
            value={roomStats.availableBeds}
            color="emerald"
            subtext="Ready to allocate"
          />
        </div>
      </motion.div>

      {/* ======== STAT CARDS ROW 2 — OPERATIONS ======== */}
      <motion.div variants={itemVariants}>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Operations Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={ClipboardList}
            label="Pending Complaints"
            value={complaintStats.pending}
            color="rose"
            subtext={`${complaintStats.in_progress} in progress`}
          />
          <StatCard
            icon={CheckCircle}
            label="Resolved Complaints"
            value={complaintStats.resolved}
            color="emerald"
            subtext={`of ${complaintStats.total} total`}
          />
          <StatCard
            icon={FileText}
            label="Pending Outpasses"
            value={outpassStats.pending}
            color="amber"
            subtext={`${outpassStats.approved} approved`}
          />
          <StatCard
            icon={CreditCard}
            label="Pending Payments"
            value={`₹${paymentStats.totalPendingAmount.toLocaleString()}`}
            color="violet"
            subtext={`${paymentStats.pendingCount} outstanding`}
            animated={false}
          />
        </div>
      </motion.div>

      {/* ======== CHARTS ROW ======== */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        {/* Bar chart: Complaints by category */}
        <Card className="glass-card p-6 xl:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Complaints by Category
          </h3>
          {complaintChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={complaintChartData}
                margin={{ top: 0, right: 10, left: -20, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    color: 'var(--foreground)',
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground">
              No complaint data yet
            </div>
          )}
        </Card>

        {/* Pie chart: Room occupancy */}
        <Card className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Room Status
          </h3>
          {roomPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={roomPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {roomPieData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={PIE_COLORS[entry.key] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    color: 'var(--foreground)',
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '12px',
                    color: 'var(--muted-foreground)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground">
              No room data yet
            </div>
          )}
        </Card>
      </motion.div>

      {/* ======== RECENT ACTIVITY TABLES ======== */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        {/* Recent Complaints Table */}
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Recent Complaints
            </h3>
            <a
              href="/admin/complaints"
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              View all →
            </a>
          </div>

          {recentComplaints.length > 0 ? (
            <div className="space-y-3">
              {recentComplaints.map((c) => (
                <div
                  key={c._id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {c.student_id?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {c.category.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <Badge status={c.status} className="shrink-0">
                    {c.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No complaints yet
            </p>
          )}
        </Card>

        {/* Pending Outpasses Table */}
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Pending Outpasses
            </h3>
            <a
              href="/admin/outpass"
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              View all →
            </a>
          </div>

          {pendingOutpasses.length > 0 ? (
            <div className="space-y-3">
              {pendingOutpasses.map((o) => (
                <div
                  key={o._id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {o.student_id?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(o.from_date)} → {formatDate(o.to_date)}
                    </p>
                  </div>
                  <Badge status="warning" className="shrink-0">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending outpasses
            </p>
          )}
        </Card>

        {/* Recent Payments Table */}
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Recent Payments
            </h3>
            <a
              href="/admin/payments"
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              View all →
            </a>
          </div>

          {recentPayments.length > 0 ? (
            <div className="space-y-3">
              {recentPayments.map((p) => (
                <div
                  key={p._id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.student_id?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatType(p.type)} • ₹{p.amount.toLocaleString()}
                    </p>
                  </div>
                  <Badge status={p.status} className="shrink-0">
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No payment records yet
            </p>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
};

/**
 * StatCard — Local inline component for this page only.
 * For animated numbers and color-coded icon backgrounds.
 */
const StatCard = ({ icon: Icon, label, value, subtext, color, animated = true }) => {
  const colorMap = {
    indigo: { bg: 'bg-blue-500/10', icon: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
    blue: { bg: 'bg-blue-400/10', icon: 'text-blue-500 dark:text-blue-300', border: 'border-blue-400/20' },
    emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
    amber: { bg: 'bg-amber-500/10', icon: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
    rose: { bg: 'bg-rose-500/10', icon: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
    violet: { bg: 'bg-violet-500/10', icon: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20' },
  };
  const colors = colorMap[color] || colorMap.indigo;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`glass-card rounded-xl border ${colors.border} p-5 hover:shadow-lg transition-shadow`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colors.bg}`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
      {subtext && (
        <p className="text-xs text-muted-foreground">{subtext}</p>
      )}
    </motion.div>
  );
};

export default AdminDashboard;