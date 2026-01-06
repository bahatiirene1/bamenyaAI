# BamenyaAI Local Development Setup

Step-by-step guide to set up BamenyaAI for local development.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download](https://git-scm.com/)
- **VS Code** (recommended) - [Download](https://code.visualstudio.com/)

Verify installations:

```bash
node --version    # Should be 18+
docker --version  # Should be 20+
git --version     # Any recent version
```

---

## Step 1: Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/bamenyaAI.git
cd bamenyaAI
```

---

## Step 2: Start Dify (LLM Backend)

Dify handles AI conversations and LLM orchestration.

### 2.1 Navigate to Dify Directory

```bash
cd dify/docker
```

### 2.2 Start Dify Services

```bash
docker compose up -d
```

This starts ~10 containers. Wait 2-3 minutes for initialization.

### 2.3 Verify Dify is Running

```bash
docker compose ps
```

All containers should show "Up" status.

### 2.4 Access Dify

Open http://localhost in your browser.

### 2.5 Create Dify Account

1. Click "Sign Up"
2. Create admin account (first user becomes admin)
3. Login to dashboard

### 2.6 Create BamenyaAI App

1. Click **"Create from Blank"**
2. Select **"Chatflow"**
3. Name it **"BamenyaAI"**
4. Click **Create**

### 2.7 Configure Start Node

Click on the **Start** node and add input fields:

| Field Name | Type | Max Length |
|------------|------|------------|
| user_context | Paragraph | 2000 |
| preferred_language | Short Text | 10 |
| response_style | Short Text | 20 |

### 2.8 Configure LLM Node

1. Click on the **LLM** node
2. Select model: **GPT-4.1** (via OpenRouter) or your preferred model
3. In **System Prompt**, paste:

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
4. When asked "what do you know about me?" - summarize their profile warmly

Remember: You know this user personally. Make them feel understood.
```

### 2.9 Configure Model Provider

1. Go to **Settings** (gear icon) → **Model Providers**
2. Add **OpenRouter**:
   - Get API key from [openrouter.ai](https://openrouter.ai)
   - Paste key and save

### 2.10 Publish & Get API Key

1. Click **Publish** (top right)
2. Go to **API Access** (left sidebar)
3. Click **Create API Key**
4. Copy the key (starts with `app-`)

**Save this key - you'll need it for the frontend!**

---

## Step 3: Start Supabase (Database)

Supabase provides PostgreSQL database and authentication.

### 3.1 Navigate to Project Root

```bash
cd ../..  # Back to bamenyaAI root
```

### 3.2 Install Supabase CLI (if not installed)

```bash
npm install -g supabase
```

### 3.3 Start Supabase

```bash
npx supabase start
```

First run downloads Docker images (~5 minutes).

### 3.4 Note the Output

You'll see output like:

```
Started supabase local development setup.

         API URL: http://localhost:55321
     GraphQL URL: http://localhost:55321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:55322/postgres
      Studio URL: http://localhost:55323
    Inbucket URL: http://localhost:55324
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Save the API URL and anon key!**

### 3.5 Access Supabase Studio

Open http://localhost:55323 to view your database.

---

## Step 4: Configure Frontend

### 4.1 Navigate to Frontend

```bash
cd frontend
```

### 4.2 Install Dependencies

```bash
npm install
```

### 4.3 Create Environment File

```bash
cp .env.example .env.local
```

### 4.4 Edit Environment Variables

Open `.env.local` in your editor:

```env
# Supabase - from step 3.4
NEXT_PUBLIC_SUPABASE_URL=http://localhost:55321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Dify - from step 2.10
NEXT_PUBLIC_DIFY_API_URL=http://localhost/v1
NEXT_PUBLIC_DIFY_API_KEY=app-xxxxxxxxxxxxx
```

### 4.5 Start Development Server

```bash
npm run dev
```

### 4.6 Access Application

Open http://localhost:3000

---

## Step 5: Create Account & Test

### 5.1 Sign Up

1. Go to http://localhost:3000/signup
2. Enter email, password, name
3. Click Sign Up

### 5.2 Configure Profile

1. Click profile icon → Settings
2. Fill in your profile:
   - Name
   - Preferred language
3. Go to **AI Context** tab:
   - Add occupation
   - Add interests (click + to add)
   - Add goals
   - Add custom instructions
4. Click **Save Changes**

### 5.3 Test Chat

1. Go to home page
2. Start a new chat
3. Say: "Hello, who am I?"
4. The AI should know your name, occupation, interests!

### 5.4 Test Memory

1. Tell the AI something: "My favorite color is blue"
2. Start a NEW conversation
3. Ask: "What's my favorite color?"
4. The AI should remember!

---

## Troubleshooting

### Dify won't start

```bash
# Check logs
cd dify/docker
docker compose logs -f

# Restart
docker compose down
docker compose up -d
```

### Supabase won't start

```bash
# Check Docker is running
docker ps

# Stop and restart
npx supabase stop
npx supabase start
```

### Can't connect to database

```bash
# Verify Supabase is running
npx supabase status

# Check connection
PGPASSWORD=postgres psql -h localhost -p 55322 -U postgres -d postgres
```

### Auth not working

1. Check Supabase Studio: http://localhost:55323
2. Go to Authentication → Users
3. Verify user exists

### AI doesn't know user context

1. Check browser console for `[Context]` logs
2. Verify Dify input variables are configured
3. Verify system prompt uses `{{#user_context#}}`

---

## Development Commands

```bash
# Frontend
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run linter
npx tsc --noEmit # Type check

# Supabase
npx supabase start   # Start Supabase
npx supabase stop    # Stop Supabase
npx supabase status  # Check status
npx supabase db reset # Reset database (apply migrations)
npx supabase studio  # Open database GUI

# Dify
cd dify/docker
docker compose up -d    # Start
docker compose down     # Stop
docker compose logs -f  # View logs
docker compose ps       # Check status

# Database
PGPASSWORD=postgres psql -h localhost -p 55322 -U postgres -d postgres
```

---

## Next Steps

After setup is complete:

1. **Learn Dify workflows** - Add tools like calculator, web search
2. **Customize UI** - Update colors, logo, branding
3. **Add features** - Voice input, file upload, etc.
4. **Deploy** - See [DEPLOYMENT.md](./DEPLOYMENT.md)
