'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';
import { DifyConversation } from '@/types/chat';
import { formatDate } from '@/lib/utils';

interface SidebarProps {
  conversations: DifyConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

// Smooth animation variants
const sidebarVariants: Variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
  closed: {
    x: -260,
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
    },
  },
};

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isOpen,
  onClose,
  onToggle,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={isOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className="
          fixed md:relative z-50 md:z-auto
          w-[260px] h-full
          bg-[var(--card)] border-r border-[var(--border)]
          flex flex-col
          shadow-xl shadow-black/5
        "
      >
        {/* Header */}
        <div className="p-3 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              Conversations
            </span>
            {/* Mobile close button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-[var(--muted)] transition-colors md:hidden"
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* Smaller New Chat button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewChat}
            className="
              w-full py-2 px-3
              bg-[var(--rw-blue)] text-white
              rounded-lg font-medium text-sm
              flex items-center justify-center gap-1.5
              hover:opacity-90 transition-opacity
            "
          >
            <Plus size={16} />
            New Chat
          </motion.button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          <AnimatePresence mode="popLayout">
            {conversations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-[var(--muted-foreground)] py-8 text-sm"
              >
                No conversations yet.
                <br />
                Start a new chat!
              </motion.div>
            ) : (
              conversations.map((conv, index) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ x: 2 }}
                  className={`
                    group relative
                    p-2.5 mb-1 rounded-lg cursor-pointer
                    transition-colors duration-150
                    ${
                      currentConversationId === conv.id
                        ? 'bg-[var(--rw-blue)]/10 border border-[var(--rw-blue)]/30'
                        : 'hover:bg-[var(--muted)] border border-transparent'
                    }
                  `}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`
                        p-1.5 rounded-md
                        ${
                          currentConversationId === conv.id
                            ? 'bg-[var(--rw-blue)]/20 text-[var(--rw-blue)]'
                            : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                        }
                      `}
                    >
                      <MessageSquare size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">
                        {conv.name || 'New Conversation'}
                      </p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        {formatDate(conv.updated_at)}
                      </p>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="
                      absolute right-1.5 top-1/2 -translate-y-1/2
                      p-1.5 rounded-md
                      opacity-0 group-hover:opacity-100
                      hover:bg-red-500/10 hover:text-red-500
                      transition-all duration-150
                    "
                  >
                    <Trash2 size={12} />
                  </motion.button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--rw-green)] animate-pulse" />
            <span className="text-[10px] text-[var(--muted-foreground)]">
              Powered by Dify
            </span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
