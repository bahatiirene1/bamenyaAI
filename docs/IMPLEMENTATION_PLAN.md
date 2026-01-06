# BamenyaAI - Implementation Plan
## Phase 2: Authentication, Personalization & Memory

---

## Current System Overview

### What We Have
```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Next.js Frontend (localhost:3000)                              │
│       │                                                          │
│       ▼                                                          │
│  Dify API (localhost:80)                                        │
│       │                                                          │
│       ├──► PostgreSQL (Dify's DB)                               │
│       ├──► Redis                                                │
│       ├──► Weaviate (Vector DB)                                 │
│       └──► OpenRouter (LLM)                                     │
│                                                                  │
│  Supabase (localhost:54321) ← NOT CONNECTED YET                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### What We're Building
```
┌─────────────────────────────────────────────────────────────────┐
│                     TARGET ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Next.js Frontend                                               │
│       │                                                          │
│       ├──► Supabase Auth (login/signup)                         │
│       │         │                                                │
│       │         ▼                                                │
│       │    Supabase DB (user profiles, memory, preferences)     │
│       │                                                          │
│       └──► Dify API (chat with user context)                    │
│                 │                                                │
│                 ├──► OpenRouter (LLM)                           │
│                 ├──► Weaviate (RAG)                             │
│                 └──► n8n (Tool Orchestration)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 2A: Supabase Authentication
**Priority: HIGH | Effort: 2-3 days**

#### Database Schema
```sql
-- Users table (extends Supabase Auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  preferred_language TEXT DEFAULT 'en', -- 'en', 'rw', 'fr'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

#### Frontend Changes
1. Create `/src/lib/supabase.ts` - Supabase client
2. Create `/src/contexts/AuthContext.tsx` - Auth state management
3. Create `/src/app/login/page.tsx` - Login page
4. Create `/src/app/signup/page.tsx` - Signup page
5. Update `/src/app/page.tsx` - Protected route
6. Update `Header.tsx` - User avatar, logout button

#### Auth Flow
```
1. User visits app → Check Supabase session
2. No session → Redirect to /login
3. Login with email/password or OAuth (Google)
4. On success → Create/update profile
5. Redirect to chat → Pass user_id to Dify API
```

---

### Phase 2B: User Personalization & Preferences
**Priority: HIGH | Effort: 2-3 days**

#### Database Schema
```sql
-- User preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Chat Preferences
  default_model TEXT DEFAULT 'gpt-4.1', -- preferred LLM
  response_style TEXT DEFAULT 'balanced', -- 'concise', 'balanced', 'detailed'
  temperature DECIMAL DEFAULT 0.7,

  -- UI Preferences
  theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
  font_size TEXT DEFAULT 'medium', -- 'small', 'medium', 'large'
  sidebar_collapsed BOOLEAN DEFAULT false,

  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- User context (for AI personalization)
CREATE TABLE public.user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Personal Context
  occupation TEXT,
  interests TEXT[], -- Array of interests
  expertise_areas TEXT[], -- What they know well
  goals TEXT, -- What they want to achieve

  -- Location Context
  country TEXT DEFAULT 'Rwanda',
  city TEXT,
  timezone TEXT DEFAULT 'Africa/Kigali',

  -- Custom Instructions
  custom_instructions TEXT, -- "Always respond in Kinyarwanda first"

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own context"
  ON public.user_context FOR ALL
  USING (auth.uid() = user_id);
```

#### Frontend Changes
1. Create `/src/app/settings/page.tsx` - Settings page
2. Create `/src/components/SettingsPanel.tsx` - Settings UI
3. Update chat to inject user context into system prompt

#### How Context Flows to AI
```typescript
// When sending a message to Dify, include user context
const systemContext = `
User Profile:
- Name: ${user.full_name}
- Language: ${preferences.preferred_language}
- Response Style: ${preferences.response_style}
- Occupation: ${context.occupation}
- Interests: ${context.interests.join(', ')}
- Custom Instructions: ${context.custom_instructions}

Location: ${context.city}, ${context.country}
Timezone: ${context.timezone}
`;

