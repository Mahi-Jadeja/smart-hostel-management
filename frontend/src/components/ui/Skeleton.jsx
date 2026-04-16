/**
 * Skeleton - Loading placeholder that pulses
 *
 * Shows a gray animated shape where content will appear.
 * Gives users a visual hint that content is loading
 * (much better than a blank screen or a spinner).
 *
 * Usage:
 *   <Skeleton className="h-8 w-32" />          → Text line
 *   <Skeleton className="h-40 w-full" />        → Card
 *   <Skeleton className="h-10 w-10 rounded-full" /> → Avatar
 */
const Skeleton = ({ className = '' }) => {
  return (
    <div
      className={`bg-gray-200 animate-pulse rounded-lg ${className}`}
      // animate-pulse is a Tailwind animation
      // It smoothly fades the element in and out
      // Giving the impression of "loading..."
    />
  );
};

// Pre-built skeleton variants for common patterns
export const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-6">
    <Skeleton className="h-4 w-24 mb-3" />
    <Skeleton className="h-8 w-16 mb-2" />
    <Skeleton className="h-3 w-32" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-6">
    <Skeleton className="h-8 w-full mb-4" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full mb-2" />
    ))}
  </div>
);

export default Skeleton;
