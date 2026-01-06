'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Sparkles, PanelLeft, PanelLeftClose, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick: () => void;
  conversationName?: string;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({
  onMenuClick,
  conversationName,
  sidebarOpen = true,
  onToggleSidebar
}: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  return (
    <header
      className="
        h-12 px-4
        border-b border-[var(--border)]
        bg-[var(--background)]/80 backdrop-blur-xl
        flex items-center gap-3
        fixed top-0 left-0 right-0 z-30
      "
    >
      {/* Sidebar Toggle (Desktop) */}
      {onToggleSidebar && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleSidebar}
          className="
            hidden md:flex items-center justify-center
            p-1.5 rounded-lg
            hover:bg-[var(--muted)]
            transition-colors
          "
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? (
            <PanelLeftClose size={18} />
          ) : (
            <PanelLeft size={18} />
          )}
        </motion.button>
      )}

      {/* Menu Button (Mobile) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onMenuClick}
        className="
          p-1.5 rounded-lg
          hover:bg-[var(--muted)]
          md:hidden
          transition-colors
        "
      >
        <Menu size={20} />
      </motion.button>

      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg rw-gradient flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
        <span className="font-semibold text-sm rw-gradient-text">BamenyaAI</span>
      </div>

      {/* Conversation Name */}
      <div className="flex-1 flex justify-center">
        {conversationName && (
          <span className="text-xs text-[var(--muted-foreground)] truncate max-w-[180px]">
            {conversationName}
          </span>
        )}
      </div>

      {/* User Menu */}
      {user ? (
        <div className="relative" ref={menuRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="
              flex items-center gap-2
              p-1.5 rounded-lg
              hover:bg-[var(--muted)]
              transition-colors
            "
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
              {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm hidden sm:inline text-[var(--foreground)]">
              {profile?.full_name || user.email?.split('@')[0]}
            </span>
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="
                  absolute right-0 top-full mt-2
                  w-48 py-2
                  bg-[var(--background)] border border-[var(--border)]
                  rounded-lg shadow-lg
                "
              >
                <div className="px-3 py-2 border-b border-[var(--border)]">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {user.email}
                  </p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="
                    flex items-center gap-2 px-3 py-2
                    text-sm text-[var(--foreground)]
                    hover:bg-[var(--muted)]
                    transition-colors
                  "
                >
                  <Settings size={16} />
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="
                    w-full flex items-center gap-2 px-3 py-2
                    text-sm text-red-400
                    hover:bg-[var(--muted)]
                    transition-colors
                  "
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--rw-green)] animate-pulse" />
          <span className="text-xs text-[var(--muted-foreground)] hidden sm:inline">
            Online
          </span>
        </div>
      )}
    </header>
  );
}