// Send to Dify with inputs
await sendMessage(query, userId, conversationId, {
  inputs: {
    user_context: systemContext
  }
});
```

---

### Phase 2C: Long-Term Memory System
**Priority: HIGH | Effort: 3-4 days**

#### Memory Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                     MEMORY SYSTEM                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CONVERSATION MEMORY (Dify native)                           │
│     └─► Stored per conversation_id                              │
│     └─► Short-term, within conversation                         │
│                                                                  │
│  2. EPISODIC MEMORY (Supabase)                                  │
│     └─► Key facts extracted from conversations                  │
│     └─► "User mentioned they work at Bank of Kigali"           │
│     └─► Persists across conversations                           │
│                                                                  │
│  3. SEMANTIC MEMORY (Weaviate)                                  │
│     └─► Vector embeddings of important exchanges                │
│     └─► Similarity search for relevant past context             │
│                                                                  │
│  4. PROCEDURAL MEMORY (Supabase)                                │
│     └─► User's preferred workflows                              │
│     └─► "When I ask about weather, include advice"              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Schema
```sql
-- Episodic Memory: Facts extracted from conversations
CREATE TABLE public.memory_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Memory Content
  content TEXT NOT NULL, -- The fact/memory
  category TEXT, -- 'personal', 'work', 'preference', 'fact'
  importance INTEGER DEFAULT 5, -- 1-10 scale

  -- Source
  conversation_id TEXT, -- Dify conversation ID
  message_id TEXT, -- Source message

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,

  -- For semantic search
  embedding VECTOR(1536) -- OpenAI embedding
);

-- Index for vector similarity search
CREATE INDEX idx_memory_embedding ON public.memory_episodes
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Conversation summaries for long conversations
CREATE TABLE public.conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,

  summary TEXT NOT NULL,
  key_topics TEXT[],
  message_count INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(conversation_id)
);

-- RLS
ALTER TABLE public.memory_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own memories"
  ON public.memory_episodes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own summaries"
  ON public.conversation_summaries FOR ALL
  USING (auth.uid() = user_id);
```

#### Memory Extraction Flow
```
1. User sends message → AI responds
2. After response, run memory extraction (async):
   - Use LLM to identify important facts
   - Extract: "User works at Bank of Kigali"
   - Store in memory_episodes with embedding
3. Before next message:
   - Query relevant memories via vector search
   - Inject into system prompt
```

#### Memory Extraction Prompt
```typescript
const MEMORY_EXTRACTION_PROMPT = `
Analyze this conversation and extract important facts about the user.
Only extract FACTS, not opinions or transient information.

Examples of good facts:
- "User works at Bank of Kigali as a software engineer"
- "User's wife is named Diane"
- "User prefers responses in Kinyarwanda"
- "User is building an AI platform called BamenyaAI"

Examples of BAD facts (don't extract):
- "User asked about the weather" (transient)
- "User seems happy" (opinion)
- "User said hello" (trivial)

Conversation:
${conversation}

Return JSON array of facts:
[{"content": "fact text", "category": "personal|work|preference|fact", "importance": 1-10}]
`;
```

---

### Phase 2D: n8n Tool Orchestration
**Priority: MEDIUM | Effort: 3-4 days**

#### n8n Setup
```bash
# Add n8n to docker-compose or run separately
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=secure_password \
  n8nio/n8n
```

#### Initial Tools to Build
```yaml
Tool 1: Web Search
  - Trigger: Dify calls tool
  - Action: Search Google/Bing
  - Return: Search results

Tool 2: Weather
  - Trigger: Dify calls tool
  - Action: Call OpenWeatherMap API
  - Return: Weather for Kigali/Rwanda

Tool 3: Send Email
  - Trigger: Dify calls tool
  - Action: Send email via SMTP
  - Return: Confirmation

Tool 4: Create Reminder
  - Trigger: Dify calls tool
  - Action: Store in Supabase, schedule notification
  - Return: Confirmation

Tool 5: Image Generation
  - Trigger: Dify calls tool
  - Action: Call DALL-E/Stable Diffusion
  - Return: Image URL
