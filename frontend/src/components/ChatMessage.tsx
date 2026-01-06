'use client';

import { motion } from 'framer-motion';
import { User, Sparkles, Zap, Clock, Timer } from 'lucide-react';
import { Message } from '@/types/chat';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Format TTFT with color coding
  const getTTFTColor = (ttft: number) => {
    if (ttft < 1000) return 'text-[var(--rw-green)] bg-[var(--rw-green)]/10';
    if (ttft < 2000) return 'text-[var(--rw-yellow)] bg-[var(--rw-yellow)]/10';
    return 'text-orange-500 bg-orange-500/10';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-lg
          flex items-center justify-center
          ${
            isUser
              ? 'bg-[var(--muted)]'
              : 'rw-gradient'
          }
        `}
      >
        {isUser ? (
          <User size={16} className="text-[var(--muted-foreground)]" />
        ) : (
          <Sparkles size={16} className="text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${isUser ? 'max-w-[75%]' : 'max-w-[90%]'} ${isUser ? 'text-right' : ''}`}>
        <div
          className={`
            inline-block px-3 py-2 rounded-xl
            ${
              isUser
                ? 'bg-[var(--rw-blue)] text-white rounded-tr-sm'
                : 'bg-[var(--card)] border border-[var(--border)] rounded-tl-sm text-left'
            }
            ${!isUser && isStreaming ? 'streaming-message' : ''}
          `}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <MarkdownRenderer
              content={message.content}
              isStreaming={isStreaming}
            />
          )}
        </div>

        {/* Timestamp and Metrics - compact */}
        <div
          className={`flex flex-wrap items-center gap-1.5 mt-1 px-0.5 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
          {/* Time */}
          <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-0.5">
            <Clock size={9} />
            {message.createdAt.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {/* TTFT Badge for Assistant */}
          {!isUser && message.timeToFirstToken && (
            <span
              className={`
                text-[10px] flex items-center gap-0.5
                px-1.5 py-0.5 rounded-full font-medium
                ${getTTFTColor(message.timeToFirstToken)}
              `}
            >
              <Zap size={9} />
              {message.timeToFirstToken < 1000
                ? `${message.timeToFirstToken}ms`
                : `${(message.timeToFirstToken / 1000).toFixed(1)}s`
              }
            </span>
          )}

          {/* Total Time Badge */}
          {!isUser && message.totalTime && !isStreaming && (
            <span className="text-[10px] flex items-center gap-0.5 text-[var(--muted-foreground)]">
              <Timer size={9} />
              {(message.totalTime / 1000).toFixed(1)}s
            </span>
          )}

          {/* Streaming indicator */}
          {!isUser && isStreaming && (
            <span className="text-[10px] text-[var(--rw-blue)] flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[var(--rw-blue)] animate-pulse" />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
