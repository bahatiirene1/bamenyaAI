import { DifyConversation, DifyMessage } from '@/types/chat';

const API_URL = process.env.NEXT_PUBLIC_DIFY_API_URL || 'http://localhost/v1';
const API_KEY = process.env.NEXT_PUBLIC_DIFY_API_KEY || '';

// User context type for AI personalization
export interface UserContextInput {
  user_context?: string;
  preferred_language?: string;
  response_style?: string;
}

export async function sendMessage(
  query: string,
  user: string,
  conversationId?: string,
  onChunk?: (chunk: string) => void,
  inputs?: UserContextInput
): Promise<{ answer: string; conversationId: string; messageId: string }> {
  const requestBody = {
    inputs: inputs || {},
    query,
    user,
    conversation_id: conversationId || '',
    response_mode: 'streaming',
  };

  // Debug: Log the full request
  console.log('[Dify API] Sending request:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${API_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  let fullAnswer = '';
  let finalConversationId = conversationId || '';
  let messageId = '';

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.event === 'message' || parsed.event === 'agent_message') {
              fullAnswer += parsed.answer || '';
              onChunk?.(parsed.answer || '');
            }

            if (parsed.conversation_id) {
              finalConversationId = parsed.conversation_id;
            }

            if (parsed.message_id) {
              messageId = parsed.message_id;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  return {
    answer: fullAnswer,
    conversationId: finalConversationId,
    messageId,
  };
}

export async function getConversations(user: string): Promise<DifyConversation[]> {
  const response = await fetch(
    `${API_URL}/conversations?user=${encodeURIComponent(user)}&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function getMessages(
  conversationId: string,
  user: string
): Promise<DifyMessage[]> {
  const response = await fetch(
    `${API_URL}/messages?conversation_id=${conversationId}&user=${encodeURIComponent(user)}&limit=100`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function deleteConversation(
  conversationId: string,
  user: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/conversations/${conversationId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user }),
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
}

export async function renameConversation(
  conversationId: string,
  name: string,
  user: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/conversations/${conversationId}/name`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, user }),
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
}
