import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Plus,
  X,
  AlertCircle,
  Clock,
  CheckCircle,
  Trash2,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import complaintService from '../../services/complaint.service';
import toast from 'react-hot-toast';

/**
 * Complaint categories with emoji icons.
 * Icon gives visual context so students can scan quickly.
 */
const CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing', icon: '🔧' },
  { value: 'electrical', label: 'Electrical', icon: '⚡' },
  { value: 'furniture', label: 'Furniture', icon: '🪑' },
  { value: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'internet', label: 'Internet', icon: '📶' },
  { value: 'security', label: 'Security', icon: '🔒' },
  { value: 'other', label: 'Other', icon: '📝' },
];

const Complaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /**
   * Fetch student's own complaints with pagination.
   * @param {number} page - Page number (1-based)
   */
  const fetchComplaints = async (page = 1) => {
    try {
      setLoading(true);
      const response = await complaintService.getMine({ page, limit: 10 });
      setComplaints(response.data.data.data);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  /**
   * Submit a new complaint.
   * Validates category selection and description length before API call.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) return toast.error('Select a category');
    if (description.trim().length < 10) return toast.error('Description must be at least 10 characters');

    setSubmitting(true);
    try {
      const response = await complaintService.create({ category, description });
      toast.success(response.data.message);
      // Reset form state
      setCategory('');
      setDescription('');
      setShowModal(false);
      fetchComplaints();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Delete a pending complaint.
   * Only pending complaints can be deleted (enforced by backend too).
   */
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await complaintService.delete(deleteId);
      toast.success('Complaint deleted');
      fetchComplaints();
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
    }
  };

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Complaints</h1>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ======== HEADER ======== */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Complaints</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/25"
        >
          <Plus className="w-4 h-4" />
          New Complaint
        </motion.button>
      </div>

      {/* ======== COMPLAINTS LIST ======== */}
      {complaints.length > 0 ? (
        <div className="space-y-4">
          {complaints.map((complaint, index) => (
            <motion.div
              key={complaint._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Status icon */}
                    <div className="p-3 rounded-xl bg-secondary shrink-0">
                      {getStatusIcon(complaint.status)}
                    </div>
                    <div className="flex-1">
                      {/* Category + badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold text-foreground text-lg">
                          {CATEGORIES.find((c) => c.value === complaint.category)?.icon}{' '}
                          {complaint.category
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        {complaint.priority === 'high' && (
                          <Badge status="high">High Priority</Badge>
                        )}
                        <Badge status={complaint.status}>
                          {complaint.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-foreground/80 mb-3">{complaint.description}</p>

                      {/* Admin response (if any) */}
                      {complaint.admin_remark && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-3">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Admin Response
                          </p>
                          <p className="text-sm text-foreground">{complaint.admin_remark}</p>
                        </div>
                      )}

                      {/* Date */}
                      <p className="text-xs text-muted-foreground">
                        Filed on {formatDate(complaint.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Delete button — only for pending complaints */}
                  {complaint.status === 'pending' && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeleteId(complaint._id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <EmptyState
            icon={ClipboardList}
            title="No complaints yet"
            description="You haven't filed any complaints."
            action={{ label: 'New Complaint', onClick: () => setShowModal(true) }}
          />
        </Card>
      )}

      {/* ======== NEW COMPLAINT MODAL ======== */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative glass-card bg-card w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-border"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">New Complaint</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* ---- CATEGORY PICKER ---- */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Category *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const isSelected = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setCategory(cat.value)}
                          className={`
                            p-3 rounded-xl border-2 text-left transition-all duration-200
                            flex items-center gap-2
                            ${isSelected
                              ? /* Selected: solid primary fill, white text, visible ring */
                                'border-primary bg-primary text-white shadow-lg shadow-primary/30 scale-[1.02]'
                              : /* Unselected: subtle border, theme-aware background */
                                'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5'
                            }
                          `}
                        >
                          <span className="text-xl leading-none">{cat.icon}</span>
                          <span className="text-sm font-medium">{cat.label}</span>

                          {/* Checkmark indicator when selected */}
                          {isSelected && (
                            <span className="ml-auto text-white">
                              <CheckCircle className="w-4 h-4" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected category confirmation text */}
                  {category && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-primary font-medium mt-2 flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Selected:{' '}
                      {CATEGORIES.find((c) => c.value === category)?.label}
                    </motion.p>
                  )}
                </div>

                {/* ---- DESCRIPTION ---- */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                    placeholder="Describe your issue in detail (min. 10 characters)..."
                  />
                  <div className="flex items-center justify-between mt-1">
                    {/* Character count warning */}
                    <p className={`text-xs ${description.length < 10 && description.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {description.length < 10 && description.length > 0
                        ? `${10 - description.length} more characters needed`
                        : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {description.length}/500
                    </p>
                  </div>
                </div>

                {/* ---- ACTIONS ---- */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 text-foreground hover:bg-secondary rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
                  >
                    {submitting ? 'Submitting...' : 'Submit Complaint'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======== DELETE CONFIRMATION MODAL ======== */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteId(null)}
            />
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative glass-card bg-card w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl border border-border"
            >
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Delete Complaint?
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-6 py-2.5 text-foreground hover:bg-secondary rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-medium disabled:opacity-50 transition-all"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Complaints;