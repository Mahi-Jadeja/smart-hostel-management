import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Filter,
  X,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  MapPin,
  User,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import outpassService from '../../services/outpass.service';
import toast from 'react-hot-toast';

const Outpass = () => {
  const [outpasses, setOutpasses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ status: '' });
  const [selectedOutpass, setSelectedOutpass] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [decisionForm, setDecisionForm] = useState({ status: '', admin_remark: '' });

  // Fetch outpasses with filters
  const fetchOutpasses = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 10, ...filters };
      const response = await outpassService.getAll(params);

      setOutpasses(response.data.data.data);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch outpasses:', error);
      toast.error('Failed to load outpass requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutpasses();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchOutpasses(1);
  };

  const openDetailModal = (outpass) => {
    setSelectedOutpass(outpass);
    setDecisionForm({
      status: outpass.status,
      admin_remark: outpass.admin_remark || '',
    });
  };

  const closeDetailModal = () => {
    setSelectedOutpass(null);
  };

  const handleUpdate = async () => {
    if (!selectedOutpass) return;

    // Prevent updating already decided requests without change
    if (selectedOutpass.status !== 'pending' && decisionForm.status === selectedOutpass.status) {
      toast.info('Status is already set to this value.');
      closeDetailModal();
      return;
    }

    try {
      setModalLoading(true);
      await outpassService.decide(selectedOutpass._id, decisionForm);

      toast.success('Outpass updated successfully');
      closeDetailModal();
      fetchOutpasses(pagination?.currentPage || 1);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update outpass';
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

  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved': 
        return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Approved' };
      case 'guardian_rejected': 
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Rejected' };
      case 'expired': 
        return { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Expired' };
      default: 
        return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground">Outpass Management</h1>
        <SkeletonTable rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Outpass Management</h1>
          <p className="text-muted-foreground mt-1">Review and approve student outpass requests</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 glass-card">
        <div className="flex flex-wrap gap-3 items-end">
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-w-[180px]"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="guardian_rejected">Guardian Rejected</option>
            <option value="expired">Expired</option>
          </select>

                    <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={applyFilters}
            className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 font-medium transition-all flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </motion.button>
        </div>
      </Card>

      {/* Table */}
      {outpasses.length > 0 ? (
        <Card className="overflow-hidden glass-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Dates</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Reason</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Requested</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {outpasses.map((o, index) => {
                  const statusConfig = getStatusConfig(o.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <motion.tr 
                      key={o._id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b last:border-b-0 border-border hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{o.student_id?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{o.student_id?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-muted-foreground" />
                          <span>{formatDate(o.from_date)} → {formatDate(o.to_date)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground max-w-xs truncate" title={o.reason}>
                        {o.reason}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openDetailModal(o)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </motion.button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-12 glass-card">
          <EmptyState
            icon={CalendarDays}
            title="No outpass requests found"
            description="Adjust your filters or wait for new requests from students."
          />
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchOutpasses(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="px-4 py-2 border border-input rounded-lg disabled:opacity-50 hover:bg-secondary transition-colors"
          >
            Previous
          </motion.button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchOutpasses(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="px-4 py-2 border border-input rounded-lg disabled:opacity-50 hover:bg-secondary transition-colors"
          >
            Next
          </motion.button>
        </div>
      )}

      {/* Detail / Edit Modal */}
      <AnimatePresence>
        {selectedOutpass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={closeDetailModal} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative glass-card bg-card w-full max-w-2xl p-6 max-h-[90vh] overflow-auto rounded-2xl shadow-2xl border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Outpass Details</h2>
                  <p className="text-sm text-muted-foreground">Review and manage request</p>
                </div>
                <button onClick={closeDetailModal} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Student & Dates Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/30 p-5 rounded-xl border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Student</p>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      {selectedOutpass.student_id?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedOutpass.student_id?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Guardian Email</p>
                    <p className="font-medium text-foreground">{selectedOutpass.guardian_email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">From Date</p>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-emerald-500" />
                      {formatDate(selectedOutpass.from_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">To Date</p>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-red-500" />
                      {formatDate(selectedOutpass.to_date)}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Reason</p>
                    <p className="text-sm text-foreground mt-1 p-3 bg-background rounded-lg border border-border">
                      {selectedOutpass.reason}
                    </p>
                  </div>
                </div>

                {/* Status & Remark Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Current Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const config = getStatusConfig(selectedOutpass.status);
                        const Icon = config.icon;
                        return (
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
                            <Icon className="w-4 h-4" />
                            {config.label}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {selectedOutpass.status === 'pending' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Update Status</label>
                        <select
                          value={decisionForm.status}
                          onChange={(e) => setDecisionForm({ ...decisionForm, status: e.target.value })}
                          className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        >
                          <option value="pending">⏳ Pending</option>
                          <option value="approved">✅ Approved</option>
                          <option value="guardian_rejected">❌ Guardian Rejected</option>
                          <option value="expired">⌛ Expired</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Admin Remark</label>
                        <textarea
                          value={decisionForm.admin_remark}
                          onChange={(e) => setDecisionForm({ ...decisionForm, admin_remark: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                          placeholder="Add a note for the student or record..."
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={closeDetailModal} 
                          className="px-6 py-2.5 text-foreground hover:bg-secondary rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleUpdate}
                          disabled={modalLoading}
                          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium shadow-lg shadow-primary/25 flex items-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          {modalLoading ? 'Saving...' : 'Update Status'}
                        </motion.button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Action Completed</p>
                        <p className="mt-1">This request has already been <span className="font-semibold">{selectedOutpass.status.replace('_', ' ')}</span>. Status cannot be changed.</p>
                        {selectedOutpass.admin_remark && (
                          <div className="mt-3 p-3 bg-background rounded-lg border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Your previous remark:</p>
                            <p className="text-foreground">{selectedOutpass.admin_remark}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Outpass;