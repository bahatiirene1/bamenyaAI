# BamenyaAI - Claude Code Context

## Project Info
- **Owner**: Irene Bahati
- **Location**: Rwanda
- **Goal**: Build Rwanda's smartest AI assistant

## GitHub Repository
- **URL**: https://github.com/bahatiirene1/bamenyaAI.git
- **Access Token**: (stored securely - ask user if needed)

## Local Development Ports
- **Frontend**: http://localhost:3000
- **Dify**: http://localhost (ports 80, 443)
- **Supabase API**: http://localhost:55321
- **Supabase DB**: localhost:55322
- **Supabase Studio**: http://localhost:55323

## Tech Stack
- Frontend: Next.js 16, React 19, TypeScript, Tailwind
- Auth & DB: Supabase (PostgreSQL)
- LLM Backend: Dify (self-hosted)
- LLM Provider: OpenRouter (GPT-4, DeepSeek)

## Key Features Built
- [x] User authentication (login/signup)
- [x] User profiles & preferences
- [x] AI personalization (context sent to Dify)
- [x] Long-term memory system
- [ ] Tool integration (calculator, weather, search)
- [ ] VPS deployment

## Important Files
- `/frontend/src/app/page.tsx` - Main chat page
- `/frontend/src/lib/dify.ts` - Dify API client
- `/frontend/src/lib/memory.ts` - Memory functions
- `/frontend/src/contexts/AuthContext.tsx` - Auth state
- `/supabase/migrations/` - Database schema
