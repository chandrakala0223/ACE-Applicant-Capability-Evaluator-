# TalentOS AI

An enterprise AI-powered recruitment platform — full-stack pnpm monorepo.

## Architecture

| Package | Path | Description |
|---|---|---|
| Frontend (React + Vite) | `artifacts/talent-os` | Recruiter portal & public job board |
| Backend (Express) | `artifacts/api-server` | REST API, AI workflows, file uploads |
| API client (React) | `lib/api-client-react` | Generated React Query hooks |
| API spec | `lib/api-spec` | OpenAPI 3.1 spec |
| API zod schemas | `lib/api-zod` | Zod validators generated from spec |
| DB models | `lib/db` | Drizzle ORM schema |

## Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS 4, shadcn/ui, TanStack Query, Wouter, React Flow, Framer Motion
- **Backend**: Express 5, TypeScript, LangChain / LangGraph AI workflows
- **Databases**: MongoDB Atlas (documents), Qdrant (vector search)
- **AI**: Groq (LLM), OpenRouter (LLM), LangChain agents
- **Auth**: JWT (bcryptjs + jsonwebtoken)
- **Email**: Resend

## Running Locally

```bash
# Install all dependencies
pnpm install

# Start frontend (dev server)
pnpm --filter @workspace/talent-os run dev

# Start backend (build + start)
pnpm --filter @workspace/api-server run dev
```

Workflows are pre-configured in Replit — just hit **Run**.

## Required Secrets

| Secret | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string for signing JWTs |
| `GROQ_API_KEY` | Groq LLM API key |
| `OPENROUTER_API_KEY` | OpenRouter LLM API key |
| `QDRANT_URL` | Qdrant cluster URL |
| `QDRANT_API_KEY` | Qdrant API key |
| `RESEND_API_KEY` | Resend email API key |

## MongoDB Atlas — IP Whitelist

Replit uses dynamic IPs. In your MongoDB Atlas project:
**Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)**

## Public Portal

The public job board (no login required) is at `/public`.  
Candidates apply at `/apply/:jobId` and see processing status at `/apply/:jobId/processing/:workflowId`.

## AI Workflow

Resume upload → Resume Parser → Embedding Agent → GitHub/LinkedIn/Portfolio Agents → Skill Matching → Project Evaluation → Shortlisting → Role Recommendation → Hiring Recommendation → Candidate Ranking → Human Approval → Interview Question Generator → Email Agent

## User Preferences

- Keep the existing folder structure and stack — do not restructure or migrate
- Fix one issue at a time; build and verify after each fix
- No demo/mock data — return empty state if data doesn't exist
