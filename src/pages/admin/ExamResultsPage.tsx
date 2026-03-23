import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Exam } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatSeconds } from '@/lib/utils'

interface AttemptRow {
  id: string
  status: string
  started_at: string
  submitted_at: string | null
  score_pct: number | null
  passed: boolean | null
  time_spent_secs: number | null
  profiles: { full_name: string | null; email: string }
}

export default function ExamResultsPage() {
  const { examId } = useParams<{ examId: string }>()
  const [exam, setExam] = useState<Exam | null>(null)
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!examId) return
    Promise.all([
      supabase.from('exams').select('*').eq('id', examId).single(),
      supabase.from('attempts').select('*, profiles(full_name, email)').eq('exam_id', examId).order('submitted_at', { ascending: false }),
    ]).then(([examRes, attRes]) => {
      setExam(examRes.data)
      setAttempts((attRes.data ?? []) as AttemptRow[])
      setLoading(false)
    })
  }, [examId])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  const submitted = attempts.filter((a) => a.status !== 'in_progress')
  const avgScore = submitted.length > 0
    ? Math.round(submitted.reduce((s, a) => s + (a.score_pct ?? 0), 0) / submitted.length)
    : 0
  const passRate = submitted.length > 0
    ? Math.round(submitted.filter((a) => a.passed).length / submitted.length * 100)
    : 0

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link to={`/admin/courses/${exam?.course_id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{exam?.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Results & Submissions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">{attempts.length}</p>
          <p className="text-sm text-gray-500">Total Attempts</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-blue-600">{avgScore}%</p>
          <p className="text-sm text-gray-500">Average Score</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold text-green-600">{passRate}%</p>
          <p className="text-sm text-gray-500">Pass Rate</p>
        </CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Submissions</CardTitle></CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No submissions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Student</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Score</th>
                    <th className="pb-3 pr-4 font-medium">Result</th>
                    <th className="pb-3 pr-4 font-medium">Time Spent</th>
                    <th className="pb-3 font-medium">Submitted</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {attempts.map((a) => (
                    <tr key={a.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">{a.profiles?.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{a.profiles?.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs capitalize">{a.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 font-semibold">
                        {a.score_pct != null ? `${a.score_pct}%` : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        {a.passed === true  && <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle className="h-4 w-4" />Pass</span>}
                        {a.passed === false && <span className="flex items-center gap-1 text-red-500 font-medium"><XCircle className="h-4 w-4" />Fail</span>}
                        {a.passed == null   && <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-1 text-gray-500"><Clock className="h-3.5 w-3.5" />{formatSeconds(a.time_spent_secs)}</span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(a.submitted_at)}</td>
                      <td className="py-3">
                        <Link to={`/admin/attempts/${a.id}/grade`}>
                          <Button size="sm" variant="outline">Review</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
