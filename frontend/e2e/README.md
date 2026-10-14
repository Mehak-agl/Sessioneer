# Full-stack E2E tests

Playwright tests that drive the real app in Chrome against the real Spring Boot
backend and Postgres database. Each test creates its own coordinator, tutors and
units through the API (emails like `e2e-...@example.com`), so it never touches
real data and tests don't depend on each other.

## Run

1. Start the backend **with email turned off** (every notification sends a real
   email otherwise — the tests refuse to run if it's on):

   ```powershell
   cd backend
   mvn spring-boot:run "-Dspring-boot.run.arguments=--spring.mail.host=localhost --spring.mail.port=2525"
   ```

2. Run the tests (starts the frontend on port 5173 if it isn't already running):

   ```powershell
   cd frontend
   npm run test:e2e        # headless, with an HTML report
   npm run test:e2e:ui     # watch them run step by step
   npx playwright show-report
   ```

## Clean up test data

```powershell
psql -h localhost -U postgres -d sessioneer -f frontend/e2e/cleanup.sql
```

Removes only `e2e-%@example.com` accounts and everything linked to them.

## Known issues

Tests marked `test.fail(...)` document real bugs. They pass while the bug exists
and Playwright reports them as unexpected passes once the bug is fixed, so the
annotation can be removed.
