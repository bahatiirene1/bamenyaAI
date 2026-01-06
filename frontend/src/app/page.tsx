'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import EmptyState from '@/components/EmptyState';
import AuthGuard from '@/components/AuthGuard';
import { Message } from '@/types/chat';
import { DifyConversation } from '@/types/chat';
import {
  sendMessage,
  getConversations,
  getMessages,
  deleteConversation,
  UserContextInput,
} from '@/lib/dify';
import {
  getRelevantMemories,
  formatMemoriesForContext,
  extractFacts,
  saveMemories,
} from '@/lib/memory';
import { useAuth } from '@/contexts/AuthContext';

// Smooth streaming configuration (30% faster)
const CHAR_DELAY = 10; // ms between characters (lower = faster)
const BATCH_SIZE = 3; // characters per tick

function ChatPage() {
  const { user, profile, preferences, userContext } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Start with sidebar open
  const [conversations, setConversations] = useState<DifyConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Use authenticated user ID for conversations
  const userId = user?.id || '';

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Streaming refs for smooth animation
  const bufferRef = useRef<string>('');
  const displayedLengthRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const convs = await getConversations(userId);
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentConversationId || !userId) {
        setMessages([]);
        return;
      }

      try {
        const msgs = await getMessages(currentConversationId, userId);
        // Reverse first (Dify returns newest-first), then flatMap to keep user->assistant order
        const formattedMessages: Message[] = [...msgs]
          .reverse()
          .flatMap((msg) => [
            {
              id: `${msg.id}-user`,
              role: 'user' as const,
              content: msg.query,
              createdAt: new Date(msg.created_at * 1000),
            },
            {
              id: msg.id,
              role: 'assistant' as const,
              content: msg.answer,
              createdAt: new Date(msg.created_at * 1000),
            },
          ]);
        setMessages(formattedMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [currentConversationId, userId]);

  // Scroll when user sends a message (not during streaming)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'user') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Smooth streaming animation loop
  const startSmoothStreaming = useCallback((messageId: string, onUpdate: (text: string) => void) => {
    let lastTime = performance.now();
    console.log('[Animation] Starting smooth streaming for message:', messageId);

    const tick = (currentTime: number) => {
      const elapsed = currentTime - lastTime;

      if (elapsed >= CHAR_DELAY && displayedLengthRef.current < bufferRef.current.length) {
        const charsToAdd = Math.min(
          BATCH_SIZE,
          bufferRef.current.length - displayedLengthRef.current
        );
        displayedLengthRef.current += charsToAdd;
        const displayedText = bufferRef.current.slice(0, displayedLengthRef.current);
        lastTime = currentTime;
        onUpdate(displayedText);
      }

      // Continue if still streaming or buffer not fully displayed
      if (streamingMessageIdRef.current === messageId ||
          displayedLengthRef.current < bufferRef.current.length) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        console.log('[Animation] Streaming complete for message:', messageId);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!userId) return;

    // Start timing
    const startTime = performance.now();
    let firstTokenTime: number | null = null;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder for assistant
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    // Reset streaming state
    bufferRef.current = '';
    displayedLengthRef.current = 0;
    streamingMessageIdRef.current = assistantMessageId;

    setIsLoading(true);
    setIsStreaming(true);

    // Start smooth streaming animation
    startSmoothStreaming(assistantMessageId, (displayedText) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: displayedText }
            : msg
        )
      );
    });

    try {
      // Fetch relevant memories for this query
      console.log('[Memory] ====== FETCHING MEMORIES ======');
      const memories = await getRelevantMemories(userId, content, 10);
      console.log('[Memory] Found', memories.length, 'relevant memories');
      const memoriesContext = formatMemoriesForContext(memories);

      // Build user context for AI personalization
      const inputs: UserContextInput = {};
      const contextParts: string[] = [];

      // Debug: Log what we have
      console.log('[Context] ====== BUILDING USER CONTEXT ======');
      console.log('[Context] Profile:', JSON.stringify(profile, null, 2));
      console.log('[Context] UserContext:', JSON.stringify(userContext, null, 2));
      console.log('[Context] Preferences:', JSON.stringify(preferences, null, 2));
      console.log('[Context] Memories:', memoriesContext);

      if (profile?.full_name) {
        contextParts.push(`Name: ${profile.full_name}`);
        console.log('[Context] Added name:', profile.full_name);
      }
      if (profile?.preferred_language) {
        inputs.preferred_language = profile.preferred_language;
        console.log('[Context] Added language:', profile.preferred_language);
      }
      if (preferences?.response_style) {
        inputs.response_style = preferences.response_style;
        console.log('[Context] Added response_style:', preferences.response_style);
      }
      if (userContext?.occupation) {
        contextParts.push(`Occupation: ${userContext.occupation}`);
        console.log('[Context] Added occupation:', userContext.occupation);
      }
      if (userContext?.interests?.length) {
        contextParts.push(`Interests: ${userContext.interests.join(', ')}`);
        console.log('[Context] Added interests:', userContext.interests);
      }
      if (userContext?.expertise_areas?.length) {
        contextParts.push(`Expertise: ${userContext.expertise_areas.join(', ')}`);
        console.log('[Context] Added expertise:', userContext.expertise_areas);
      }
      if (userContext?.country) {
        contextParts.push(`Location: ${userContext.city || ''} ${userContext.country}`);
        console.log('[Context] Added location:', userContext.city, userContext.country);
      }
      if (userContext?.goals) {
        contextParts.push(`Goals: ${userContext.goals}`);
        console.log('[Context] Added goals:', userContext.goals);
      }
      if (userContext?.custom_instructions) {
        contextParts.push(`Instructions: ${userContext.custom_instructions}`);
        console.log('[Context] Added custom_instructions:', userContext.custom_instructions);
      }

      if (contextParts.length > 0) {
        // Combine profile context with memories
        inputs.user_context = contextParts.join('\n') + memoriesContext;
      } else if (memoriesContext) {
        inputs.user_context = memoriesContext;
      }

      // Debug: Log final inputs
      console.log('[Context] ====== FINAL INPUTS TO DIFY ======');
      console.log('[Context] Context parts count:', contextParts.length);
      console.log('[Context] user_context string:', inputs.user_context);
      console.log('[Context] Full inputs object:', JSON.stringify(inputs, null, 2));

      const result = await sendMessage(
        content,
        userId,
        currentConversationId || undefined,
        (chunk) => {
          // Record time to first token
          if (firstTokenTime === null) {
            firstTokenTime = performance.now();
            const ttft = Math.round(firstTokenTime - startTime);
            console.log('[Stream] First token received, TTFT:', ttft, 'ms');

            // Update TTFT immediately
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, timeToFirstToken: ttft }
                  : msg
              )
            );
          }

          // Add chunk to buffer (smooth streaming will handle display)
          bufferRef.current += chunk;
          console.log('[Stream] Chunk received:', chunk, '| Buffer length:', bufferRef.current.length);
        },
        inputs
      );

      // Calculate total time
      const endTime = performance.now();
      const totalTime = Math.round(endTime - startTime);

      // Mark streaming as complete
      streamingMessageIdRef.current = null;

      // Wait for animation to finish displaying all content
      const waitForAnimation = () => {
        if (displayedLengthRef.current >= bufferRef.current.length) {
          // Update with final content and total time
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: bufferRef.current, totalTime }
                : msg
            )
          );
          setIsStreaming(false);
        } else {
          requestAnimationFrame(waitForAnimation);
        }
      };
      waitForAnimation();

      // Update conversation ID if new
      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId);
        loadConversations();
      }

      // Extract and save facts from this conversation (in background, don't block)
      const fullResponse = bufferRef.current;
      console.log('[Memory] ====== EXTRACTING FACTS ======');
      extractFacts(content, fullResponse, userId).then(({ facts, categories }) => {
        if (facts.length > 0) {
          console.log('[Memory] Extracted facts:', facts);
          saveMemories(userId, facts, categories, result.messageId);
        } else {
          console.log('[Memory] No new facts to save');
        }
      }).catch(err => {
        console.error('[Memory] Extraction failed:', err);
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      streamingMessageIdRef.current = null;
      // Remove the placeholder message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== assistantMessageId)
      );
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (id: string) => {
    if (!userId) return;

    try {
      await deleteConversation(id, userId);
      setConversations((prev) => prev.filter((c) => c.id !== id));

      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - always visible with sidebar toggle */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          conversationName={currentConversation?.name}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Messages or Empty State with centered input */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <EmptyState onSuggestionClick={handleSendMessage} />
            </div>
            <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
          </div>
        ) : (
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto pt-14">
              <div className="max-w-4xl mx-auto px-6 py-4 space-y-4">
                <AnimatePresence mode="popLayout">
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isStreaming={
                        isStreaming &&
                        index === messages.length - 1 &&
                        message.role === 'assistant'
                      }
                    />
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </div>
            {/* Input */}
            <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
          </>
        )}
      </div>
    </div>
  );
}

// Wrap with AuthGuard for protected route
export default function Home() {
  return (
    <AuthGuard>
      <ChatPage />
    </AuthGuard>
  );
}
