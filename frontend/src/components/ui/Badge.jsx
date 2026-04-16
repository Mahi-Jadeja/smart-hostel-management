/**
 * Badge - A small colored label for status indicators
 *
 * Usage:
 *   <Badge variant="success">Resolved</Badge>
 *   <Badge variant="warning">Pending</Badge>
 *   <Badge variant="danger">Rejected</Badge>
 */

// Color maps for different variants
const variantStyles = {
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
};

// Map status strings to variants
const statusVariantMap = {
  // Complaint status
  pending: 'warning',
  in_progress: 'info',
  resolved: 'success',
  // Outpass status
  approved: 'success',
  rejected: 'danger',
  // Payment status
  paid: 'success',
  // Room status
  empty: 'success',
  partial: 'warning',
  full: 'danger',
  maintenance: 'neutral',
  // Priority
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
};

const Badge = ({ children, variant, status, className = '' }) => {
  // If status is provided, auto-detect variant
  const resolvedVariant = variant || statusVariantMap[status] || 'neutral';
  const styles = variantStyles[resolvedVariant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
