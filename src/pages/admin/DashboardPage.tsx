import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, FileText, Users, ClipboardCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Stats {
  courses: number
  exams: number
  students: number
  attempts: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ courses: 0, exams: 0, students: 0, attempts: 0 })
  const [recentExams, setRecentExams] = useState<{ id: string; title: string; status: string; created_at: string }[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('courses').select('id', { count: 'exact', head: true }),
      supabase.from('exams').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('attempts').select('id', { count: 'exact', head: true }),
      supabase.from('exams').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
    ]).then(([courses, exams, students, attempts, recent]) => {
      setStats({
        courses:  courses.count ?? 0,
        exams:    exams.count ?? 0,
        students: students.count ?? 0,
        attempts: attempts.count ?? 0,
      })
      setRecentExams(recent.data ?? [])
    })
  }, [])

  const statCards = [
    { label: 'Courses',  value: stats.courses,  icon: BookOpen,       color: 'text-blue-600',  bg: 'bg-blue-50' },
    { label: 'Exams',    value: stats.exams,    icon: FileText,       color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Students', value: stats.students, icon: Users,          color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Attempts', value: stats.attempts, icon: ClipboardCheck, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  const statusColors: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-700',
    published: 'bg-blue-100 text-blue-700',
    active:    'bg-green-100 text-green-700',
    expired:   'bg-red-100 text-red-700',
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your exam platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${bg}`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Exams</CardTitle>
        </CardHeader>
        <CardContent>
          {recentExams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No exams yet.{' '}
              <Link to="/admin/courses" className="text-blue-600 hover:underline">Create a course</Link> to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {recentExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                  <span className="text-sm font-medium text-gray-900">{exam.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[exam.status] ?? ''}`}>
                    {exam.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
