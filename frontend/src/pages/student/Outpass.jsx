import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, X, Clock, CheckCircle, XCircle, CalendarDays, MapPin } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import outpassService from '../../services/outpass.service';
import toast from 'react-hot-toast';

const Outpass = () => {
  const [outpasses, setOutpasses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ from_date: '', to_date: '', reason: '' });

  const fetchOutpasses = async (page = 1) => {
    try {
      setLoading(true);
      const response = await outpassService.getMine({ page, limit: 10 });
      setOutpasses(response.data.data.data);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error('Failed to load outpass history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutpasses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.from_date || !formData.to_date) return toast.error('Select both dates');
    if (new Date(formData.from_date) >= new Date(formData.to_date)) return toast.error('Invalid date range');
    if (formData.reason.trim().length < 5) return toast.error('Reason too short');
    
    setSubmitting(true);
    try {
      const response = await outpassService.create(formData);
      toast.success(response.data.message);
      setFormData({ from_date: '', to_date: '', reason: '' });
      setShowModal(false);
      fetchOutpasses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });

  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved': return { 
        icon: CheckCircle, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20',
        label: 'Approved',
        gradient: 'from-emerald-500 to-teal-500'
      };
      case 'rejected': return { 
        icon: XCircle, 
        color: 'text-red-500', 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/20',
        label: 'Rejected',
        gradient: 'from-red-500 to-rose-500'
      };
      default: return { 
        icon: Clock, 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20',
        label: 'Pending',
        gradient: 'from-amber-500 to-orange-500'
      };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Outpass</h1>
        </div>
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Outpass</h1>
        <motion.button 
          whileHover={{ scale: 1.02 }} 
          whileTap={{ scale: 0.98 }} 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
        >
          <Plus className="w-4 h-4" /> Request Outpass
        </motion.button>
      </div>

      {outpasses.length > 0 ? (
        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-slate-200 dark:before:via-slate-800">
          {outpasses.map((item, index) => {
            const status = getStatusConfig(item.status);
            const StatusIcon = status.icon;
            
            return (
              <motion.div 
                key={item._id} 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: index * 0.1 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Timeline Icon */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${status.border} ${status.bg} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10`}>
                  <StatusIcon className={`w-5 h-5 ${status.color}`} />
                </div>
                
                {/* Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] md:group-odd:mr-8 md:group-even:ml-8">
                  <Card className="p-5 hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: item.status === 'approved' ? '#10b981' : item.status === 'rejected' ? '#ef4444' : '#f59e0b' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{item.reason}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <CalendarDays className="w-4 h-4" />
                          <span>{formatDate(item.from_date)} — {formatDate(item.to_date)}</span>
                        </div>
                      </div>
                      <Badge status={item.status} variant={item.status} className="capitalize">
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                      <span>Requested on {new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.admin_remark && (
                        <span className="text-primary font-medium">Has remark</span>
                      )}
                    </div>
                    
                    {item.admin_remark && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-3 p-3 bg-secondary/50 rounded-lg text-sm text-foreground/80 border border-border"
                      >
                        <span className="font-medium text-muted-foreground">Admin:</span> {item.admin_remark}
                      </motion.div>
                    )}
                  </Card>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 glass-card">
          <EmptyState 
            icon={FileText} 
            title="No outpass requests" 
            description="You haven't requested any outpasses yet." 
            action={{ label: 'Request Outpass', onClick: () => setShowModal(true) }} 
          />
        </Card>
      )}

      {/* Request Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowModal(false)} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative glass-card bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Request Outpass</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">From Date *</label>
                    <input 
                      type="date" 
                      name="from_date" 
                      value={formData.from_date} 
                      onChange={(e) => setFormData({...formData, from_date: e.target.value})} 
                      className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">To Date *</label>
                    <input 
                      type="date" 
                      name="to_date" 
                      value={formData.to_date} 
                      onChange={(e) => setFormData({...formData, to_date: e.target.value})} 
                      className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      required 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Reason *</label>
                  <textarea 
                    name="reason" 
                    value={formData.reason} 
                    onChange={(e) => setFormData({...formData, reason: e.target.value})} 
                    rows={4} 
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                    placeholder="Enter reason for leave..."
                    required 
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">{formData.reason.length}/300</p>
                </div>
                
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
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Outpass;