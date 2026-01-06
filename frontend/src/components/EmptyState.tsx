'use client';

import { motion } from 'framer-motion';
import { Sparkles, Zap, Brain, Lightbulb } from 'lucide-react';

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  {
    icon: Lightbulb,
    title: 'Get ideas',
    prompt: 'Help me brainstorm ideas for a new business in Rwanda',
  },
  {
    icon: Brain,
    title: 'Explain concepts',
    prompt: 'Explain how artificial intelligence works in simple terms',
  },
  {
    icon: Zap,
    title: 'Quick help',
    prompt: 'What are the best practices for building a startup?',
  },
];

export default function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
      {/* Logo Animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="
          w-14 h-14 rounded-xl
          rw-gradient
          flex items-center justify-center
          shadow-lg shadow-[var(--rw-blue)]/20
          mb-4
        "
      >
        <Sparkles size={28} className="text-white" />
      </motion.div>

      {/* Welcome Text */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold mb-1 text-center"
      >
        <span className="rw-gradient-text">BamenyaAI</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-[var(--muted-foreground)] mb-6 text-center"
      >
        How can I help you today?
      </motion.p>

      {/* Suggestions - horizontal on desktop */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full"
      >
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={suggestion.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSuggestionClick(suggestion.prompt)}
            className="
              p-3 rounded-xl
              bg-[var(--card)] border border-[var(--border)]
              hover:border-[var(--rw-blue)]/30
              transition-all duration-200
              text-left
            "
          >
            <div className="flex items-center gap-2 mb-1">
              <suggestion.icon size={14} className="text-[var(--rw-blue)]" />
              <span className="font-medium text-xs">{suggestion.title}</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] line-clamp-2">
              {suggestion.prompt}
            </p>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
