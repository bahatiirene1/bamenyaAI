# BamenyaAI Architecture

Technical architecture documentation for BamenyaAI.

---

## System Overview

BamenyaAI is a three-tier application:

1. **Frontend** - Next.js React application
2. **LLM Backend** - Dify orchestration platform
3. **Database** - Supabase (PostgreSQL)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                   │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS FRONTEND (:3000)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Chat Page  │  │ Login/Signup│  │  Settings   │  │  Sidebar    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                      AUTH CONTEXT                                │       │
│  │  • User session management                                       │       │
│  │  • Profile, preferences, context state                          │       │
│  └─────────────────────────────────────────────────────────────────┘       │
└───────────────┬─────────────────────────────────────┬───────────────────────┘
                │                                     │
                ▼                                     ▼
┌───────────────────────────────────┐  ┌─────────────────────────────────────┐
│      SUPABASE (:55321-55327)      │  │         DIFY (:80, :443)            │
│  ┌─────────────────────────────┐  │  │  ┌─────────────────────────────┐   │
│  │     PostgreSQL Database     │  │  │  │      Chatflow Engine        │   │
│  │  • auth.users               │  │  │  │  • Input variables          │   │
│  │  • profiles                 │  │  │  │  • LLM node (GPT-4)         │   │
│  │  • user_preferences         │  │  │  │  • System prompt            │   │
│  │  • user_context             │  │  │  └─────────────────────────────┘   │
│  │  • user_memories            │  │  │                │                   │
│  └─────────────────────────────┘  │  │                ▼                   │
│  ┌─────────────────────────────┐  │  │  ┌─────────────────────────────┐   │
│  │     Supabase Auth           │  │  │  │      OpenRouter API         │   │
│  │  • Email/Password           │  │  │  │  • GPT-4.1                  │   │
│  │  • Session management       │  │  │  │  • DeepSeek                 │   │
│  │  • Row Level Security       │  │  │  │  • Claude                   │   │
│  └─────────────────────────────┘  │  │  └─────────────────────────────┘   │
└───────────────────────────────────┘  └─────────────────────────────────────┘
```

---

## Data Flow

### 1. Authentication Flow

```
User → Login Page → Supabase Auth → JWT Token → AuthContext → Protected Routes
```

1. User enters email/password
2. Supabase validates credentials
3. Returns JWT session token
4. AuthContext stores user state
5. User can access protected routes

### 2. Chat Message Flow

```
User Input → Build Context → Fetch Memories → Send to Dify → Stream Response → Extract Facts → Save Memories
```

1. **User sends message**
2. **Build context**: Combine profile + preferences + user_context
3. **Fetch memories**: Query user_memories for relevant facts
4. **Send to Dify**: POST /v1/chat-messages with inputs
5. **Stream response**: Display typing animation
6. **Extract facts**: LLM extracts new facts from conversation
7. **Save memories**: Store in user_memories table

### 3. Memory Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY EXTRACTION                            │
├─────────────────────────────────────────────────────────────────┤
│  User: "My dog's name is Keza"                                  │
│                    ↓                                            │
│  AI responds with acknowledgment                                │
│                    ↓                                            │
│  extractFacts(userMessage, aiResponse)                          │
│                    ↓                                            │
│  LLM extracts: {fact: "Has a dog named Keza", category: "pets"} │
│                    ↓                                            │
│  saveMemories() → INSERT into user_memories                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY RETRIEVAL                             │
├─────────────────────────────────────────────────────────────────┤
│  User: "What's my dog's name?"                                  │
│                    ↓                                            │
│  getRelevantMemories(userId, query)                             │
│                    ↓                                            │
│  Text search: "dog" matches "Has a dog named Keza"              │
│                    ↓                                            │
│  formatMemoriesForContext() → Add to user_context               │
│                    ↓                                            │
│  AI sees: "Remembered Facts: Pets: Has a dog named Keza"        │
│                    ↓                                            │
│  AI responds: "Your dog's name is Keza!"                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│   auth.users    │       │    profiles     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──────▶│ id (PK, FK)     │
│ email           │       │ email           │
│ encrypted_pass  │       │ full_name       │
│ created_at      │       │ preferred_lang  │
└─────────────────┘       │ phone           │
                          │ avatar_url      │
                          └────────┬────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│user_preferences │  │  user_context   │  │  user_memories  │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ id (PK)         │  │ id (PK)         │  │ id (PK)         │
│ user_id (FK)    │  │ user_id (FK)    │  │ user_id (FK)    │
│ response_style  │  │ occupation      │  │ fact            │
│ theme           │  │ interests[]     │  │ category        │
│ default_model   │  │ goals           │  │ confidence      │
│ font_size       │  │ country         │  │ source_msg_id   │
│ temperature     │  │ city            │  │ created_at      │
│ email_notifs    │  │ custom_instruct │  │ last_referenced │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Row Level Security (RLS)

All tables have RLS enabled. Users can only access their own data:

```sql
-- Example policy
CREATE POLICY "Users can manage own data"
  ON public.user_memories FOR ALL
  USING (auth.uid() = user_id);
