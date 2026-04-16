import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Filter,
  Search,
  X,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
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

    // Prevent updating already decided requests
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'guardian_rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'expired': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Outpass Management</h1>
        <SkeletonTable rows={6} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Outpass Management</h1>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white min-w-[180px]"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="guardian_rejected">Guardian Rejected</option>
            <option value="expired">Expired</option>
          </select>

          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply
          </button>
        </div>
      </Card>

      {/* Table */}
      {outpasses.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Dates</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Reason</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Requested</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {outpasses.map((o) => (
                  <tr key={o._id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{o.student_id?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{o.student_id?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(o.from_date)} → {formatDate(o.to_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={o.reason}>
                      {o.reason}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(o.status)}
                        <Badge status={o.status}>{o.status.replace('_', ' ')}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetailModal(o)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                      >
                        <Eye className="w-4 h-4" />
                        View / Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <EmptyState
            icon={CalendarDays}
            title="No outpass requests found"
            description="Adjust your filters or wait for new requests."
          />
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => fetchOutpasses(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchOutpasses(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selectedOutpass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeDetailModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Outpass Details</h2>
              <button onClick={closeDetailModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Student & Dates Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Student</p>
                  <p className="font-medium text-gray-900">{selectedOutpass.student_id?.name}</p>
                  <p className="text-sm text-gray-500">{selectedOutpass.student_id?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Guardian Email</p>
                  <p className="font-medium text-gray-900">{selectedOutpass.guardian_email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">From Date</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedOutpass.from_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">To Date</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedOutpass.to_date)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase">Reason</p>
                  <p className="text-sm text-gray-700 mt-1">{selectedOutpass.reason}</p>
                </div>
              </div>

              {/* Status & Remark Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedOutpass.status)}
                    <Badge status={selectedOutpass.status}>{selectedOutpass.status.replace('_', ' ')}</Badge>
                  </div>
                </div>

                {selectedOutpass.status === 'pending' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                      <select
                        value={decisionForm.status}
                        onChange={(e) => setDecisionForm({ ...decisionForm, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="guardian_rejected">Guardian Rejected</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admin Remark</label>
                      <textarea
                        value={decisionForm.admin_remark}
                        onChange={(e) => setDecisionForm({ ...decisionForm, admin_remark: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Add a note for the student or record..."
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button onClick={closeDetailModal} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdate}
                        disabled={modalLoading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {modalLoading ? 'Saving...' : 'Update'}
                      </button>
                    </div>
                  </>
                )}

                {selectedOutpass.status !== 'pending' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    This request has already been {selectedOutpass.status.replace('_', ' ')}. Status cannot be changed.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Outpass;