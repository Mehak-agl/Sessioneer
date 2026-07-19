import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import CoordinatorDashboard from './pages/Coordinator/CoordinatorDashboard'
import CoordinatorCalendarPage from './pages/Coordinator/CoordinatorCalendarPage'
import CoordinatorChat from './pages/Coordinator/CoordinatorChat'

import TutorDashboard from './pages/Tutor/TutorDashboard'
import TutorCalendar from './pages/Tutor/TutorCalendar'
import TutorChat from './pages/Tutor/TutorChat'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/coordinator" element={<CoordinatorDashboard />} />
        <Route path="/coordinator-chat" element={<CoordinatorChat />} />
        <Route path="/calendar" element={<CoordinatorCalendarPage />} />
        <Route path="/staff" element={<TutorDashboard />} />
        <Route path="/staff-calendar" element={<TutorCalendar />} />
        <Route path="/staff-chat" element={<TutorChat />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
