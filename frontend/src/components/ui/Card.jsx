/**
 * Card - A container with white background, shadow, and rounded corners
 *
 * Usage:
 *   <Card>Content here</Card>
 *   <Card className="p-8">Custom padding</Card>
 *   <Card onClick={handleClick}>Clickable card</Card>
 */
const Card = ({ children, className = '', onClick, ...props }) => {
  // Template literal with conditional classes
  const baseClasses = 'bg-white rounded-xl border border-gray-100 shadow-sm';

  // If onClick is provided, add hover/cursor styles
  const interactiveClasses = onClick
    ? 'cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all'
    : '';

  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
      {...props}
      // ...props passes any additional props (like data-testid, aria-label)
    >
      {children}
    </div>
  );
};

export default Card;
