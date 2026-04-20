import { motion } from 'framer-motion';

const Skeleton = ({ className = '' }) => {
  return (
    <div
      className={`
        bg-slate-200 dark:bg-slate-800 
        animate-pulse rounded-lg 
        ${className}
      `}
    />
  );
};

export const SkeletonCard = () => (
  <div className="glass-card rounded-xl p-6 space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
    <Skeleton className="h-20 w-full" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="glass-card rounded-xl p-6 space-y-3">
    <Skeleton className="h-8 w-full mb-4" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);

export default Skeleton;