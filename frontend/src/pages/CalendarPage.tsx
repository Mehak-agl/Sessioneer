import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./CalendarPage.css";

type Allocation = {
  id: number;
  status: string;
  tutor: {
    id: number;
    fullName: string;
    email: string;
    staffId: string;
    maxSessions: number;
  };
  session: {
    id: number;
    sessionType: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    campus: string;
    deliveryMode: string;
    unit: {
      id: number;
      unitCode: string;
      unitName: string;
      coordinatorName: string;
    };
  };
};

type CalendarEvent = {
  title: string;
  time: string;
  type: "allocated" | "pending" | "conflict";
};

function CalendarPage() {
  const days = [
    "", "", "", "1", "2", "3", "4",
    "5", "6", "7", "8", "9", "10", "11",
    "12", "13", "14", "15", "16", "17", "18",
    "19", "20", "21", "22", "23", "24", "25",
    "26", "27", "28", "29", "30", "", ""
  ];

  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/allocations");
      const data: Allocation[] = await response.json();

      const mappedEvents: Record<string, CalendarEvent[]> = {};

      data.forEach((allocation) => {
        const dayNumber = mapDayToAprilDate(allocation.session.dayOfWeek);

        if (!dayNumber) return;

        const eventType =
          allocation.status?.toLowerCase() === "pending"
            ? "pending"
            : allocation.status?.toLowerCase() === "conflict"
            ? "conflict"
            : "allocated";

        const event: CalendarEvent = {
          title: `${allocation.session.unit.unitCode} ${allocation.session.sessionType}`,
          time: formatTime(allocation.session.startTime),
          type: eventType,
        };

        if (!mappedEvents[dayNumber]) {
          mappedEvents[dayNumber] = [];
        }

        mappedEvents[dayNumber].push(event);
      });

      setEvents(mappedEvents);
    } catch (error) {
      console.error("Error loading allocations:", error);
    } finally {
      setLoading(false);
    }
  };

  const mapDayToAprilDate = (dayOfWeek: string) => {
    const dayMap: Record<string, string> = {
      Monday: "6",
      Tuesday: "7",
      Wednesday: "8",
      Thursday: "9",
      Friday: "10",
    };

    return dayMap[dayOfWeek];
  };

  const formatTime = (time: string) => {
    if (!time) return "";

    const [hourText, minute] = time.split(":");
    let hour = Number(hourText);
    const ampm = hour >= 12 ? "PM" : "AM";

    hour = hour % 12;
    if (hour === 0) hour = 12;

    return `${hour}:${minute} ${ampm}`;
  };

  const allocatedCount = Object.values(events)
    .flat()
    .filter((event) => event.type === "allocated").length;

  const pendingCount = Object.values(events)
    .flat()
    .filter((event) => event.type === "pending").length;

  const conflictCount = Object.values(events)
    .flat()
    .filter((event) => event.type === "conflict").length;

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
          <a>My Units</a>
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
              <h1>April 2026 Calendar</h1>
              <p>Class allocation overview from database</p>
            </div>
          </div>

          <button className="publish-btn">+ Add Class</button>
        </header>

        <section className="calendar-summary">
          <div className="summary-card allocated-card">
            <h2>{allocatedCount}</h2>
            <p>Allocated Classes</p>
          </div>
          <div className="summary-card pending-card">
            <h2>{pendingCount}</h2>
            <p>Pending Classes</p>
          </div>
          <div className="summary-card conflict-card">
            <h2>{conflictCount}</h2>
            <p>Conflicts</p>
          </div>
        </section>

        <section className="legend">
          <span><b className="dot allocated-dot"></b> Allocated</span>
          <span><b className="dot pending-dot"></b> Pending</span>
          <span><b className="dot conflict-dot"></b> Conflict</span>
        </section>

        {loading && <p>Loading allocation data...</p>}

        <section className="month-calendar">
          <div className="weekdays">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="calendar-grid">
            {days.map((day, index) => (
              <div className={day ? "day-box" : "day-box empty"} key={index}>
                {day && (
                  <>
                    <div className="day-number">{day}</div>

                    {events[day]?.map((event, eventIndex) => (
                      <div className={`class-event ${event.type}`} key={eventIndex}>
                        <strong>{event.time}</strong>
                        <span>{event.title}</span>
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