import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

// Navigation items for student role
const studentNavItems = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/profile', label: 'Profile', icon: User },
  { to: '/student/room', label: 'My Room', icon: BedDouble },
  { to: '/student/room-preference', label: 'Preferences', icon: Users },
  { to: '/student/complaints', label: 'Complaints', icon: ClipboardList },
  { to: '/student/outpass', label: 'Outpass', icon: FileText },
  { to: '/student/payments', label: 'Payments', icon: CreditCard },
];

/**
 * Admin navigation items.
 * Students link added between Dashboard and Room Layout.
 * Allows admin to view all students, allocate/deallocate rooms,
 * and see room preference requests from one place.
 */
const adminNavItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/students', label: 'Students', icon: Users },      // NEW
  { to: '/admin/rooms', label: 'Room Layout', icon: BedDouble },
  { to: '/admin/complaints', label: 'Complaints', icon: ClipboardList },
  { to: '/admin/outpass', label: 'Outpass', icon: FileText },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
];

/**
 * Sidebar Component
 *
 * KEY FIX: Uses CSS classes (not Framer Motion animate) for slide
 * behavior so Tailwind's lg:translate-x-0 is never overridden.
 *
 * On mobile (<lg): translates in/out via isOpen prop
 * On desktop (lg+): always visible via lg:translate-x-0 + lg:static
 */
const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Pick nav items based on user role
  const navItems = user?.role === 'admin' ? adminNavItems : studentNavItems;

  // Render minimal sidebar while user data loads
  if (!user) {
    return (
      <aside className="hidden lg:flex fixed lg:static top-0 left-0 z-50 h-full w-[280px] bg-slate-950 border-r border-white/10 items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </aside>
    );
  }

  return (
    <>
      {/* ======== MOBILE OVERLAY ======== */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ======== SIDEBAR ======== */}
      {/*
        IMPORTANT: CSS classes handle the mobile slide (not Framer Motion).
        This prevents Framer Motion's inline transform from overriding
        Tailwind's lg:translate-x-0.
      */}
      <aside
        className={`
          fixed top-0 left-0 z-50
          h-screen
          bg-slate-950 border-r border-white/10
          flex flex-col shadow-2xl
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
          ${collapsed ? 'w-20' : 'w-[280px]'}
      `}
>
        {/* ---- HEADER ---- */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 h-16 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* App logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
              <Building2 className="w-6 h-6 text-white" />
            </div>

            {/* App name — hidden when collapsed */}
            {!collapsed && (
              <span className="font-bold text-white text-lg whitespace-nowrap">
                IntelliHostel
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Collapse sidebar — desktop only */}
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="hidden lg:flex p-1.5 rounded-md hover:bg-white/10 text-slate-400 transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {/* Close — mobile only */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-md hover:bg-white/10 text-slate-400"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ---- EXPAND BUTTON (collapsed state, desktop) ---- */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-blue-600 rounded-full items-center justify-center text-white shadow-lg z-50 hover:bg-blue-500 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}

        {/* ---- NAVIGATION ---- */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose} // Close mobile sidebar on link click
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                transition-all duration-200 group relative
                ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/25'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              {/* Nav icon — always visible */}
              <item.icon className="w-5 h-5 shrink-0" />

              {/* Nav label — hidden when collapsed */}
              {!collapsed && (
                <span className="whitespace-nowrap">{item.label}</span>
              )}

              {/* Tooltip — shows on hover in collapsed mode */}
              {collapsed && (
                <div className="
                  absolute left-full ml-2 px-2 py-1
                  bg-slate-800 text-white text-xs rounded
                  opacity-0 group-hover:opacity-100
                  pointer-events-none whitespace-nowrap z-[60]
                  shadow-lg border border-white/10
                  transition-opacity duration-200
                ">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ---- USER INFO + LOGOUT ---- */}
        <div className="p-4 border-t border-white/10 shrink-0">
          {/* User info */}
          <div className={`
            flex items-center gap-3 mb-3 p-2 rounded-xl bg-white/5
            ${collapsed ? 'justify-center' : ''}
          `}>
            {/* Avatar with gradient */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {/* Name + role — hidden when collapsed */}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-slate-400 truncate capitalize">
                  {user?.role || 'student'}
                </p>
              </div>
            )}
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            className={`
              flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
              text-slate-400 hover:bg-red-500/10 hover:text-red-400
              transition-all group relative
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Logout</span>}

            {/* Tooltip for collapsed logout */}
            {collapsed && (
              <div className="
                absolute left-full ml-2 px-2 py-1
                bg-slate-800 text-white text-xs rounded
                opacity-0 group-hover:opacity-100
                pointer-events-none whitespace-nowrap z-[60]
                shadow-lg border border-white/10
                transition-opacity duration-200
              ">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;