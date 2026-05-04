import { useEffect, useState } from 'react'
import { CheckCircle, Clock, FileText } from 'lucide-react'
import { db } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Attempt } from '@/types/app.types'
import { Card, CardContent } from '@/components/ui/card'
import { StudentDashboardSkeleton } from '@/components/skeletons'

export default function StudentDashboardPage() {
  const { profile } = useAuthStore()
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    setLoading(true)
    ;(async () => {
      try { await db.rpc('expire_past_exams') } catch { /* ignore */ }
      try {
        const attRes = await db.from('attempts')
          .select('*')
          .eq('student_id', profile.id)
          .order('started_at', { ascending: false })
          .limit(5)
        setAttempts(attRes.data ?? [])
      } finally {
        setLoading(false)
      }
    })()
  }, [profile])

  const completedCount = attempts.filter((a) => a.status !== 'in_progress').length

  if (loading) return <StudentDashboardSkeleton />

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s your exam overview</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
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

    </div>
  )
}
