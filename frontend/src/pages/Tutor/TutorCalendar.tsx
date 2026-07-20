import { useEffect, useState } from "react";
import { api } from "../../services/api";
import StaffSidebar from "../../components/TutorSidebar";


interface Session {
  id: number;
  title: string;
  startTime: string;
  status: string;
  unitId?: number;
  unitName?: string;
  tutorName?: string;
}

interface Unit {
  id: number;
  name: string;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const years = Array.from({ length: 1001 }, (_, i) => 2000 + i);

function TutorCalendar() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [unitFilter, setUnitFilter] = useState("all");

  useEffect(() => {
    async function loadData() {
      try {
        const loadedUnits = await api.getUnits();
        setUnits(loadedUnits);

        const allSessions: Session[] = [];

        for (const unit of loadedUnits) {
          const unitSessions = await api.getSessions(unit.id);

          const sessionsWithUnit = unitSessions.map((session: Session) => ({
            ...session,
            unitId: unit.id,
            unitName: unit.name,
          }));

          allSessions.push(...sessionsWithUnit);
        }

        setSessions(allSessions);
      } catch (err) {
        console.error(err);
      }
    }

    loadData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const currentUser = localStorage.getItem("sessioneer_name");

  const filteredSessions = sessions.filter((session) => {
    if (unitFilter === "all") return true;
    if (unitFilter === "my") return session.tutorName === currentUser;
    if (unitFilter.startsWith("unit-")) {
      const selectedUnitId = unitFilter.replace("unit-", "");
      return String(session.unitId) === selectedUnitId;
    }
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

  const allocated = filteredSessions.filter((s) => s.status === "ALLOCATED").length;
  const pending = filteredSessions.filter((s) => s.status === "PENDING").length;
  const conflict = filteredSessions.filter((s) => s.status === "CONFLICT").length;

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
      <StaffSidebar />

      <main className="calendar-main">
        <header className="calendar-topbar">
          <div className="page-heading no-page-logo">
            <div>
              <h1>{months[month]} {year} Calendar</h1>
              <p>Your teaching schedule</p>
            </div>
          </div>
        </header>

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

          <div className="calendar-filter-row">
            <div className="unit-filter-box">
              <label>Unit Filter</label>
              <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
                <option value="all">All Units</option>
                <option value="my">My Sessions</option>
                <optgroup label="Selected Unit">
                  {units.length > 0 ? (
                    units.map((unit) => (
                      <option key={unit.id} value={`unit-${unit.id}`}>{unit.name}</option>
                    ))
                  ) : (
                    <option disabled>No units yet</option>
                  )}
                </optgroup>
              </select>
            </div>
          </div>

          <section className="calendar-summary inside-calendar">
            <div className="summary-card allocated-card">
              <h2>{allocated}</h2>
              <p>Allocated Classes</p>
            </div>
            <div className="summary-card pending-card">
              <h2>{pending}</h2>
              <p>Pending Classes</p>
            </div>
            <div className="summary-card conflict-card">
              <h2>{conflict}</h2>
              <p>Conflicts</p>
            </div>
          </section>

          <section className="legend">
            <span><b className="dot allocated-dot"></b> Allocated</span>
            <span><b className="dot pending-dot"></b> Pending</span>
            <span><b className="dot conflict-dot"></b> Conflict</span>
          </section>

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
                        <strong>
                          {new Date(session.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                        <span>{session.title}</span>
                        {session.unitName && <small>{session.unitName}</small>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default TutorCalendar;
