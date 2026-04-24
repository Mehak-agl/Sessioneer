import { Link } from "react-router-dom";

function CalendarPage() {
  return (
    <div>
      <h1>Calendar Page</h1>
      <p>Weekly tutor availability and class allocation view</p>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Day</th>
            <th>Time</th>
            <th>Tutor</th>
            <th>Campus</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>Monday</td>
            <td>9:00 AM - 11:00 AM</td>
            <td>Anantha</td>
            <td>Gardens Point</td>
          </tr>

          <tr>
            <td>Tuesday</td>
            <td>1:00 PM - 3:00 PM</td>
            <td>Tanvi</td>
            <td>Kelvin Grove</td>
          </tr>
        </tbody>
      </table>

      <br />

      <Link to="/dashboard">
        <button>Back to Dashboard</button>
      </Link>
    </div>
  );
}

export default CalendarPage;