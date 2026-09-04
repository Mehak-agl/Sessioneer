# Sessioneer

A system for negotiating and scheduling sessional teaching staff at QUT.

## Tech Stack

- **Frontend:** React + TypeScript (Vite) — runs on http://localhost:5173
- **Backend:** Java Spring Boot 3 (Maven) — runs on http://localhost:8080

## Project Structure

```
Sessioneer/
├── frontend/       # React + TypeScript app (Vite)
├── backend/        # Spring Boot REST API
└── docs/           # Project documentation
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Java JDK | 17+ | [Corretto](https://aws.amazon.com/corretto/) or any JDK |
| Maven | 3.8+ | [Download](https://maven.apache.org/download.cgi) — extract and add `bin/` to PATH |

### Installing Maven on Windows
1. Download the zip from the link above
2. Extract to somewhere like `C:\Users\<you>\AppData\Local\Programs\apache-maven-x.x.x`
3. Add the `bin\` folder to your user PATH (System → Environment Variables)
4. **Close and reopen VSCode** after updating PATH — existing terminals won't see it

---

## Getting Started

> **Tip:** Open two terminal tabs in VSCode (click **+** in the terminal panel) to run frontend and backend simultaneously.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173

### Backend

```bash
cd backend
mvn spring-boot:run
```

Runs on http://localhost:8080

Health check: http://localhost:8080/api/health

---

## Login (Mock Auth)

The login page has two roles. Use these demo credentials:

| Role | Email | Password |
|------|-------|----------|
| Unit Coordinator | coordinator@qut.edu.au | admin123 |
| Sessional Staff | staff@qut.edu.au | staff123 |

---

## Branching

- `main` — stable, reviewed code only
- Feature branches — name as `<your-name>-<feature>` (e.g. `anantha-login-page`)
- Open a pull request to merge into `main`

## Setup

The app uses a shared [Neon](https://neon.tech) Postgres database in the cloud — no local Postgres install needed.

1. Clone the repo
2. Copy `backend/src/main/resources/application.properties.example` to `application.properties` in the same folder (already set up to read from env vars — no edits needed)
3. Copy `backend/.env.example` to `backend/.env` and fill in your own values:
   - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` — from the Neon project dashboard → Connection Details
   - `JWT_SECRET` — any long random string
4. `backend/.env` is gitignored — never commit it