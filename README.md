# Sessioneer

Sessioneer is a system for negotiating and scheduling sessional staff projects.

## Tech Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Java Spring Boot 3 (Maven)

## Project Structure

```
Sessioneer/
├── frontend/   # React + TypeScript app (Vite)
└── backend/    # Spring Boot REST API
```

## Getting Started

### Prerequisites

- Node.js 18+
- Java 17+
- Maven 3.8+ — [Download here](https://maven.apache.org/download.cgi), extract it, and add the `bin/` folder to your system PATH

> **Tip:** In VSCode, use the integrated terminal (PowerShell on Windows, bash on Mac/Linux). You can open multiple terminal tabs with the **+** button to run frontend and backend at the same time.

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173

---

### Backend

Make sure `mvn` is on your PATH first (see Prerequisites above), then:

```bash
cd backend
mvn spring-boot:run
```

Runs on http://localhost:8080

Health check: http://localhost:8080/api/health

---

### Running Both at Once

Open two terminal tabs in VSCode:

- **Tab 1** — `cd frontend && npm run dev`
- **Tab 2** — `cd backend && mvn spring-boot:run`
