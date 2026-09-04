# Cloud Database Setup (Neon)

Sessioneer's backend connects to a shared [Neon](https://neon.tech) Postgres database in the cloud. No local Postgres install is needed.

## 1. Get access to the Neon project

Ask whoever created the project (Rohit) to invite you as a collaborator:
- In the Neon dashboard → project → **Settings → Collaborators** (or **Share**) → invite your email

Once accepted, you'll see the `sessioneer` project in your own Neon dashboard.

## 2. Get the connection string

- Open the project in Neon → click **Connect** (or **Connection Details** on the dashboard)
- Make sure the database dropdown is set to `neondb` (or whichever DB name the project uses)
- Copy the connection string — it looks like:
  ```
  postgresql://<user>:<password>@ep-xxx-xxx.<region>.aws.neon.tech/neondb?sslmode=require
  ```

## 3. Set up your local `.env`

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in, based on the connection string above:

```
DB_URL=jdbc:postgresql://ep-xxx-xxx.<region>.aws.neon.tech/neondb?sslmode=require
DB_USERNAME=<user>
DB_PASSWORD=<password>
JWT_SECRET=any-long-random-string
```

`backend/.env` is gitignored — never commit it or paste it in chat/Slack.

## 4. Run the backend

Maven doesn't need to be installed — use the wrapper committed in the repo:

```bash
cd backend
./mvnw spring-boot:run       # macOS/Linux
.\mvnw.cmd spring-boot:run   # Windows
```

Look for `HikariPool-1 - Start completed` in the console — that confirms it connected to Neon. Hibernate's `ddl-auto=update` creates/updates the schema automatically on first run.

## 5. Create your account

The database is shared, so login state is shared too — use the app's real signup flow, not old demo credentials:

- Go to `http://localhost:5173` (or `5174` if 5173 is taken by something else) → **Sign up**
- Create a Unit Coordinator or Sessional Staff account with your own email/password

## Troubleshooting

- **`mvn`/`mvnw` prints Java's usage text instead of running** — make sure you're on the latest `mvnw.cmd`/`mvnw`; an old quoting bug in the Windows wrapper has since been fixed.
- **Login "succeeds" but nothing you create actually saves** — the frontend has a local mock-auth fallback for when the backend is unreachable. If real login is failing silently, check the browser console for CORS or network errors, and confirm the backend is running.
- **CORS errors in the browser console** — the backend only allows requests from `http://localhost:5173` and `http://localhost:5174`. If your dev server lands on a different port (check the terminal output from `npm run dev`), let the team know so it can be added.
