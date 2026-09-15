import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MockModeToggle from './components/MockModeToggle'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import CoordinatorDashboard from './pages/Coordinator/CoordinatorDashboard'
import CoordinatorUnitsPage from './pages/Coordinator/CoordinatorUnitsPage'
import CoordinatorAllocations from './pages/Coordinator/CoordinatorAllocations'
import CoordinatorCalendarPage from './pages/Coordinator/CoordinatorCalendarPage'
import CoordinatorChat from './pages/Coordinator/CoordinatorChat'
import CoordinatorProfile from './pages/Coordinator/CoordinatorProfile'
import CoordinatorNotifications from './pages/Coordinator/CoordinatorNotifications'
import CoordinatorTutors from './pages/Coordinator/CoordinatorTutors'
import CoordinatorReports from './pages/Coordinator/CoordinatorReports'
import CoordinatorTutorProfile from './pages/Coordinator/CoordinatorTutorProfile'

import TutorDashboard from './pages/Tutor/TutorDashboard'
import TutorMyUnits from './pages/Tutor/TutorMyUnits'
import TutorCalendar from './pages/Tutor/TutorCalendar'
import TutorChat from './pages/Tutor/TutorChat'
import TutorProfile from './pages/Tutor/TutorProfile'
import TutorContracts from './pages/Tutor/TutorContracts'
import TutorNotifications from './pages/Tutor/TutorNotifications'
import TutorReports from './pages/Tutor/TutorReports'

export default function App() {
  return (
    <BrowserRouter>
      <MockModeToggle />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/coordinator" element={<CoordinatorDashboard />} />
        <Route path="/coordinator/units" element={<CoordinatorUnitsPage />} />
        <Route path="/coordinator/allocations" element={<CoordinatorAllocations />} />
        <Route path="/coordinator-notifications" element={<CoordinatorNotifications />} />
        <Route path="/coordinator-chat" element={<CoordinatorChat />} />
        <Route path="/calendar" element={<CoordinatorCalendarPage />} />
        <Route path="/staff" element={<TutorDashboard />} />
        <Route path="/staff-calendar" element={<TutorCalendar />} />
        <Route path="/staff-chat" element={<TutorChat />} />
        <Route path="/staff-units" element={<TutorMyUnits />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/coordinator-profile" element={<CoordinatorProfile />} />
        <Route path="/coordinator/tutors" element={<CoordinatorTutors />} />
        <Route path="/coordinator/reports" element={<CoordinatorReports />} />
        <Route path="/coordinator/reports/:id" element={<CoordinatorTutorProfile />} />
        <Route path="/staff-profile" element={<TutorProfile />} />
        <Route path="/staff-contracts" element={<TutorContracts />} />
        <Route path="/staff-notifications" element={<TutorNotifications />} />
        <Route path="/staff-reports" element={<TutorReports />} />
      </Routes>
    </BrowserRouter>
  )
}
