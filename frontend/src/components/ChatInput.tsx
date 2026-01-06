'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="p-3 bg-[var(--background)]"
    >
      <div
        className="
          max-w-4xl mx-auto
          flex items-end gap-2
          p-1.5 rounded-xl
          bg-[var(--card)] border border-[var(--border)]
          focus-within:border-[var(--rw-blue)]/50
          focus-within:shadow-md focus-within:shadow-[var(--rw-blue)]/5
          transition-all duration-200
        "
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message BamenyaAI..."
          disabled={disabled}
          rows={1}
          className="
            flex-1 px-3 py-2
            bg-transparent
            resize-none
            text-sm
            placeholder:text-[var(--muted-foreground)]
            focus:outline-none
            disabled:opacity-50
          "
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading || disabled}
          className="
            p-2.5 rounded-lg
            bg-[var(--rw-blue)] text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:opacity-90
            transition-opacity
          "
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </motion.button>
      </div>

      <p className="text-center text-[10px] text-[var(--muted-foreground)] mt-1.5">
        BamenyaAI can make mistakes
      </p>
    </motion.div>
  );
}
