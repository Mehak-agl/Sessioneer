import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
//import { api } from "../../services/api";
import { api } from "../../services/api";
import StaffSidebar from "../../components/TutorSidebar";
import TutorAvailabilityModal from "./TutorAvailabilityModal";


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
  code: string;
}

interface AvailabilitySlot {
  id: number;
  startTime: string;
  endTime: string;
  unit: { id: number; code: string; name: string };
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const years = Array.from({ length: 1001 }, (_, i) => 2000 + i);

function TutorCalendar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [unitFilter, setUnitFilter] = useState("all");
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [initialAvailabilityUnitId, setInitialAvailabilityUnitId] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const invitations = await api.getMyInvitations();
        const loadedUnits: Unit[] = invitations.map((inv: any) => inv.unit);
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

        // Submitted availability. Slots that match a real scheduled class
        // (same unit + exact start time) are shown by recoloring that
        // class's own event below — these don't get a separate entry for
        // those. Only availability with no matching class renders as its
        // own entry (see extraAvailability further down).
        const myAvailability = await api.getMyAvailability();
        setAvailability(myAvailability);
      } catch (err) {
        console.error(err);
      }
    }

    loadData();
  }, []);

  // reload availability after the modal closes, in case something was
  // just submitted/changed while it was open
  const handleModalClose = () => {
    setShowAvailabilityModal(false);
    api.getMyAvailability().then(setAvailability).catch(console.error);
  };

  useEffect(() => {
    if (searchParams.get("availability") === "1") {
      const unitParam = searchParams.get("unit");
      setInitialAvailabilityUnitId(unitParam ? Number(unitParam) : null);
      setShowAvailabilityModal(true);
      searchParams.delete("availability");
      searchParams.delete("unit");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const currentUser = localStorage.getItem("sessioneer_name");

  const filteredSessions = sessions.filter((session) => {
    // Holidays mean no class happens that day — shouldn't render as a
    // scheduled event at all (it isn't one anymore).
    if (session.status === "HOLIDAY") return false;
    if (unitFilter === "all") return true;
    if (unitFilter === "my") return session.tutorName === currentUser;
    if (unitFilter.startsWith("unit-")) {
      const selectedUnitId = unitFilter.replace("unit-", "");
      return String(session.unitId) === selectedUnitId;
    }
    return true;
  });

  // "my" doesn't apply here since getMyAvailability() already only returns
  // the current tutor's own records — only the unit filter is meaningful.
  const filteredAvailability = availability.filter((slot) => {
    if (unitFilter.startsWith("unit-")) {
      const selectedUnitId = unitFilter.replace("unit-", "");
      return String(slot.unit.id) === selectedUnitId;
    }
    return true;
  });

  // Whether a scheduled class has a matching submitted availability slot —
  // exact match on unit + start time. If so, the class itself renders in
  // the "submitted" color instead of "invitation"; if not, an availability
  // slot with no matching class (e.g. from the weekly grid, or "Add
  // Additional Availability" on a date outside the scheduled classes) has
  // nothing to attach to, so it's shown as its own calendar entry below.
  const sessionKey = (unitId: number | undefined, startTime: string) => `${unitId}::${startTime}`;
  const sessionKeySet = new Set(filteredSessions.map((s) => sessionKey(s.unitId, s.startTime)));
  const submittedKeySet = new Set(filteredAvailability.map((a) => sessionKey(a.unit.id, a.startTime)));

  const extraAvailability = filteredAvailability.filter(
    (slot) => !sessionKeySet.has(sessionKey(slot.unit.id, slot.startTime))
  );

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

  // Only the availability slots with no matching scheduled class — the
  // ones that DO match are represented by the class event itself above,
  // so they aren't duplicated here.
  const availabilityByDay: Record<string, AvailabilitySlot[]> = {};
  for (const slot of extraAvailability) {
    const d = new Date(slot.startTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = String(d.getDate());
      if (!availabilityByDay[day]) availabilityByDay[day] = [];
      availabilityByDay[day].push(slot);
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

  // Clicking a scheduled class takes you to that unit's page (Scheduled
  // Classes section), where the actual class lives and can be managed.
  const goToUnit = (unitId?: number) => {
    if (unitId == null) return;
    navigate(`/staff-units?unit=${unitId}`);
  };

  // Clicking an availability entry that has no matching class: if it's
  // for a unit you're invited to, that unit's page is still the most
  // relevant place to manage it (Add Additional Availability lives
  // there); otherwise fall back to opening the Availability modal
  // directly, since there's no unit page for it to land on.
  const goToAvailabilityEntry = (slot: AvailabilitySlot) => {
    const belongsToKnownUnit = units.some((u) => u.id === slot.unit.id);
    if (belongsToKnownUnit) {
      navigate(`/staff-units?unit=${slot.unit.id}`);
    } else {
      setInitialAvailabilityUnitId(slot.unit.id);
      setShowAvailabilityModal(true);
    }
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
          <button className="publish-btn" onClick={() => setShowAvailabilityModal(true)}>
            Availability
          </button>
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

                    {eventsByDay[day]?.map((session, i) => {
                      const submitted = submittedKeySet.has(sessionKey(session.unitId, session.startTime));
                      return (
                        <div
                          className={`class-event ${submitted ? "submitted" : "invitation"}`}
                          key={`s-${i}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => goToUnit(session.unitId)}
                          onKeyDown={(e) => { if (e.key === "Enter") goToUnit(session.unitId); }}
                        >
                          <strong>
                            {new Date(session.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </strong>
                          <span>{session.title}</span>
                          {session.unitName && <small>{session.unitName}</small>}
                          <small className="class-event-tag">
                            {submitted ? "Availability submitted" : "Invitation received"}
                          </small>
                        </div>
                      );
                    })}

                    {availabilityByDay[day]?.map((slot, i) => (
                      <div
                        className="class-event extra-availability"
                        key={`a-${i}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => goToAvailabilityEntry(slot)}
                        onKeyDown={(e) => { if (e.key === "Enter") goToAvailabilityEntry(slot); }}
                      >
                        <strong>
                          {new Date(slot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {"–"}
                          {new Date(slot.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </strong>
                        <span>{slot.unit.code} — {slot.unit.name}</span>
                        <small className="class-event-tag">Additional availability</small>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {showAvailabilityModal && (
        <TutorAvailabilityModal
          units={units}
          initialUnitId={initialAvailabilityUnitId}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

export default TutorCalendar;
