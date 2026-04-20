import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  MessageSquare,
  Search,
  X,
  Save,
  Shield,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import complaintsService from '../../services/complaint.service.js';
import toast from 'react-hot-toast';

const Complaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    q: '',
  });

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    admin_remark: '',
  });

  // Fetch complaints with filters
  const fetchComplaints = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 10, ...filters };
      const response = await complaintsService.getAll(params);

      setComplaints(response.data.data.data);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchComplaints(1);
  };

  const openUpdateModal = (complaint) => {
    setSelectedComplaint(complaint);
    setUpdateForm({
      status: complaint.status,
      admin_remark: complaint.admin_remark || '',
    });
  };

  const closeUpdateModal = () => {
    setSelectedComplaint(null);
  };

  const handleUpdate = async () => {
    if (!selectedComplaint) return;

    try {
      setModalLoading(true);
      await complaintsService.updateStatus(selectedComplaint._id, updateForm);

      toast.success('Complaint updated successfully');
      closeUpdateModal();
      fetchComplaints(pagination?.currentPage || 1);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update complaint';
      toast.error(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <MessageSquare className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground">Complaints Management</h1>
        <SkeletonTable rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Complaints Management</h1>
          <p className="text-muted-foreground mt-1">Review and resolve student complaints</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 glass-card">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              name="q"
              value={filters.q}
              onChange={handleFilterChange}
              placeholder="Search student or description..."
              className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            name="priority"
            value={filters.priority}
            onChange={handleFilterChange}
            className="px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={applyFilters}
            className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 font-medium transition-all flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply
          </motion.button>
        </div>
      </Card>

      {/* Table */}
      {complaints.length > 0 ? (
        <Card className="overflow-hidden glass-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Description</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c, index) => (
                  <motion.tr 
                    key={c._id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-border/50 last:border-b-0 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.student_id?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{c.student_id?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{c.category}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={c.description}>
                      {c.description}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {getPriorityIcon(c.priority)}
                        <span className="capitalize text-sm text-foreground">{c.priority}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={c.status} variant={c.status}>
                        {c.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openUpdateModal(c)}
                        className="px-4 py-2 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 font-medium transition-colors"
                      >
                        Manage
                      </motion.button>
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
            icon={MessageSquare}
            title="No complaints found"
            description="Adjust your filters or wait for new complaints."
          />
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchComplaints(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="px-4 py-2 border border-input rounded-lg disabled:opacity-50 hover:bg-secondary transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground px-4">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchComplaints(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="px-4 py-2 border border-input rounded-lg disabled:opacity-50 hover:bg-secondary transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Update Modal */}
      <AnimatePresence>
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeUpdateModal}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative glass-card bg-card w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Manage Complaint</h2>
                </div>
                <button onClick={closeUpdateModal} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-secondary/30 p-4 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Student</p>
                  <p className="font-medium text-foreground">{selectedComplaint.student_id?.name}</p>
                  <p className="text-sm text-primary capitalize mt-2">{selectedComplaint.category}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedComplaint.description}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <select
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Admin Remark</label>
                  <textarea
                    value={updateForm.admin_remark}
                    onChange={(e) => setUpdateForm({ ...updateForm, admin_remark: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                    placeholder="Add a note for the student..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button onClick={closeUpdateModal} className="px-6 py-2.5 text-foreground hover:bg-secondary rounded-lg font-medium transition-colors">
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpdate}
                    disabled={modalLoading}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {modalLoading ? 'Saving...' : 'Update'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Complaints;