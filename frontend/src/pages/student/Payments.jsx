import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Bell, CheckCircle, Clock, X, AlertTriangle, IndianRupee, TrendingUp, Calendar } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import paymentService from '../../services/payment.service';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPaid: 0, totalPending: 0, overdueCount: 0 });
  
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      const response = await paymentService.getMine({ page, limit: 10 });
      setPayments(response.data.data.payments);
      setPagination(response.data.data.pagination);
      setReminders(response.data.data.reminders);
      
      // Calculate stats
      const paid = response.data.data.payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);
      const pending = response.data.data.payments.filter(p => p.status === 'pending');
      const pendingAmount = pending.reduce((acc, p) => acc + p.amount, 0);
      const overdue = pending.filter(p => new Date(p.due_date) < new Date()).length;
      
      setStats({ totalPaid: paid, totalPending: pendingAmount, overdueCount: overdue });
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const openPayModal = (payment) => {
    setSelectedPayment(payment);
    setTransactionId('');
    setPayModalOpen(true);
  };

  const handleMarkPaid = async () => {
    if (!selectedPayment) return;
    setSubmitting(true);
    try {
      const response = await paymentService.markPaid(selectedPayment._id, { transaction_id: transactionId });
      toast.success(response.data.message);
      setPayModalOpen(false);
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark as paid');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatType = (type) => type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Payments</h1>
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Payments</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
                <p className="text-3xl font-bold text-emerald-600">₹{stats.totalPaid.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-3xl font-bold text-amber-600">₹{stats.totalPending.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6 bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{stats.overdueCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Reminders */}
      <AnimatePresence>
        {reminders.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" /> Payment Reminders
            </h2>
            <div className="grid gap-3">
              {reminders.map((item) => (
                <motion.div 
                  key={item._id} 
                  initial={{ x: -20, opacity: 0 }} 
                  animate={{ x: 0, opacity: 1 }}
                  className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <IndianRupee className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{formatType(item.type)}</p>
                      <p className="text-sm text-muted-foreground">Due: {formatDate(item.due_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-foreground">₹{item.amount.toLocaleString()}</span>
                    <button 
                      onClick={() => openPayModal(item)} 
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
                    >
                      Pay Now
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Payment History</h2>
        
        {payments.length > 0 ? (
          <div className="space-y-3">
            {payments.map((payment, index) => (
              <motion.div 
                key={payment._id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`p-5 flex items-center justify-between gap-4 ${payment.status === 'paid' ? 'border-l-4 border-l-emerald-500' : isOverdue(payment.due_date) ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-amber-500'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${payment.status === 'paid' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                      {payment.status === 'paid' ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <Clock className="w-6 h-6 text-amber-500" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{formatType(payment.type)}</h3>
                      <p className="text-sm text-muted-foreground">{payment.description || 'No description'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {payment.status === 'paid' ? `Paid on ${formatDate(payment.payment_date)}` : `Due: ${formatDate(payment.due_date)}`}</span>
                        {payment.transaction_id && <span>• Txn: {payment.transaction_id}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xl font-bold text-foreground">₹{payment.amount.toLocaleString()}</p>
                    {payment.status === 'pending' ? (
                      <button 
                        onClick={() => openPayModal(payment)} 
                        className="text-sm text-primary hover:text-primary/80 font-medium mt-1"
                      >
                        Mark as Paid
                      </button>
                    ) : (
                      <Badge status="success">Paid</Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <EmptyState icon={CreditCard} title="No payments yet" description="You don't have any payment records." />
          </Card>
        )}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {payModalOpen && selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setPayModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative glass-card bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Mark as Paid</h2>
                <button onClick={() => setPayModalOpen(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 rounded-xl bg-secondary/50 mb-4 border border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">{formatType(selectedPayment.type)}</span>
                  <span className="text-xl font-bold text-foreground">₹{selectedPayment.amount.toLocaleString()}</span>
                </div>
                <div className="text-sm text-muted-foreground">Due: {formatDate(selectedPayment.due_date)}</div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Transaction ID (Optional)</label>
                  <input 
                    type="text" 
                    value={transactionId} 
                    onChange={(e) => setTransactionId(e.target.value)} 
                    placeholder="Enter transaction reference"
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                  <p className="text-sm text-yellow-800">Please ensure you have actually completed the payment before marking it as paid.</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    onClick={() => setPayModalOpen(false)} 
                    className="px-6 py-2.5 text-foreground hover:bg-secondary rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleMarkPaid} 
                    disabled={submitting} 
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 shadow-lg shadow-primary/25"
                  >
                    {submitting ? 'Saving...' : 'Confirm Payment'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Payments;