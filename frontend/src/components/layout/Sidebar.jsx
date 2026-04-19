import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  LayoutDashboard,
  User,
  BedDouble,
  ClipboardList,
  FileText,
  CreditCard,
  Users,
  LogOut,
  X,
} from 'lucide-react';

// Navigation items for each role
const studentNavItems = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/profile', label: 'Profile', icon: User },
  { to: '/student/room', label: 'Room', icon: BedDouble },
  { to: '/student/room-preference', label: 'Room Preference', icon: Users },
  { to: '/student/complaints', label: 'Complaints', icon: ClipboardList },
  { to: '/student/outpass', label: 'Outpass', icon: FileText },
  { to: '/student/payments', label: 'Payments', icon: CreditCard },
];

const adminNavItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/rooms', label: 'Rooms', icon: BedDouble },
  { to: '/admin/complaints', label: 'Complaints', icon: ClipboardList },
  { to: '/admin/outpass', label: 'Outpass', icon: FileText },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  
];

/**
 * Sidebar Component
 *
 * @param {boolean} isOpen - Whether sidebar is open (mobile)
 * @param {function} onClose - Close the sidebar (mobile)
 */
const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  // Pick nav items based on role
  const navItems = user?.role === 'admin' ? adminNavItems : studentNavItems;

  return (
    <>
      {/* ======== MOBILE OVERLAY ======== */}
      {/* Dark background behind sidebar on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          // Clicking the dark area closes the sidebar
        />
      )}

      {/* ======== SIDEBAR ======== */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-indigo-950
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        // On mobile:
        //   isOpen=true  → translate-x-0 (visible, slid into view)
        //   isOpen=false → -translate-x-full (hidden, slid out to the left)
        // On desktop (lg:):
        //   Always visible (lg:translate-x-0)
        //   Static positioning (lg:static) instead of fixed
      >
        <div className="flex flex-col h-full">
          {/* ---- Header ---- */}
          <div className="flex items-center justify-between px-5 py-5 border-b border-indigo-900">
            <div className="flex items-center gap-2">
              <Building2 className="w-7 h-7 text-indigo-400" />
              <span className="text-lg font-bold text-white">IntelliHostel</span>
            </div>
            {/* Close button (mobile only) */}
            <button
              onClick={onClose}
              className="lg:hidden text-indigo-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ---- Navigation Links ---- */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                // Close sidebar when a link is clicked (mobile)
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-800 text-white'
                      : 'text-indigo-300 hover:bg-indigo-900 hover:text-white'
                  }`
                }
                // NavLink passes { isActive } to the className function
                // isActive is true when the current URL matches this link's 'to' prop
              >
                <item.icon className="w-5 h-5" />
                {/* Dynamic component rendering:
                    item.icon is a component (e.g., LayoutDashboard)
                    <item.icon /> renders that component
                    Same as writing <LayoutDashboard className="..." /> */}
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* ---- User Info + Logout ---- */}
          <div className="px-3 py-4 border-t border-indigo-900">
            {/* User Info */}
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              {/* Avatar circle with first letter of name */}
              <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-white font-medium text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                {/* min-w-0 prevents text from overflowing the flex container */}
                <p className="text-sm font-medium text-white truncate">
                  {/* truncate cuts off long names with "..." */}
                  {user?.name}
                </p>
                <p className="text-xs text-indigo-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-300 hover:bg-red-900/50 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
