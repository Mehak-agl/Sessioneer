import { Link } from "react-router-dom";
import "./CalendarPage.css";

function CalendarPage() {
  const days = [
    "", "", "", "1", "2", "3", "4",
    "5", "6", "7", "8", "9", "10", "11",
    "12", "13", "14", "15", "16", "17", "18",
    "19", "20", "21", "22", "23", "24", "25",
    "26", "27", "28", "29", "30", "", ""
  ];

  const events: Record<string, { title: string; time: string; type: string }[]> = {
    "6": [{ title: "CAB302 Workshop", time: "9:00 AM", type: "allocated" }],
    "8": [{ title: "CAB301 Tutorial", time: "11:00 AM", type: "pending" }],
    "10": [{ title: "IFN660 Lab", time: "2:00 PM", type: "conflict" }],
    "13": [{ title: "CAB302 Lab A", time: "10:00 AM", type: "allocated" }],
    "15": [{ title: "CAB302 Lab B", time: "1:00 PM", type: "pending" }],
    "17": [{ title: "Rohit Conflict", time: "9:00 AM", type: "conflict" }],
    "20": [{ title: "CAB301 Lecture", time: "12:00 PM", type: "allocated" }],
    "22": [{ title: "Tutor Pending", time: "3:00 PM", type: "pending" }],
    "24": [{ title: "IFN660 Workshop", time: "10:00 AM", type: "allocated" }],
    "27": [{ title: "CAB302 Review", time: "2:00 PM", type: "allocated" }],
    "29": [{ title: "Allocation Check", time: "11:00 AM", type: "conflict" }]
  };

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
          <Link to="/dashboard">Dashboard</Link>
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
              <p>Class allocation overview for coordinator</p>
            </div>
          </div>

          <button className="publish-btn">+ Add Class</button>
        </header>

        <section className="calendar-summary">
          <div className="summary-card allocated-card">
            <h2>6</h2>
            <p>Allocated Classes</p>
          </div>
          <div className="summary-card pending-card">
            <h2>3</h2>
            <p>Pending Classes</p>
          </div>
          <div className="summary-card conflict-card">
            <h2>3</h2>
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