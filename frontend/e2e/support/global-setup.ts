import { execSync } from 'node:child_process'

const BACKEND = 'http://localhost:8080/api'

// Every notification on the backend also sends a real email from the team's
// Gmail account. Test runs create lots of notifications for fake addresses,
// so refuse to run unless the backend was started with mail pointed nowhere.
function backendMailIsDisabled(): boolean | null {
  if (process.platform !== 'win32') return null
  try {
    const out = execSync(
      'powershell -NoProfile -Command "$p = (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction Stop | Select-Object -First 1).OwningProcess; (Get-CimInstance Win32_Process -Filter \\"ProcessId=$p\\").CommandLine"',
      { encoding: 'utf8' },
    )
    return /spring\.mail\.host=localhost/.test(out)
  } catch {
    return null
  }
}

export default async function globalSetup() {
  try {
    await fetch(`${BACKEND}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  } catch {
    throw new Error(
      'Backend is not running on http://localhost:8080. Start it with email disabled first:\n' +
      '  cd backend\n' +
      '  mvn spring-boot:run "-Dspring-boot.run.arguments=--spring.mail.host=localhost --spring.mail.port=2525"',
    )
  }

  const mailOff = backendMailIsDisabled()
  if (mailOff === false && !process.env.E2E_ALLOW_REAL_EMAIL) {
    throw new Error(
      'The backend is running with real email turned on, so these tests would send dozens of emails ' +
      'from the team Gmail account. Restart it with email disabled:\n' +
      '  mvn spring-boot:run "-Dspring-boot.run.arguments=--spring.mail.host=localhost --spring.mail.port=2525"',
    )
  }
  if (mailOff === null) {
    console.warn('[e2e] Could not confirm the backend has email disabled — make sure it was started with --spring.mail.host=localhost.')
  }
}
