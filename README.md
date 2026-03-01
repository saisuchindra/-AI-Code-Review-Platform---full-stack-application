<p align="center">
  <img src="https://img.shields.io/badge/AI-Code%20Review-6C63FF?style=for-the-badge&logo=openai&logoColor=white" alt="AI Code Review" />
</p>

<h1 align="center">🔍 AI Code Review Platform</h1>

<p align="center">
  <strong>Enterprise-grade, AI-powered static analysis &amp; code review platform</strong><br/>
  Deep semantic analysis · Security scanning · Complexity metrics · Real-time dashboard
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_AI-Powered-8E75B2?style=flat-square&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Tests-92_passing-brightgreen?style=flat-square" />
</p>

---

## 📸 Screenshots

| Dashboard | Code Submission | Analysis Results |
|:---------:|:---------------:|:----------------:|
| ![Dashboard](https://via.placeholder.com/350x200/1a1a2e/e0e0e0?text=Dashboard+View) | ![Submit](https://via.placeholder.com/350x200/1a1a2e/e0e0e0?text=Submit+Code) | ![Results](https://via.placeholder.com/350x200/1a1a2e/e0e0e0?text=Analysis+Detail) |

> *Replace placeholders with actual screenshots after running the app.*

---

## ✨ Features

### 🤖 AI-Powered Deep Analysis
- **Multi-provider AI** — Google Gemini (free tier) or OpenAI GPT as fallback
- **10-category semantic review** — logical errors, security risks, architecture weaknesses, performance, concurrency, data flow, edge cases, production hardening, and refactoring guidance
- **Confidence scoring** — every finding includes an AI confidence score (0–1)
- **Smart retry** — exponential backoff with automatic retry on rate limits

### 🛡️ Multi-Layer Analysis Pipeline
```
Source Code → Complexity Engine → Security Scanner → AI Deep Review → Composite Score
```
| Layer | What it does |
|-------|-------------|
| **Complexity Engine** | Cyclomatic & cognitive complexity, nesting depth, maintainability index |
| **Security Scanner** | 50+ regex patterns for SQL injection, XSS, hardcoded secrets, eval abuse, path traversal |
| **AI Engine** | Deep semantic review with architecture-level reasoning |
| **Score Compositor** | Weighted composite: Quality (40%) + Security (35%) + Complexity (25%) |

### 📊 Real-Time Dashboard
- Score ring visualization with color-coded grades (A–F)
- 6 stat cards: total analyses, completion rate, avg score, critical issues, languages, avg time
- Recent analyses table with status badges and quick navigation
- Live polling — analysis detail page auto-refreshes until complete

### 🔐 Security & Auth
- JWT access + refresh tokens with Redis-backed blacklisting
- Bcrypt password hashing (12 rounds)
- Helmet security headers, CORS configuration, input sanitization
- Rate limiting (configurable window & max requests)
- Zod schema validation on every request

### ⚡ Background Job Queue
- BullMQ + Redis for async analysis processing
- Configurable concurrency (default: 3 workers)
- Job status tracking: `PENDING → IN_PROGRESS → COMPLETED / FAILED`
- Analysis is queued instantly — no blocking the API

### 🐳 Docker-Ready
- One-command infrastructure: `docker-compose up -d`
- PostgreSQL 16 + Redis 7 with health checks
- Production Dockerfile with multi-stage build

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND  (React + Vite)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Login   │ │Dashboard │ │  Submit  │ │  List    │ │  Detail  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                         Vite Proxy → :4000                          │
└─────────────────────────────┬───────────────────────────────────────┘
                              │  REST API
┌─────────────────────────────▼───────────────────────────────────────┐
│                        BACKEND  (Express + TypeScript)              │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │   Auth      │  │  Analysis    │  │  Dashboard / Repo / Diff   │ │
│  │  Module     │  │  Module      │  │  Modules                   │ │
│  └─────────────┘  └──────┬───────┘  └────────────────────────────┘ │
│                          │                                          │
│  ┌───────────────────────▼──────────────────────────────────────┐  │
│  │              BullMQ Job Queue (Redis-backed)                  │  │
│  │  ┌──────────────┐ ┌────────────────┐ ┌────────────────────┐  │  │
│  │  │  Complexity  │ │   Security     │ │   AI Deep Review   │  │  │
│  │  │  Engine      │ │   Scanner      │ │   (Gemini/OpenAI)  │  │  │
│  │  └──────────────┘ └────────────────┘ └────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │  Prisma ORM │  │    Redis     │  │  Structured Logging (Pino) │ │
│  │  (Postgres) │  │  (Cache/JWT) │  │                            │ │
│  └─────────────┘  └──────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ai-code-review/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── api/client.ts        # Typed API client with error handling
│   │   ├── components/          # Layout, Navbar
│   │   ├── context/AuthContext   # JWT auth state management
│   │   └── pages/               # 6 pages (Login, Register, Dashboard,
│   │                            #   SubmitAnalysis, AnalysisList, AnalysisDetail)
│   ├── tailwind.config.js
│   └── vite.config.ts           # Dev proxy → backend
│
├── src/                         # Express backend
│   ├── config/
│   │   ├── ai.ts                # Gemini + OpenAI client factory
│   │   ├── database.ts          # Prisma singleton
│   │   ├── env.ts               # Zod-validated environment
│   │   └── redis.ts             # ioredis connection
│   ├── middlewares/
│   │   ├── auth.middleware.ts    # JWT verification + role guard
│   │   ├── error.middleware.ts   # Global error handler (Zod-aware)
│   │   ├── rateLimiter.ts       # express-rate-limit
│   │   ├── sanitize.ts          # XSS input sanitization
│   │   └── validate.ts          # Zod schema middleware
│   ├── modules/
│   │   ├── analysis/
│   │   │   ├── ai.engine.ts     # AI analysis (Gemini/OpenAI) + retry logic
│   │   │   ├── complexity.engine.ts  # Cyclomatic/cognitive complexity
│   │   │   ├── security.engine.ts    # 50+ security pattern scanner
│   │   │   ├── analysis.service.ts   # 3-layer pipeline orchestration
│   │   │   ├── analysis.controller.ts
│   │   │   ├── analysis.repository.ts
│   │   │   └── analysis.validator.ts # Zod schemas
│   │   ├── auth/                # Register, login, refresh, logout
│   │   ├── dashboard/           # Aggregated stats endpoint
│   │   ├── diff/                # Git diff analysis
│   │   ├── repository/          # Repository CRUD
│   │   └── webhook/             # GitHub webhook receiver
│   ├── jobs/                    # BullMQ worker + queue config
│   ├── types/                   # TypeScript interfaces
│   └── utils/                   # Logger, helpers
│
├── prisma/
│   └── schema.prisma            # 5 models, 5 enums, full relations
│
├── tests/                       # 11 test suites, 92 tests
├── docker/Dockerfile            # Multi-stage production build
├── docker-compose.yml           # Postgres + Redis + App
└── .env.example                 # All config documented
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20.x |
| Docker & Docker Compose | Latest |
| Git | Latest |

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/ai-code-review-platform.git
cd ai-code-review-platform

# Backend
npm install

# Frontend
cd frontend && npm install && cd ..
```

### 2. Start Infrastructure

```bash
docker-compose up -d    # PostgreSQL 16 + Redis 7
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your AI provider key:

```env
# Use Gemini (free) or OpenAI
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key-from-aistudio.google.com
GEMINI_MODEL=gemini-1.5-flash
```

> 🔑 Get a free Gemini API key at [Google AI Studio](https://aistudio.google.com/apikey)

### 4. Setup Database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Launch

```bash
# Terminal 1 — Backend (port 4000)
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173** → Register → Submit code → Watch AI analyze it in real time! 🎉

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Create account |
| `POST` | `/api/v1/auth/login` | Login → JWT tokens |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Blacklist tokens |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/analyses` | Submit code for review |
| `GET`  | `/api/v1/analyses` | List user's analyses (paginated) |
| `GET`  | `/api/v1/analyses/:id` | Get analysis detail + findings |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/dashboard/stats` | Aggregated metrics |

### Repository & Diff
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/repositories` | Register repository |
| `GET`  | `/api/v1/repositories` | List repositories |
| `POST` | `/api/v1/diff/analyze` | Analyze git diff |

> All endpoints (except auth) require `Authorization: Bearer <token>` header.

---

## 🧪 Testing

```bash
npm test              # Run all 92 tests with coverage
npm run test:watch    # Watch mode
```

**Test suites include:**
- Auth service & schema validation
- Analysis validator
- Complexity engine (cyclomatic, cognitive, nesting)
- Security engine pattern matching
- Diff engine
- File parser & language detector
- Cryptographic utilities
- Input sanitization middleware

---

## 🐳 Docker Deployment

```bash
# Full stack (app + postgres + redis)
docker-compose up -d --build

# View logs
docker-compose logs -f app
```

The app container runs on **port 4000** with production optimizations (multi-stage build, Helmet, compression).

---

## ⚙️ Configuration

All configuration via environment variables (validated at startup with Zod):

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `gemini` | AI engine: `gemini`, `openai`, `anthropic`, `local` |
| `GEMINI_API_KEY` | — | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Gemini model name |
| `OPENAI_API_KEY` | — | OpenAI API key (fallback) |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | OpenAI model |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `JWT_SECRET` | — | Access token secret |
| `JWT_REFRESH_SECRET` | — | Refresh token secret |
| `QUEUE_CONCURRENCY` | `3` | Parallel analysis workers |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="96">
<strong>Backend</strong>
</td>
<td>

TypeScript · Express · Prisma ORM · BullMQ · Zod · Pino · JWT · bcrypt

</td>
</tr>
<tr>
<td align="center" width="96">
<strong>Frontend</strong>
</td>
<td>

React 18 · Vite · Tailwind CSS · React Router v6 · Context API

</td>
</tr>
<tr>
<td align="center" width="96">
<strong>AI</strong>
</td>
<td>

Google Gemini 1.5 Flash · OpenAI GPT (fallback) · Multi-provider architecture

</td>
</tr>
<tr>
<td align="center" width="96">
<strong>Infra</strong>
</td>
<td>

PostgreSQL 16 · Redis 7 · Docker Compose · Multi-stage Dockerfile

</td>
</tr>
<tr>
<td align="center" width="96">
<strong>Testing</strong>
</td>
<td>

Jest · ts-jest · 92 tests · 11 suites · Coverage reports

</td>
</tr>
</table>

---

## 📈 How the Scoring Works

```
Overall Score = Quality × 0.40 + Security × 0.35 + Complexity × 0.25
```

| Grade | Score Range | Color |
|-------|------------ |-------|
| A+ | 90–100 | 🟢 Green |
| A  | 80–89  | 🟢 Green |
| B  | 70–79  | 🟡 Yellow |
| C  | 60–69  | 🟠 Orange |
| D  | 50–59  | 🔴 Red |
| F  | 0–49   | 🔴 Red |

---

## 🗺️ Roadmap

- [ ] GitHub PR integration — auto-review on pull requests
- [ ] VS Code extension
- [ ] Multi-file / repository-wide analysis
- [ ] Historical trend graphs
- [ ] Team collaboration & shared dashboards
- [ ] Anthropic Claude support
- [ ] Custom rule engine (user-defined patterns)
- [ ] CI/CD pipeline integration (GitHub Actions, GitLab CI)

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source under the [MIT License](LICENSE).

---

<p align="center">
  <strong>Built with ❤️ using TypeScript, React & AI</strong><br/>
  <sub>If you found this useful, give it a ⭐!</sub>
</p>
