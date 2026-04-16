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
} from 'lucide-react';

// Our reusable UI components
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

// API service
import studentService from '../../services/student.service';

// Toast for error notifications
import toast from 'react-hot-toast';

const Overview = () => {
  // ---- State ----
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // ---- Fetch dashboard data on mount ----
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await studentService.getDashboardStats();
        setStats(response.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);
  // Empty dependency array [] = run this effect ONCE when component mounts

  // ---- Loading State ----
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        {/* Show skeleton cards while loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Array.from creates an array of 4 items for 4 skeleton cards */}
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ---- Helper: Format date ----
  // Converts ISO date string to readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    // 'en-IN' = Indian English locale
    // Result: "15 Jan 2024" (not "01/15/2024")
  };

  // ---- Helper: Format category ----
  // Converts "plumbing" to "Plumbing", "in_progress" to "In Progress"
  const formatLabel = (str) => {
    if (!str) return '';
    return str
      .replace(/_/g, ' ')
      // Replace ALL underscores with spaces (g = global flag)
      // "in_progress" → "in progress"
      .replace(/\b\w/g, (char) => char.toUpperCase());
      // \b = word boundary, \w = word character
      // Capitalize first letter of each word
      // "in progress" → "In Progress"
  };

  return (
    <div>
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* ======== STAT CARDS ======== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/*
          Grid explanation:
          - 1 column on mobile (grid-cols-1)
          - 2 columns on small screens (sm:grid-cols-2, ≥640px)
          - 4 columns on large screens (lg:grid-cols-4, ≥1024px)

          This is responsive design with Tailwind!
        */}

        {/* Room Card */}
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
        />

        {/* Complaints Card */}
        <StatCard
          icon={ClipboardList}
          label="Complaints"
          value={stats?.complaints?.total || 0}
          subtext={`${stats?.complaints?.pending || 0} pending`}
          color="yellow"
        />

        {/* Outpasses Card */}
        <StatCard
          icon={FileText}
          label="Outpasses"
          value={stats?.outpasses?.total || 0}
          subtext={`${stats?.outpasses?.approved || 0} approved`}
          color="green"
        />

        {/* Payments Card */}
        <StatCard
          icon={CreditCard}
          label="Payments Due"
          value={
            stats?.payments?.totalPendingAmount
              ? `₹${stats.payments.totalPendingAmount.toLocaleString()}`
              : '₹0'
          }
          subtext={`${stats?.payments?.pendingCount || 0} pending`}
          color="red"
        />
      </div>

      {/* ======== RECENT ACTIVITY ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Complaints */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Complaints
            </h2>
            <button
              onClick={() => navigate('/student/complaints')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View All →
            </button>
          </div>

          {/* Check if there are complaints to show */}
          {stats?.recent?.complaints?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent.complaints.map((complaint) => (
                <div
                  key={complaint._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {/* Status icon */}
                    {complaint.status === 'resolved' ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : complaint.status === 'in_progress' ? (
                      <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                    {/* flex-shrink-0 prevents the icon from shrinking
                        when the text next to it is long */}

                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatLabel(complaint.category)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(complaint.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Priority badge (only show if high) */}
                    {complaint.priority === 'high' && (
                      <Badge status="high">High</Badge>
                    )}
                    {/* Status badge */}
                    <Badge status={complaint.status}>
                      {formatLabel(complaint.status)}
                    </Badge>
                  </div>
                </div>
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

        {/* Recent Outpasses */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Outpasses
            </h2>
            <button
              onClick={() => navigate('/student/outpass')}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View All →
            </button>
          </div>

          {stats?.recent?.outpasses?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent.outpasses.map((outpass) => (
                <div
                  key={outpass._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {outpass.reason}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(outpass.from_date)} — {formatDate(outpass.to_date)}
                    </p>
                  </div>
                  <Badge status={outpass.status}>
                    {formatLabel(outpass.status)}
                  </Badge>
                </div>
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
      </div>
    </div>
  );
};

export default Overview;
