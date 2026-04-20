import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  ClipboardList,
  FileText,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import studentService from '../../services/student.service';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await studentService.getDashboardStats();
        const data = response.data.data;
        setStats(data);

        // Mock chart data based on real stats (in production, backend would provide this)
        setChartData([
          { name: 'Mon', complaints: 2, outpasses: 1, payments: 0 },
          { name: 'Tue', complaints: 1, outpasses: 0, payments: 1 },
          { name: 'Wed', complaints: 0, outpasses: 2, payments: 0 },
          { name: 'Thu', complaints: 3, outpasses: 0, payments: 0 },
          { name: 'Fri', complaints: 1, outpasses: 1, payments: 1 },
          { name: 'Sat', complaints: 0, outpasses: 1, payments: 0 },
          { name: 'Sun', complaints: 0, outpasses: 0, payments: 0 },
        ]);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatLabel = (str) => {
    if (!str) return '';
    return str
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <div className="h-10 w-32 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground glass px-4 py-2 rounded-full">
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={BedDouble}
          label="Room"
          value={
            stats?.room?.room_no
              ? `${stats.room.hostel_block}-${stats.room.room_no}`
              : 'Not Allocated'
          }
          subtext={
            stats?.room?.room_no
              ? `Floor ${stats.room.floor}, Bed ${stats.room.bed_no || '-'}`
              : 'Contact admin for allocation'
          }
          color="indigo"
          trend={stats?.room ? 0 : null}
        />
        <StatCard
          icon={ClipboardList}
          label="Complaints"
          value={stats?.complaints?.total || 0}
          subtext={`${stats?.complaints?.pending || 0} pending`}
          color="emerald"
          trend={-12}
        />
        <StatCard
          icon={FileText}
          label="Outpasses"
          value={stats?.outpasses?.total || 0}
          subtext={`${stats?.outpasses?.approved || 0} approved`}
          color="amber"
          trend={5}
        />
        <StatCard
          icon={CreditCard}
          label="Payments Due"
          value={
            stats?.payments?.totalPendingAmount
              ? `₹${stats.payments.totalPendingAmount.toLocaleString()}`
              : '₹0'
          }
          subtext={`${stats?.payments?.pendingCount || 0} pending`}
          color="rose"
          trend={stats?.payments?.pendingCount > 0 ? 8 : 0}
        />
      </motion.div>

      {/* Activity Chart */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Activity Overview
              </h2>
              <p className="text-sm text-muted-foreground">Your hostel activity this week</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOutpasses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                  }}
                />
                <Area type="monotone" dataKey="complaints" stroke="#3b82f6" fillOpacity={1} fill="url(#colorComplaints)" />
                <Area type="monotone" dataKey="outpasses" stroke="#10b981" fillOpacity={1} fill="url(#colorOutpasses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Complaints */}
        <motion.div variants={itemVariants}>
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Recent Complaints</h2>
              <motion.button
                whileHover={{ x: 3 }}
                onClick={() => navigate('/student/complaints')}
                className="text-sm text-primary hover:text-primary/90 font-medium flex items-center gap-1"
              >
                View All →
              </motion.button>
            </div>

            {stats?.recent?.complaints?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent.complaints.map((complaint, index) => (
                  <motion.div
                    key={complaint._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group cursor-pointer"
                    onClick={() => navigate('/student/complaints')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        complaint.status === 'resolved' ? 'bg-emerald-500/10' :
                        complaint.status === 'in_progress' ? 'bg-blue-500/10' : 'bg-yellow-500/10'
                      }`}>
                        {complaint.status === 'resolved' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : complaint.status === 'in_progress' ? (
                          <Clock className="w-4 h-4 text-blue-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{formatLabel(complaint.category)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(complaint.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {complaint.priority === 'high' && <Badge status="high">High</Badge>}
                      <Badge status={complaint.status}>{formatLabel(complaint.status)}</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No complaints yet"
                description="You haven't filed any complaints."
              />
            )}
          </Card>
        </motion.div>

        {/* Recent Outpasses */}
        <motion.div variants={itemVariants}>
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Recent Outpasses</h2>
              <motion.button
                whileHover={{ x: 3 }}
                onClick={() => navigate('/student/outpass')}
                className="text-sm text-primary hover:text-primary/90 font-medium flex items-center gap-1"
              >
                View All →
              </motion.button>
            </div>

            {stats?.recent?.outpasses?.length > 0 ? (
              <div className="space-y-3">
                {stats.recent.outpasses.map((outpass, index) => (
                  <motion.div
                    key={outpass._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                    onClick={() => navigate('/student/outpass')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{outpass.reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(outpass.from_date)} — {formatDate(outpass.to_date)}
                        </p>
                      </div>
                      <Badge status={outpass.status} animated>
                        {formatLabel(outpass.status)}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No outpasses yet"
                description="You haven't requested any outpasses."
              />
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Overview;