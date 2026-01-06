# BAKAME AI Platform - Locked In Plan

## Final Decisions

### Stack
| Component | Technology | Location |
|-----------|------------|----------|
| **LLM Provider** | OpenRouter (all models) | External API |
| **Orchestration** | Dify (self-hosted) | VPS → Local Dev |
| **Vector DB** | Weaviate | Local (in Docker) |
| **Database** | PostgreSQL | Local (in Docker) |
| **Cache** | Redis | Local (already have) |
| **Auth/Users** | Supabase | Local Studio → Supabase Cloud |
| **Automations** | n8n | Local (in Docker) |
| **Frontend** | Next.js 14 | Vercel (free) |
| **Reverse Proxy** | Nginx | VPS |
| **CDN/DNS** | Cloudflare | Free tier |

### Costs (Production)
| Item | Monthly Cost |
|------|--------------|
| VPS (16GB/8CPU) | $19 |
| OpenRouter | $200-400 (usage) |
| Vercel | $0 (free tier) |
| Cloudflare | $0 (free tier) |
| Supabase | $0 (free tier) or $25 |
| **TOTAL** | **~$220-450/month** |

### Model Routing Strategy (via OpenRouter)
```
Simple/Internal tasks → deepseek/deepseek-chat ($0.14/M)
Coding agents        → deepseek/deepseek-coder ($0.14/M)
Fast classification  → meta-llama/llama-3.1-8b-instruct ($0.05/M)
User-facing quality  → openai/gpt-4.1 ($2.50/M)
Backup/Alternative   → anthropic/claude-3.5-sonnet ($3/M)
```

### Latency Targets
- Page load: < 150ms (Vercel edge)
- First token: < 700ms (streaming)
- Full response: < 3s

---

## Development Phases

### Phase 1: Local Foundation (Current)
- [x] Docker installed
- [x] Redis running
- [x] Supabase Studio running
- [ ] Dify running locally
- [ ] OpenRouter configured
- [ ] First agent working

### Phase 2: Custom Frontend
- [ ] Next.js 14 project setup
- [ ] Chat UI component
- [ ] Streaming response handler
- [ ] Auth with Supabase
- [ ] Agent selector UI

### Phase 3: Knowledge & Agents
- [ ] Knowledge upload system
- [ ] Multiple agent configs
- [ ] n8n automations
- [ ] Image/Video/Music agents

### Phase 4: Production
- [ ] VPS setup ($19)
- [ ] Domain + SSL (Cloudflare)
- [ ] Deploy backend to VPS
- [ ] Deploy frontend to Vercel
- [ ] Monitoring & backups

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOCAL DEVELOPMENT                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  localhost:3000 (Next.js Frontend)                              │
│       │                                                          │
│       ▼                                                          │
│  localhost:80 (Dify)                                            │
│       │                                                          │
│       ├──► localhost:5432 (PostgreSQL)                          │
│       ├──► localhost:6379 (Redis) ← Already have                │
│       ├──► localhost:8080 (Weaviate)                            │
│       └──► localhost:54321 (Supabase) ← Already have            │
│                                                                  │
│  localhost:5678 (n8n)                                           │
│                                                                  │
│       │                                                          │
│       ▼                                                          │
│  OpenRouter API (external)                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                          ↓ Deploy ↓

┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Vercel (Frontend) ──► VPS $19 (Backend) ──► OpenRouter         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
/home/bahati/
├── bakame/                    # Main project folder
│   ├── dify/                  # Dify (cloned)
│   │   └── docker/
│   │       ├── .env
│   │       └── docker-compose.yml
│   │
│   ├── frontend/              # Next.js app (Vercel-ready)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   ├── package.json
│   │   └── vercel.json
│   │
│   ├── n8n/                   # n8n workflows
│   │   └── docker-compose.yml
│   │
│   └── scripts/               # Utility scripts
│       ├── backup.sh
│       └── deploy.sh
│
├── research.md                # Your research doc
└── project-plan.md            # This file
```
