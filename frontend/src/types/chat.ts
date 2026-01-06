export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  // Timing metrics (in milliseconds)
  timeToFirstToken?: number;
  totalTime?: number;
}

export interface Conversation {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DifyResponse {
  event: string;
  conversation_id: string;
  message_id: string;
  answer?: string;
  created_at?: number;
}

export interface DifyConversation {
  id: string;
  name: string;
  inputs: Record<string, unknown>;
  status: string;
  created_at: number;
  updated_at: number;
}

export interface DifyMessage {
  id: string;
  conversation_id: string;
  query: string;
  answer: string;
  created_at: number;
}