```

---

## Frontend Architecture

### Component Hierarchy

```
App (layout.tsx)
└── AuthProvider
    └── Page Components
        ├── Home (page.tsx)
        │   └── AuthGuard
        │       └── ChatPage
        │           ├── Sidebar
        │           ├── Header
        │           ├── EmptyState / ChatMessage[]
        │           └── ChatInput
        ├── Login (login/page.tsx)
        ├── Signup (signup/page.tsx)
        └── Settings (settings/page.tsx)
            └── AuthGuard
                └── SettingsForm (tabs)
```

### State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTH CONTEXT                               │
├─────────────────────────────────────────────────────────────────┤
│  State:                                                         │
│  • user: User | null                                            │
│  • session: Session | null                                      │
│  • profile: Profile | null                                      │
│  • preferences: UserPreferences | null                          │
│  • userContext: UserContext | null                              │
│  • loading: boolean                                             │
│                                                                 │
│  Methods:                                                       │
│  • signIn(email, password)                                      │
│  • signUp(email, password, fullName)                            │
│  • signOut()                                                    │
│  • refreshProfile()                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Libraries

| Library | Purpose |
|---------|---------|
| `@supabase/ssr` | Supabase client for SSR |
| `framer-motion` | Animations |
| `lucide-react` | Icons |
| `react-markdown` | Markdown rendering |
| `react-syntax-highlighter` | Code highlighting |

---

## Dify Configuration

### Chatflow Structure

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Start  │────▶│   LLM   │────▶│   End   │
└─────────┘     └─────────┘     └─────────┘
     │
     │ Input Variables:
     │ • user_context
     │ • preferred_language
     │ • response_style
```

### Input Variables

| Variable | Type | Description |
|----------|------|-------------|
| user_context | Paragraph | User profile + memories |
| preferred_language | String | en, rw, fr |
| response_style | String | concise, balanced, detailed |

### System Prompt Template

The LLM node uses a system prompt that references input variables:

```
{{#user_context#}}      → Replaced with user profile + memories
{{#preferred_language#}} → Replaced with language preference
{{#response_style#}}     → Replaced with style preference
```

---

## API Endpoints

### Supabase (via client library)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Sign Up | POST | /auth/v1/signup |
| Sign In | POST | /auth/v1/token |
| Get Profile | GET | /rest/v1/profiles |
| Update Profile | PATCH | /rest/v1/profiles |
| Get Memories | GET | /rest/v1/user_memories |

### Dify

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Send Message | POST | /v1/chat-messages |
| Get Conversations | GET | /v1/conversations |
| Get Messages | GET | /v1/messages |
| Delete Conversation | DELETE | /v1/conversations/:id |

---

## Security Considerations

### Authentication
- Passwords hashed with bcrypt (Supabase)
- JWT tokens for session management
- Tokens stored in httpOnly cookies

### Database Security
- Row Level Security on all tables
- Users can only access their own data
- API keys never exposed to client

### API Security
- Supabase anon key has limited permissions
- Dify API key stored server-side (in env)
- CORS configured for allowed origins

---

## Performance Optimizations

### Frontend
- React Server Components where possible
- Streaming responses for fast TTFT
- Smooth character-by-character animation
- Memoized Supabase client (singleton)

### Database
- Indexes on frequently queried columns
- Full-text search index for memories
- Connection pooling via Supabase

### Caching
- Supabase client caches session
- Conversations cached in React state
- Memories fetched on-demand

---

## Future Improvements

1. **Vector Search for Memories** - Use pgvector for semantic memory retrieval
2. **Tool Integration** - Add calculator, web search, weather tools
3. **Voice Input/Output** - Speech-to-text and text-to-speech
4. **Mobile App** - React Native version
5. **Multi-tenant** - Support for organizations
6. **Analytics** - Usage tracking and insights
