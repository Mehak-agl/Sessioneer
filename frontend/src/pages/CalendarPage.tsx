import { useState } from "react";
import { Link } from "react-router-dom";
import "./CalendarPage.css";

type CalendarEvent = {
  title: string;
  time: string;
  location: string;
  type: string;
  dayName: string;
  requestedTutors: string[];
};

type TimeSlot = {
  day: string;
  date: string;
  time: string;
};

type SelectedClass = {
  date: string;
  eventIndex: number;
};

function CalendarPage() {
  const days = [
    "", "", "", "1", "2", "3", "4",
    "5", "6", "7", "8", "9", "10", "11",
    "12", "13", "14", "15", "16", "17", "18",
    "19", "20", "21", "22", "23", "24", "25",
    "26", "27", "28", "29", "30", "", ""
  ];

  const tutors = [
    {
      name: "Priya S.",
      email: "priya@qut.edu.au",
      availableDays: ["Monday", "Wednesday", "Friday"],
      locations: ["Gardens Point", "Online"]
    },
    {
      name: "Alex K.",
      email: "alex@qut.edu.au",
      availableDays: ["Tuesday", "Thursday"],
      locations: ["Kelvin Grove", "Online"]
    },
    {
      name: "Tanvi S.",
      email: "tanvi@qut.edu.au",
      availableDays: ["Monday", "Tuesday", "Thursday"],
      locations: ["Gardens Point", "Kelvin Grove", "Online"]
    },
    {
      name: "Rohit R.",
      email: "rohit@qut.edu.au",
      availableDays: ["Wednesday", "Friday"],
      locations: ["Kelvin Grove"]
    }
  ];

  const [showForm, setShowForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState<SelectedClass | null>(null);

  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({
    "6": [
      {
        title: "CAB302 Workshop",
        time: "9:00 AM - 11:00 AM",
        location: "Gardens Point",
        type: "allocated",
        dayName: "Monday",
        requestedTutors: []
      }
    ],
    "8": [
      {
        title: "CAB301 Tutorial",
        time: "11:00 AM - 1:00 PM",
        location: "Kelvin Grove",
        type: "pending",
        dayName: "Wednesday",
        requestedTutors: []
      }
    ],
    "10": [
      {
        title: "IFN660 Lab",
        time: "2:00 PM - 4:00 PM",
        location: "Online",
        type: "conflict",
        dayName: "Friday",
        requestedTutors: []
      }
    ]
  });

  const [formData, setFormData] = useState({
    unitCode: "",
    unitName: "",
    location: "Gardens Point",
    weeks: "1"
  });

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { day: "Monday", date: "6", time: "" }
  ]);

  function addTimeSlot() {
    setTimeSlots([...timeSlots, { day: "Monday", date: "6", time: "" }]);
  }

  function updateTimeSlot(index: number, field: keyof TimeSlot, value: string) {
    const updatedSlots = [...timeSlots];
    updatedSlots[index][field] = value;
    setTimeSlots(updatedSlots);
  }

  function removeTimeSlot(index: number) {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  }

  function handleAddClass(event: React.FormEvent) {
    event.preventDefault();

    const updatedEvents = { ...events };
    const numberOfWeeks = Number(formData.weeks);

    timeSlots.forEach((slot) => {
      for (let week = 0; week < numberOfWeeks; week++) {
        const calendarDate = Number(slot.date) + week * 7;

        if (calendarDate <= 30) {
          const dateKey = String(calendarDate);

          const newClass: CalendarEvent = {
            title: `${formData.unitCode} ${formData.unitName}`,
            time: slot.time,
            location: formData.location,
            type: "allocated",
            dayName: slot.day,
            requestedTutors: []
          };

          updatedEvents[dateKey] = [...(updatedEvents[dateKey] || []), newClass];
        }
      }
    });

    setEvents(updatedEvents);
    setShowForm(false);

    setFormData({
      unitCode: "",
      unitName: "",
      location: "Gardens Point",
      weeks: "1"
    });

    setTimeSlots([{ day: "Monday", date: "6", time: "" }]);
  }

  function sendRequestToTutor(tutorName: string) {
    if (!selectedClass) return;

    const selectedEvent = events[selectedClass.date][selectedClass.eventIndex];

    const updatedEvent = {
      ...selectedEvent,
      requestedTutors: [...selectedEvent.requestedTutors, tutorName],
      type: "pending"
    };

    const updatedEventsForDate = [...events[selectedClass.date]];
    updatedEventsForDate[selectedClass.eventIndex] = updatedEvent;

    setEvents({
      ...events,
      [selectedClass.date]: updatedEventsForDate
    });
  }

  const clickedClass =
    selectedClass !== null
      ? events[selectedClass.date][selectedClass.eventIndex]
      : null;

  const availableTutors =
    clickedClass?.location === "Online"
      ? tutors.filter((tutor) =>
          tutor.availableDays.includes(clickedClass.dayName) &&
          tutor.locations.includes("Online")
        )
      : tutors.filter((tutor) =>
          tutor.availableDays.includes(clickedClass?.dayName || "") &&
          tutor.locations.includes(clickedClass?.location || "")
        );

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

          <button className="publish-btn" onClick={() => setShowForm(true)}>
            + Add Class
          </button>
        </header>

        {showForm && (
          <div className="form-overlay">
            <form className="add-class-form" onSubmit={handleAddClass}>
              <div className="form-header">
                <h2>Add Class</h2>
                <button type="button" onClick={() => setShowForm(false)}>×</button>
              </div>

              <label>Unit Code</label>
              <input
                placeholder="e.g. CAB302"
                value={formData.unitCode}
                onChange={(e) => setFormData({ ...formData, unitCode: e.target.value })}
                required
              />

              <label>Unit Name</label>
              <input
                placeholder="e.g. Software Development"
                value={formData.unitName}
                onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                required
              />

              <label>Number of Weeks</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 6"
                value={formData.weeks}
                onChange={(e) => setFormData({ ...formData, weeks: e.target.value })}
                required
              />

              <label>Location / Mode</label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              >
                <option value="Gardens Point">Gardens Point</option>
                <option value="Kelvin Grove">Kelvin Grove</option>
                <option value="Online">Online</option>
              </select>

              <h3 className="time-slot-heading">Class Days and Times</h3>

              {timeSlots.map((slot, index) => (
                <div className="time-slot-row" key={index}>
                  <select
                    value={slot.day}
                    onChange={(e) => updateTimeSlot(index, "day", e.target.value)}
                  >
                    <option>Monday</option>
                    <option>Tuesday</option>
                    <option>Wednesday</option>
                    <option>Thursday</option>
                    <option>Friday</option>
                    <option>Saturday</option>
                    <option>Sunday</option>
                  </select>

                  <select
                    value={slot.date}
                    onChange={(e) => updateTimeSlot(index, "date", e.target.value)}
                  >
                    {Array.from({ length: 30 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        April {i + 1}
                      </option>
                    ))}
                  </select>

                  <input
                    placeholder="e.g. 9:00 AM - 11:00 AM"
                    value={slot.time}
                    onChange={(e) => updateTimeSlot(index, "time", e.target.value)}
                    required
                  />

                  {timeSlots.length > 1 && (
                    <button
                      className="remove-slot-btn"
                      type="button"
                      onClick={() => removeTimeSlot(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <button className="add-slot-btn" type="button" onClick={addTimeSlot}>
                + Add Another Day/Time
              </button>

              <button className="save-class-btn" type="submit">
                Add to Calendar and Save
              </button>
            </form>
          </div>
        )}

        {clickedClass && (
          <div className="form-overlay">
            <div className="request-modal">
              <div className="form-header">
                <h2>Send Tutor Request</h2>
                <button type="button" onClick={() => setSelectedClass(null)}>×</button>
              </div>

              <div className="selected-class-info">
                <h3>{clickedClass.title}</h3>
                <p><strong>Day:</strong> {clickedClass.dayName}</p>
                <p><strong>Time:</strong> {clickedClass.time}</p>
                <p><strong>Location:</strong> {clickedClass.location}</p>
              </div>

              <h3 className="available-heading">Available Tutors</h3>

              {availableTutors.length > 0 ? (
                availableTutors.map((tutor) => {
                  const alreadyRequested = clickedClass.requestedTutors.includes(tutor.name);

                  return (
                    <div className="tutor-request-card" key={tutor.email}>
                      <div>
                        <h4>{tutor.name}</h4>
                        <p>{tutor.email}</p>
                      </div>

                      <button
                        disabled={alreadyRequested}
                        onClick={() => sendRequestToTutor(tutor.name)}
                      >
                        {alreadyRequested ? "Request Sent" : "Send Request"}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="no-tutor-message">
                  No available tutors found for this class time/location.
                </p>
              )}
            </div>
          </div>
        )}

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
                      <div
                        className={`class-event ${event.type}`}
                        key={eventIndex}
                        onClick={() =>
                          setSelectedClass({ date: day, eventIndex: eventIndex })
                        }
                      >
                        <strong>{event.time}</strong>
                        <span>{event.title}</span>
                        <small>{event.location}</small>
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