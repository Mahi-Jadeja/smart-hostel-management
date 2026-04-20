import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../theme/ThemeToggle';

/**
 * TopBar
 * Right-side content of the dashboard header.
 * Shows theme toggle and current user info.
 * NOTE: Notification bell removed — no backend functionality yet.
 */
const TopBar = () => {
  const { user } = useAuth();

  // Show minimal version while user is loading
  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="w-9 h-9 rounded-full bg-secondary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* Theme toggle (light/dark mode) */}
      <ThemeToggle />

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* User profile summary */}
      <div className="flex items-center gap-3">
        {/* Name and role — hidden on small screens */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-foreground leading-tight">
            {user.name}
          </p>
          <p className="text-xs text-muted-foreground capitalize leading-tight">
            {user.role}
          </p>
        </div>

        {/* Avatar with gradient */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shrink-0">
          {user.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </div>
    </div>
  );
};

export default TopBar;