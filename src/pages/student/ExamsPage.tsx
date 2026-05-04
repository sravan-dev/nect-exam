import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { db } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Exam, Attempt } from '@/types/app.types'
import { StudentExamsSkeleton } from '@/components/skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatDuration, getStatusColor } from '@/lib/utils'

export default function ExamsPage() {
  const { profile } = useAuthStore()
  const [exams, setExams] = useState<Exam[]>([])
  const [lastAttempt, setLastAttempt] = useState<Record<string, Attempt>>({})
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({})
  const [maxAttemptsMap, setMaxAttemptsMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    db.rpc('expire_past_exams').then(async () => {
      const { data: assignData } = await db.from('exam_assignments')
        .select('exam_id, max_attempts')
        .eq('student_id', profile.id)

      const assignedIds: string[] = (assignData ?? []).map((a: { exam_id: string }) => a.exam_id)
      const maxMap: Record<string, number> = {}
      ;(assignData ?? []).forEach((a: { exam_id: string; max_attempts: number }) => {
        maxMap[a.exam_id] = a.max_attempts ?? 1
      })
      setMaxAttemptsMap(maxMap)

      if (assignedIds.length === 0) {
        setExams([])
        setLoading(false)
        return
      }

      const [examRes, attRes] = await Promise.all([
        db.from('exams').select('*').in('id', assignedIds).in('status', ['published', 'active']).order('created_at', { ascending: false }),
        db.from('attempts').select('*').eq('student_id', profile.id),
      ])
      setExams(examRes.data ?? [])

      const lastMap: Record<string, Attempt> = {}
      const countMap: Record<string, number> = {}
      attRes.data?.forEach((a: Attempt) => {
        lastMap[a.exam_id] = a
        countMap[a.exam_id] = (countMap[a.exam_id] ?? 0) + 1
      })
      setLastAttempt(lastMap)
      setAttemptCounts(countMap)
      setLoading(false)
    })
  }, [profile])

  if (loading) return <StudentExamsSkeleton />

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
        <p className="text-gray-500 text-sm mt-1">Your assigned exams</p>
      </div>

      {exams.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No exams available right now</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const attempt = lastAttempt[exam.id]
            const count = attemptCounts[exam.id] ?? 0
            const max = maxAttemptsMap[exam.id] ?? 1
            const exhausted = count >= max
            const completed = attempt && attempt.status !== 'in_progress'
            const inProgress = attempt?.status === 'in_progress'
            const now = new Date()
            const notStarted = exam.starts_at && new Date(exam.starts_at) > now

            return (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={getStatusColor(exam.status)}>{exam.status}</Badge>
                    {count > 0 && (
                      <span className="text-xs text-gray-400">{count}/{max} attempt{max !== 1 ? 's' : ''}</span>
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

                  {inProgress ? (
                    <Link to={`/student/exams/${exam.id}/session`}>
                      <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600">Continue Exam</Button>
                    </Link>
                  ) : completed && exhausted ? (
                    <p className="text-sm text-gray-500 text-center py-1">Completed</p>
                  ) : completed && !exhausted ? (
                    <div className="space-y-2">
                      <Link to={`/student/exams/${exam.id}`}>
                        <Button size="sm" variant="outline" className="w-full">
                          Retake Exam ({max - count} left)
                        </Button>
                      </Link>
                    </div>
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
