import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, CalendarDays, AlertTriangle, Loader2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

// Simple axios instance for public routes (no auth headers)
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

const GuardianAction = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [outpass, setOutpass] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decisionMade, setDecisionMade] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/outpass/guardian-action/${token}`);
        setOutpass(response.data.data.outpass);
      } catch (err) {
        const message = err.response?.data?.message || 'Invalid or expired link';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchDetails();
  }, [token]);

  const handleDecision = async (decision) => {
    try {
      setSubmitting(true);
      await api.patch(`/outpass/guardian-action/${token}/decision`, { decision });
      setDecisionMade(true);
      toast.success(decision === 'approved' ? 'Outpass approved successfully' : 'Outpass rejected');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to process decision';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading outpass details...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center border-red-200 bg-red-50">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Link Invalid or Expired</h2>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go to Home
          </button>
        </Card>
      </div>
    );
  }

  if (decisionMade) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You</h2>
          <p className="text-gray-600">Your decision has been recorded successfully.</p>
          <p className="text-sm text-gray-400 mt-4">You may close this page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Outpass Approval Request</h1>
          <p className="text-gray-500 text-sm">Please review the details below and make a decision.</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 space-y-4 mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Student Name</p>
            <p className="font-semibold text-gray-900">{outpass.student_name}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Dates</p>
            <div className="flex items-center gap-2 text-gray-900">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              <span>
                {new Date(outpass.from_date).toLocaleDateString()} → {new Date(outpass.to_date).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Reason</p>
            <p className="text-gray-700">{outpass.reason}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleDecision('rejected')}
            disabled={submitting}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50 font-medium"
          >
            <XCircle className="w-5 h-5" />
            Reject
          </button>

          <button
            onClick={() => handleDecision('approved')}
            disabled={submitting}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium"
          >
            <CheckCircle className="w-5 h-5" />
            Approve
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          This link expires on {new Date(outpass.token_expires_at || outpass.from_date).toLocaleDateString()}.
        </p>
      </Card>
    </div>
  );
};

export default GuardianAction;