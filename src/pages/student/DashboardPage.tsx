import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle, Clock, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Exam, Attempt } from '@/types/app.types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, getStatusColor } from '@/lib/utils'

export default function StudentDashboardPage() {
  const { profile } = useAuthStore()
  const [available, setAvailable] = useState<Exam[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    setLoading(true)
    ;(async () => {
      try { await supabase.rpc('expire_past_exams') } catch { /* ignore */ }
      try {
        const [examRes, attRes] = await Promise.all([
          supabase.from('exams')
            .select('*')
            .in('status', ['published', 'active'])
            .order('created_at', { ascending: false })
            .limit(6),
          supabase.from('attempts')
            .select('*')
            .eq('student_id', profile.id)
            .order('started_at', { ascending: false })
            .limit(5),
        ])
        setAvailable(examRes.data ?? [])
        setAttempts(attRes.data ?? [])
      } finally {
        setLoading(false)
      }
    })()
  }, [profile])

  const completedCount = attempts.filter((a) => a.status !== 'in_progress').length

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s your exam overview</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Available Exams', value: available.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed',       value: completedCount,   icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'In Progress',     value: attempts.filter((a) => a.status === 'in_progress').length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Total Attempts',  value: attempts.length,  icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available exams */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Available Exams</h2>
          <Link to="/student/exams" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : available.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-gray-500 text-sm">No exams available right now</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {available.map((exam) => (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={getStatusColor(exam.status)}>{exam.status}</Badge>
                    {exam.is_public && <Badge variant="outline" className="text-xs">Public</Badge>}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{exam.title}</h3>
                  <p className="text-xs text-gray-400 mb-4">{exam.ends_at ? `Ends: ${formatDate(exam.ends_at)}` : 'No expiry'}</p>
                  <Link to={`/student/exams/${exam.id}`}>
                    <Button size="sm" className="w-full">Take Exam</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent attempts */}
      {attempts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
            <Link to="/student/results" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {attempts.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="text-sm font-medium text-gray-900">Exam attempt</p>
                  <p className="text-xs text-gray-400">{formatDate(a.started_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {a.score_pct != null && (
                    <span className={`text-sm font-semibold ${a.passed ? 'text-green-600' : 'text-red-500'}`}>
                      {a.score_pct}%
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">{a.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
