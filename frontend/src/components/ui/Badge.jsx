import { motion } from 'framer-motion';

const variantStyles = {
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  danger: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  neutral: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400',
  purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
};

const statusVariantMap = {
  pending: 'warning',
  in_progress: 'info',
  resolved: 'success',
  approved: 'success',
  rejected: 'danger',
  paid: 'success',
  empty: 'success',
  partial: 'warning',
  full: 'danger',
  maintenance: 'neutral',
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
};

const Badge = ({ children, variant, status, className = '', animated = false }) => {
  const resolvedVariant = variant || statusVariantMap[status] || 'neutral';
  const styles = variantStyles[resolvedVariant] || variantStyles.neutral;

  const Component = animated ? motion.span : 'span';
  const motionProps = animated ? {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: "spring", stiffness: 500, damping: 30 }
  } : {};

  return (
    <Component
      {...motionProps}
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${styles} ${className}
      `}
    >
      <span className={`
        w-1.5 h-1.5 rounded-full mr-1.5
        ${resolvedVariant === 'success' ? 'bg-emerald-500' : ''}
        ${resolvedVariant === 'warning' ? 'bg-amber-500' : ''}
        ${resolvedVariant === 'danger' ? 'bg-red-500' : ''}
        ${resolvedVariant === 'info' ? 'bg-blue-500' : ''}
        ${resolvedVariant === 'neutral' ? 'bg-slate-500' : ''}
        ${resolvedVariant === 'purple' ? 'bg-purple-500' : ''}
      `} />
      {children}
    </Component>
  );
};

export default Badge;