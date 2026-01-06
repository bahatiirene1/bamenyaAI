# BamenyaAI

**Rwanda's Intelligent AI Assistant** - A personalized AI chatbot with long-term memory, built for Rwandan users.

![BamenyaAI](https://img.shields.io/badge/Made%20in-Rwanda-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green?style=for-the-badge&logo=supabase)
![Dify](https://img.shields.io/badge/Dify-LLM%20Orchestration-purple?style=for-the-badge)

---

## Features

- **Personalized AI Responses** - AI knows your name, occupation, interests, and goals
- **Long-Term Memory** - Remembers facts from previous conversations
- **Multi-Language Support** - English, Kinyarwanda, French
- **User Authentication** - Secure login/signup with Supabase
- **Beautiful UI** - Modern chat interface with Rwanda-inspired design
- **Streaming Responses** - Real-time typing effect for AI responses
- **Conversation History** - Save and continue past conversations

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BAMENYAAI SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐ │
│  │   Next.js   │───▶│   Dify      │───▶│   LLM (GPT-4/DeepSeek)     │ │
│  │   Frontend  │◀───│   Backend   │◀───│   via OpenRouter           │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────────┘ │
│         │                  │                                            │
│         │                  │                                            │
│         ▼                  ▼                                            │
│  ┌─────────────────────────────────────┐                               │
│  │         Supabase (PostgreSQL)        │                               │
│  │  • User Authentication               │                               │
│  │  • Profiles & Preferences            │                               │
│  │  • User Context (personalization)    │                               │
│  │  • Long-term Memories                │                               │
│  └─────────────────────────────────────┘                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| LLM Orchestration | Dify (self-hosted) |
| LLM Provider | OpenRouter (GPT-4, DeepSeek, Claude) |
| Styling | Tailwind CSS, Framer Motion |
| Deployment | Docker, VPS |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/bamenyaAI.git
cd bamenyaAI
```

### 2. Start Dify (LLM Backend)

```bash
cd dify/docker
docker compose up -d
```

Wait 2-3 minutes for all services to start. Access Dify at `http://localhost`

### 3. Start Supabase (Database)

```bash
cd ../..
npx supabase start
```

Note the output URLs and keys.

### 4. Configure Environment

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local` with your values (see [Environment Variables](#environment-variables))

### 5. Install Dependencies & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

---

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:55321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Dify Configuration
NEXT_PUBLIC_DIFY_API_URL=http://localhost/v1
NEXT_PUBLIC_DIFY_API_KEY=your-dify-api-key
```

### Getting the Keys

**Supabase Keys:**
```bash
npx supabase status
```
Use the `API URL` and `anon key` from the output.

**Dify API Key:**
1. Go to `http://localhost` (Dify)
2. Create an account
3. Create a new Chatflow app
4. Go to API Access → Create API Key

---

## Database Schema

### Tables

#### `profiles`
User profile information synced from auth.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | User ID (from auth) |
| email | TEXT | User email |
| full_name | TEXT | Display name |
| preferred_language | TEXT | en, rw, fr |
| phone | TEXT | Phone number |

#### `user_preferences`
AI behavior preferences.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Foreign key to profiles |
| response_style | TEXT | concise, balanced, detailed |
| theme | TEXT | light, dark, system |
| default_model | TEXT | LLM model preference |

#### `user_context`
Personal context for AI personalization.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Foreign key to profiles |
| occupation | TEXT | Job/profession |
| interests | TEXT[] | Array of interests |
| goals | TEXT | User's goals |
| country | TEXT | Country (default: Rwanda) |
| city | TEXT | City |
| custom_instructions | TEXT | Special AI instructions |

#### `user_memories`
Long-term memory storage.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Foreign key to profiles |
| fact | TEXT | Extracted fact |
| category | TEXT | Category (personal, work, etc.) |
| confidence | FLOAT | Extraction confidence |

---

## Dify Configuration

### 1. Create Chatflow App

1. Login to Dify (`http://localhost`)
2. Create new app → **Chatflow**
3. Name it "BamenyaAI"

### 2. Add Input Variables

In the **Start** node, add these input fields:

| Variable | Type | Max Length |
|----------|------|------------|
| user_context | Paragraph | 2000 |
| preferred_language | Short Text | 10 |
| response_style | Short Text | 20 |

### 3. Configure LLM Node

Add this system prompt to your LLM node:

```
## About You
You are BamenyaAI, a smart and friendly AI assistant built for Rwandan users.

## User Profile
{{#user_context#}}

## Language Preference
The user prefers: {{#preferred_language#}}
- If "rw": Respond primarily in Kinyarwanda
- If "en": Respond in English
- If "fr": Respond in French

## Response Style
Style: {{#response_style#}}
- "concise": Be brief and direct
- "balanced": Clear with moderate detail
- "detailed": Comprehensive with examples

## Guidelines
1. Use the user's name and reference their interests/goals when relevant
2. Follow any custom instructions in their profile
3. Be warm, helpful, and culturally aware of Rwanda
4. When asked "what do you know about me?" - summarize their profile

Remember: You know this user personally. Make them feel understood.
```

### 4. Publish & Get API Key

1. Click **Publish**
2. Go to **API Access** (left sidebar)
3. Create new API key
4. Copy to your `.env.local`

---

## Project Structure

```
bamenyaAI/
├── frontend/                   # Next.js application
│   ├── src/
│   │   ├── app/               # App router pages
│   │   │   ├── page.tsx       # Main chat page
│   │   │   ├── login/         # Login page
│   │   │   ├── signup/        # Signup page
│   │   │   └── settings/      # User settings
│   │   ├── components/        # React components
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ...
│   │   ├── contexts/          # React contexts
│   │   │   └── AuthContext.tsx
│   │   ├── lib/               # Utility functions
│   │   │   ├── supabase.ts    # Supabase client
│   │   │   ├── dify.ts        # Dify API client
│   │   │   └── memory.ts      # Memory functions
│   │   └── types/             # TypeScript types
│   ├── .env.local             # Environment variables
│   └── package.json
├── supabase/
│   └── migrations/            # Database migrations
│       ├── 20250105000001_create_profiles.sql
│       ├── 20250105000002_create_preferences.sql
│       ├── 20250105000003_create_user_context.sql
│       └── 20250106000001_create_memories.sql
├── dify/                      # Dify Docker setup
│   └── docker/
│       └── docker-compose.yaml
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── SETUP.md
└── README.md
```

---

## Development

### Running Locally

```bash
# Terminal 1: Dify
cd dify/docker && docker compose up

# Terminal 2: Supabase
npx supabase start

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Database Migrations

```bash
# Create new migration
npx supabase migration new my_migration_name

# Apply migrations
npx supabase db reset

# View database
npx supabase studio
```

### Type Checking

```bash
cd frontend
npx tsc --noEmit
```

---

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed VPS deployment instructions.

### Quick Deploy Overview

1. **VPS Requirements**: 4GB RAM, 2 CPU, 50GB SSD
2. **Install**: Docker, Node.js, Nginx
3. **Clone repo** and configure environment
4. **Start services** with Docker Compose
5. **Configure Nginx** reverse proxy
6. **Set up SSL** with Let's Encrypt

---

## API Reference

### Dify Chat API

```bash
POST /v1/chat-messages
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "inputs": {
    "user_context": "Name: John\nOccupation: Developer",
    "preferred_language": "en",
    "response_style": "balanced"
  },
  "query": "Hello, who am I?",
  "user": "user-123",
  "conversation_id": "",
  "response_mode": "streaming"
}
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Irene Bahati**
- Location: Rwanda
- Goal: Building Rwanda's smartest AI assistant

---

## Acknowledgments

- [Dify](https://dify.ai) - LLM orchestration platform
- [Supabase](https://supabase.com) - Backend as a Service
- [Next.js](https://nextjs.org) - React framework
- [OpenRouter](https://openrouter.ai) - LLM API gateway
