import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Component, type ReactNode } from 'react'
import { useAuthInit } from '@/hooks/useAuth'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-red-700 font-bold text-lg mb-2">Something went wrong</h2>
            <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">{String(this.state.error)}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { StudentSidebar } from '@/components/layout/StudentSidebar'
import { Toaster } from '@/components/ui/toaster'
import { AppSettingsProvider } from '@/contexts/AppSettingsContext'

// Auth
import LoginPage    from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Admin
import AdminDashboardPage from '@/pages/admin/DashboardPage'
import CoursesPage        from '@/pages/admin/CoursesPage'
import CourseDetailPage   from '@/pages/admin/CourseDetailPage'
import ExamBuilderPage    from '@/pages/admin/ExamBuilderPage'
import QuestionLibraryPage from '@/pages/admin/QuestionLibraryPage'
import ExamAssignPage     from '@/pages/admin/ExamAssignPage'
import ExamResultsPage    from '@/pages/admin/ExamResultsPage'
import GradePage          from '@/pages/admin/GradePage'
import AdminResultsPage   from '@/pages/admin/ResultsPage'
import StudentsPage       from '@/pages/admin/StudentsPage'
import SettingsPage       from '@/pages/admin/SettingsPage'
import TradesPage         from '@/pages/admin/TradesPage'
import ExamsListPage      from '@/pages/admin/ExamsListPage'

// Student
import StudentDashboardPage from '@/pages/student/DashboardPage'
import ExamsPage            from '@/pages/student/ExamsPage'
import ExamLobbyPage        from '@/pages/student/ExamLobbyPage'
import ExamSessionPage      from '@/pages/student/ExamSessionPage'
import ExamSubmittedPage    from '@/pages/student/ExamSubmittedPage'
import StudentResultsPage   from '@/pages/student/ResultsPage'

function AuthInit({ children }: { children: React.ReactNode }) {
  useAuthInit()
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AppSettingsProvider>
        <AuthInit>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Admin routes */}
            <Route element={<ProtectedRoute role="admin" />}>
              <Route element={<AppShell sidebar={<AdminSidebar />} />}>
                <Route path="/admin"                            element={<AdminDashboardPage />} />
                <Route path="/admin/courses"                    element={<CoursesPage />} />
                <Route path="/admin/courses/:courseId"          element={<CourseDetailPage />} />
                <Route path="/admin/exams/:examId/build"        element={<ExamBuilderPage />} />
                <Route path="/admin/question-library"           element={<QuestionLibraryPage />} />
                <Route path="/admin/exams/:examId/assign"       element={<ExamAssignPage />} />
                <Route path="/admin/exams/:examId/results"      element={<ExamResultsPage />} />
                <Route path="/admin/attempts/:attemptId/grade"  element={<GradePage />} />
                <Route path="/admin/results"                    element={<AdminResultsPage />} />
                <Route path="/admin/trades"                     element={<TradesPage />} />
                <Route path="/admin/exams"                      element={<ExamsListPage />} />
                <Route path="/admin/students"                   element={<StudentsPage />} />
                <Route path="/admin/settings"                   element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Student routes with sidebar */}
            <Route element={<ProtectedRoute role="student" />}>
              <Route element={<AppShell sidebar={<StudentSidebar />} />}>
                <Route path="/student"                           element={<StudentDashboardPage />} />
                <Route path="/student/exams"                     element={<ExamsPage />} />
                <Route path="/student/exams/:examId"             element={<ExamLobbyPage />} />
                <Route path="/student/exams/:examId/submitted"   element={<ExamSubmittedPage />} />
                <Route path="/student/results"                   element={<StudentResultsPage />} />
              </Route>
              {/* Full-screen exam session (no sidebar) */}
              <Route path="/student/exams/:examId/session"       element={<ExamSessionPage />} />
            </Route>

            {/* Redirects */}
            <Route path="/"  element={<Navigate to="/login" replace />} />
            <Route path="*"  element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster />
        </AuthInit>
      </AppSettingsProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
