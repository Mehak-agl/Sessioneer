import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import LoginPage from './pages/LoginPage'
import CoordinatorDashboard from './pages/CoordinatorDashboard'
import StaffDashboard from './pages/StaffDashboard'

function ProtectedRoute({ children, role }: { children: ReactElement; role: string }) {
  const savedRole = localStorage.getItem('sessioneer_role')
  if (savedRole !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/coordinator"
          element={
            <ProtectedRoute role="coordinator">
              <CoordinatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute role="staff">
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
