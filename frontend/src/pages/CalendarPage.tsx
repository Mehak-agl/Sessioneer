import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import "./CalendarPage.css";

interface Session {
  id: number;
  title: string;
  startTime: string;
  status: string;
}

function CalendarPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    async function loadSessions() {
      try {
        const units = await api.getUnits();
        const allSessions: Session[] = [];
        for (const unit of units) {
          const s = await api.getSessions(unit.id);
          allSessions.push(...s);
        }
        setSessions(allSessions);
      } catch (err) {
        console.error(err);
      }
    }
    loadSessions();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: string[] = [];
  for (let i = 0; i < firstDay; i++) days.push("");
  for (let i = 1; i <= daysInMonth; i++) days.push(String(i));
  while (days.length % 7 !== 0) days.push("");

  const eventsByDay: Record<string, Session[]> = {};
  for (const session of sessions) {
    const d = new Date(session.startTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = String(d.getDate());
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(session);
    }
  }

  const allocated = sessions.filter(s => s.status === "ALLOCATED").length;
  const pending = sessions.filter(s => s.status === "PENDING").length;
  const conflict = sessions.filter(s => s.status === "CONFLICT").length;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="calendar-page">
      <aside className="calendar-sidebar">
        <div className="calendar-logo">
          <img src="/logo.png" alt="Sessioneer logo" />
          <div>
            <h2>SESSIONEER</h2>
            <p>Coordinator</p>
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-circle">SC</div>
          <div>
            <h3>Sarah Chen</h3>
            <p>Coordinator</p>
          </div>
        </div>

        <nav className="calendar-menu">
          <Link to="/coordinator">Dashboard</Link>
          <Link to="/coordinator?view=units">My Units</Link>
          <a className="active">Calendar</a>
          <a>Tutors</a>
          <a>Allocations</a>
          <a>Reports</a>
          <a>Chat</a>
        </nav>
      </aside>

      <main className="calendar-main">
        <header className="calendar-topbar">
          <div className="page-heading">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>{monthName} {year} Calendar</h1>
              <p>Class allocation overview for coordinator</p>
            </div>
          </div>
          <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
            <button className="publish-btn" onClick={prevMonth}>← Prev</button>
            <button className="publish-btn" onClick={nextMonth}>Next →</button>
          </div>
        </header>

        <section className="calendar-summary">
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

        <section className="month-calendar">
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

export default CalendarPage;