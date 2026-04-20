import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

const colorMap = {
  indigo: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
  },
  rose: {
    bg: 'bg-rose-500/10',
    icon: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20',
  },
  violet: {
    bg: 'bg-violet-500/10',
    icon: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/20',
  },
};

function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  
  useEffect(() => {
    const controls = animate(count, parseInt(value) || 0, {
      duration: 2,
      ease: "easeOut"
    });
    return controls.stop;
  }, [value, count]);

  return (
    <span className="tabular-nums">
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

const StatCard = ({ icon: Icon, label, value, subtext, color = 'indigo', trend = null, animated = true }) => {
  const colors = colorMap[color] || colorMap.indigo;
  const isNumeric = !isNaN(parseInt(value));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`
        glass-card rounded-xl border ${colors.border} p-6
        hover:shadow-lg transition-shadow duration-300
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${colors.bg}`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
        {trend && (
          <span className={`
            text-xs font-medium px-2 py-1 rounded-full
            ${trend > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}
          `}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{label}</h3>
      <div className="text-3xl font-bold text-foreground mb-1">
        {animated && isNumeric ? (
          <AnimatedNumber value={value} />
        ) : (
          value
        )}
      </div>
      
      {subtext && (
        <p className="text-sm text-muted-foreground">{subtext}</p>
      )}
    </motion.div>
  );
};

export default StatCard;