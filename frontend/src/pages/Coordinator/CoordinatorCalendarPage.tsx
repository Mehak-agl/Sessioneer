import { useEffect, useState } from "react";
import { api } from "../../services/api";
import CoordinatorSidebar from "../../components/CooordinatorSidebar";

interface Session {
  id: number;
  title: string;
  startTime: string;
  status: string;
  unitId: number;
  unitName: string;
  allocatedStaffNames: string[];
}

interface Unit {
  id: number;
  name: string;
  code: string;
}

type FilterMode = "all" | "unit" | "personal";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const years = Array.from({ length: 1001 }, (_, i) => 2000 + i);

function CalendarPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUser = localStorage.getItem("sessioneer_name");

  useEffect(() => {
    async function loadSessions() {
      try {
        const loadedUnits = await api.getUnits();
        setUnits(loadedUnits);
        if (loadedUnits.length > 0) setSelectedUnitId(loadedUnits[0].id);

        const allSessions: Session[] = [];
        for (const unit of loadedUnits) {
          const [unitSessions, unitAllocations] = await Promise.all([
            api.getSessions(unit.id).catch(() => []),
            api.getUnitAllocations(unit.id).catch(() => []),
          ]);

          for (const session of unitSessions) {
            // Which staff (if any) are allocated to THIS specific session —
            // used below to work out whether the current coordinator
            // themselves is personally teaching it.
            const allocatedStaffNames = unitAllocations
              .filter((a: any) => a.session?.id === session.id)
              .map((a: any) => a.staff?.fullName)
              .filter(Boolean);

            allSessions.push({
              ...session,
              unitId: unit.id,
              unitName: unit.name,
              allocatedStaffNames,
            });
          }
        }
        setSessions(allSessions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = months[month];

  // ── Filters ───────────────────────────────────────────────────────────
  // All Classes: every session under every unit this coordinator owns.
  // Unit Classes: only the sessions belonging to the selected unit.
  // Personal Calendar: only sessions where the coordinator personally
  // appears as allocated teaching staff (a real, if narrow, case — it's
  // only non-empty if this coordinator has actually been assigned as
  // staff on a session, same as any tutor would be).
  const filteredSessions = sessions.filter((session) => {
    if (filterMode === "unit") return session.unitId === selectedUnitId;
    if (filterMode === "personal") return session.allocatedStaffNames.includes(currentUser ?? "");
    return true;
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: string[] = [];
  for (let i = 0; i < firstDay; i++) days.push("");
  for (let i = 1; i <= daysInMonth; i++) days.push(String(i));
  while (days.length % 7 !== 0) days.push("");

  const eventsByDay: Record<string, Session[]> = {};
  for (const session of filteredSessions) {
    const d = new Date(session.startTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = String(d.getDate());
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(session);
    }
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(year, Number(e.target.value), 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(Number(e.target.value), month, 1));
  };

  return (
    <div className="calendar-page">
      <CoordinatorSidebar />

      <main className="calendar-main">
        <header className="calendar-topbar">
          <div className="page-heading">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>{monthName} {year} Calendar</h1>
              <p>Class allocation overview for coordinator</p>
            </div>
          </div>
        </header>

        {/* ── Filter dropdown ─────────────────────────────────────────── */}
        <section className="calendar-filter-tabs">
          <div className="unit-filter-box">
            <label>View</label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
            >
              <option value="all">All Classes</option>
              <option value="unit">Unit Classes</option>
              <option value="personal">Personal Calendar</option>
            </select>
          </div>

          {filterMode === "unit" && (
            <div className="unit-filter-box calendar-unit-select">
              <label>Unit</label>
              <select
                value={selectedUnitId ?? ""}
                onChange={(e) => setSelectedUnitId(Number(e.target.value))}
              >
                {units.length === 0 ? (
                  <option disabled>No units yet</option>
                ) : (
                  units.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.code} — {unit.name}</option>
                  ))
                )}
              </select>
            </div>
          )}

          {filterMode === "personal" && (
            <p className="avail-range-hint calendar-filter-hint">
              Showing only sessions where you're personally allocated as teaching staff.
            </p>
          )}
        </section>

        <section className="month-calendar">
          <div className="calendar-box-header">
            <button className="calendar-nav-btn" onClick={prevMonth}>← Prev Month</button>

            <div className="calendar-select-group">
              <select value={month} onChange={handleMonthChange}>
                {months.map((m, index) => (
                  <option key={m} value={index}>{m}</option>
                ))}
              </select>
              <select value={year} onChange={handleYearChange}>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button className="calendar-nav-btn" onClick={nextMonth}>Next Month →</button>
          </div>

          <div className="weekdays">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div>
            <div>Thu</div><div>Fri</div><div>Sat</div>
          </div>

          <div className="calendar-grid">
            {days.map((day, index) => (
              <div className={day ? "day-box" : "day-box empty"} key={index}>
                {day && (
                  <>
                    <div className="day-number">{day}</div>
                    {eventsByDay[day]?.map((session, i) => (
                      <div className={`class-event ${session.status.toLowerCase()}`} key={i}>
                        <strong>{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                        <span>{session.title}</span>
                        <small>{session.unitName}</small>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>

          {!loading && filterMode === "personal" && filteredSessions.length === 0 && (
            <div className="empty-info calendar-empty-note">
              You're not personally allocated to any sessions right now.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CalendarPage;