```

#### Dify Tool Configuration
```yaml
# In Dify: Tools > Custom > Import OpenAPI
openapi: "3.1.0"
info:
  title: "BamenyaAI Tools"
  version: "1.0.0"
servers:
  - url: "http://n8n:5678/webhook"
paths:
  /web-search:
    post:
      operationId: webSearch
      summary: "Search the web for information"
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                query:
                  type: string
                  description: "Search query"
              required: [query]
      responses:
        '200':
          description: "Search results"
```

---

## File Structure After Implementation

```
/home/bahati/bamenyaAI/
├── docs/
│   ├── research.md
│   ├── project-plan.md
│   └── IMPLEMENTATION_PLAN.md (this file)
│
├── dify/                        # Dify (existing)
│   └── docker/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Chat (protected)
│   │   │   ├── login/page.tsx   # NEW: Login
│   │   │   ├── signup/page.tsx  # NEW: Signup
│   │   │   ├── settings/page.tsx # NEW: Settings
│   │   │   └── layout.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── Header.tsx       # UPDATE: User menu
│   │   │   ├── Sidebar.tsx
│   │   │   ├── AuthGuard.tsx    # NEW: Route protection
│   │   │   └── SettingsPanel.tsx # NEW: Settings UI
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # NEW: Auth state
│   │   │
│   │   ├── lib/
│   │   │   ├── supabase.ts      # NEW: Supabase client
│   │   │   ├── dify.ts          # UPDATE: Add user context
│   │   │   ├── memory.ts        # NEW: Memory operations
│   │   │   └── utils.ts
│   │   │
│   │   └── types/
│   │       ├── chat.ts
│   │       └── user.ts          # NEW: User types
│   │
│   └── .env.local               # UPDATE: Add Supabase keys
│
├── supabase/                    # NEW: Supabase config
│   ├── migrations/
│   │   ├── 001_profiles.sql
│   │   ├── 002_preferences.sql
│   │   ├── 003_memory.sql
│   │   └── 004_context.sql
│   └── config.toml
│
└── n8n/                         # NEW: n8n workflows
    └── docker-compose.yml
```

---

## Implementation Order

### Week 1: Authentication
```
Day 1-2:
  [ ] Create Supabase migration for profiles table
  [ ] Set up Supabase client in frontend
  [ ] Create AuthContext

Day 3-4:
  [ ] Build login page
  [ ] Build signup page
  [ ] Add AuthGuard for protected routes

Day 5:
  [ ] Update Header with user menu
  [ ] Add logout functionality
  [ ] Test full auth flow
```

### Week 2: Personalization & Memory
```
Day 1-2:
  [ ] Create preferences and context tables
  [ ] Build settings page UI
  [ ] Implement preference saving/loading

Day 3-4:
  [ ] Create memory tables
  [ ] Build memory extraction service
  [ ] Implement memory injection into prompts

Day 5:
  [ ] Test memory across conversations
  [ ] Optimize memory retrieval
```

### Week 3: Tool Orchestration
```
Day 1-2:
  [ ] Set up n8n locally
  [ ] Create first workflow (web search)
  [ ] Connect to Dify via webhooks

Day 3-4:
  [ ] Build additional tools (weather, email)
  [ ] Test tool calling from chat

Day 5:
  [ ] Polish and bug fixes
  [ ] Documentation
```

---

## Questions Before Starting

1. **Auth Method**: Email/password only, or also Google/GitHub OAuth?
2. **Memory Aggressiveness**: Extract facts after every message, or only on explicit saves?
3. **Tool Priority**: Which tools are most important for MVP?
4. **Supabase**: Use existing BAAP Supabase instance or create new project for BamenyaAI?

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase schema conflicts with BAAP | Medium | Use separate schema/project |
| Memory extraction latency | Low | Run async, don't block responses |
| n8n tool failures | Medium | Graceful fallbacks, retry logic |
| Token/session management complexity | Medium | Use Supabase Auth best practices |

---

## Success Metrics

- [ ] Users can sign up and log in
- [ ] User preferences persist across sessions
- [ ] AI remembers facts from previous conversations
- [ ] At least 3 tools working via n8n
- [ ] Settings page fully functional
