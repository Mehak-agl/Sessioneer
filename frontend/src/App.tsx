import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import CoordinatorDashboard from './pages/CoordinatorDashboard'
import StaffDashboard from './pages/StaffDashboard'
import CalendarPage from './pages/CalendarPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/coordinator" element={<CoordinatorDashboard />} />
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
