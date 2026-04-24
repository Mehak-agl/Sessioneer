import { Link } from "react-router-dom";

function CoordinatorDashboard() {
  return (
    <div>
      <h1>Coordinator Dashboard</h1>
      <p>Welcome Coordinator</p>

      <div>
        <h3>Total Tutors: 12</h3>
        <h3>Pending Availability: 5</h3>
        <h3>Approved Allocations: 8</h3>
      </div>

      <Link to="/calendar">
        <button>Open Calendar</button>
      </Link>
    </div>
  );
}

export default CoordinatorDashboard;