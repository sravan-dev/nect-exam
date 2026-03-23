import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Clock, Globe, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Exam, Attempt } from '@/types/app.types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatDuration, getStatusColor } from '@/lib/utils'

export default function ExamsPage() {
  const { profile } = useAuthStore()
  const [exams, setExams] = useState<Exam[]>([])
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase.rpc('expire_past_exams').then(() => {
      Promise.all([
        supabase.from('exams').select('*').in('status', ['published', 'active']).order('created_at', { ascending: false }),
        supabase.from('attempts').select('*').eq('student_id', profile.id),
      ]).then(([examRes, attRes]) => {
        setExams(examRes.data ?? [])
        const attMap: Record<string, Attempt> = {}
        attRes.data?.forEach((a) => { attMap[a.exam_id] = a })
        setAttempts(attMap)
        setLoading(false)
      })
    })
  }, [profile])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
        <p className="text-gray-500 text-sm mt-1">All exams available to you</p>
      </div>

      {exams.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No exams available right now</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const attempt = attempts[exam.id]
            const completed = attempt && attempt.status !== 'in_progress'
            const inProgress = attempt?.status === 'in_progress'
            const now = new Date()
            const notStarted = exam.starts_at && new Date(exam.starts_at) > now

            return (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={getStatusColor(exam.status)}>{exam.status}</Badge>
                    {exam.is_public ? (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><Globe className="h-3 w-3" />Public</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><Lock className="h-3 w-3" />Assigned</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{exam.title}</h3>
                  {exam.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{exam.description}</p>}

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDuration(exam.duration_mins)}
                    </span>
                    {exam.ends_at && <span>Ends: {formatDate(exam.ends_at)}</span>}
                  </div>

                  {completed ? (
                    <div className="flex items-center gap-2">
                      <Badge variant={attempt.passed ? 'success' : 'destructive'} className="text-xs">
                        {attempt.score_pct}% · {attempt.passed ? 'Passed' : 'Failed'}
                      </Badge>
                      <Link to={`/student/results`} className="ml-auto">
                        <Button size="sm" variant="outline">View Result</Button>
                      </Link>
                    </div>
                  ) : inProgress ? (
                    <Link to={`/student/exams/${exam.id}/session`}>
                      <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600">Continue Exam</Button>
                    </Link>
                  ) : notStarted ? (
                    <Button size="sm" className="w-full" disabled>
                      Starts {formatDate(exam.starts_at)}
                    </Button>
                  ) : (
                    <Link to={`/student/exams/${exam.id}`}>
                      <Button size="sm" className="w-full">Take Exam</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
