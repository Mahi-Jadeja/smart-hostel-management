import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { motion } from 'framer-motion';

/**
 * DashboardLayout
 *
 * Wraps all authenticated pages with sidebar + topbar.
 *
 * KEY FIX for full-height sidebar:
 * - Outer wrapper: `h-screen` (NOT min-h-screen)
 *   → Locks the layout to exactly the viewport height
 *   → Prevents the page from growing taller than the screen
 *
 * - `overflow-hidden` on outer wrapper
 *   → Prevents any child from pushing the layout beyond viewport
 *
 * - Sidebar: `h-screen` on the aside element
 *   → Forces sidebar to always be 100% of viewport height
 *
 * - Main content: `overflow-y-auto`
 *   → Only the content area scrolls, not the whole page
 *   → Sidebar stays fixed while content scrolls
 *
 * Why min-h-screen was wrong:
 *   min-h-screen allows the container to GROW beyond viewport.
 *   When it grows, the sidebar (which is h-full) grows too but
 *   the VISIBLE area is only the viewport — so sidebar appears
 *   cut off at the bottom on shorter content pages.
 */
const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    /*
      h-screen + overflow-hidden = lock entire layout to viewport
      flex = side-by-side sidebar and content
    */
    <div className="h-screen overflow-hidden bg-background flex">

      {/*
        SIDEBAR
        The Sidebar component's <aside> has h-screen applied directly
        so it always fills the full viewport height regardless of
        content length.
      */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/*
        MAIN CONTENT AREA
        flex-1       = takes all remaining width after sidebar
        flex-col     = stack topbar + content vertically
        min-w-0      = prevents flex child from overflowing (important!)
        overflow-hidden = clip children, let main scroll independently
      */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/*
          TOP BAR
          sticky + z-30 = stays at top while content scrolls
          shrink-0      = prevents topbar from shrinking when content is tall
        */}
        <header className="h-16 glass-strong border-b border-border sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Right side: theme toggle + user info */}
          <TopBar />
        </header>

        {/*
          PAGE CONTENT
          flex-1        = fills remaining height below topbar
          overflow-y-auto = THIS is what scrolls, not the whole page
          The sidebar stays fixed while only this div scrolls.
        */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gradient-to-br from-background to-secondary/20"
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  );
};

export default DashboardLayout;