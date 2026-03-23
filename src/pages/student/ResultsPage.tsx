import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle, Clock, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatSeconds } from '@/lib/utils'

interface Row {
  id: string
  status: string
  score_pct: number | null
  passed: boolean | null
  time_spent_secs: number | null
  submitted_at: string | null
  exam_id: string
  exams: { title: string }
}

export default function StudentResultsPage() {
  const { profile } = useAuthStore()
  const [results, setResults] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase.from('attempts')
      .select('id, status, score_pct, passed, time_spent_secs, submitted_at, exam_id, exams(title)')
      .eq('student_id', profile.id)
      .neq('status', 'in_progress')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => { setResults((data ?? []) as unknown as Row[]); setLoading(false) })
  }, [profile])

  const passed = results.filter((r) => r.passed === true).length
  const failed = results.filter((r) => r.passed === false).length
  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.score_pct ?? 0), 0) / results.length)
    : 0

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <p className="text-gray-500 text-sm mt-1">All your exam submissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-5 text-center">
          <Trophy className="h-6 w-6 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">{passed}</p>
          <p className="text-xs text-gray-500">Passed</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <XCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-500">{failed}</p>
          <p className="text-xs text-gray-500">Failed</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-2xl font-bold text-blue-600">{avgScore}%</p>
          <p className="text-xs text-gray-500">Average Score</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-gray-500">No completed exams yet</p>
              <Link to="/student/exams"><Button>Browse Exams</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{r.exams?.title}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDate(r.submitted_at)} · {formatSeconds(r.time_spent_secs)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.score_pct != null && (
                      <span className={`text-lg font-bold ${r.passed ? 'text-green-600' : 'text-red-500'}`}>
                        {r.score_pct}%
                      </span>
                    )}
                    {r.passed === true  && <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Pass</Badge>}
                    {r.passed === false && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Fail</Badge>}
                    {r.passed == null   && <Badge variant="outline">Pending</Badge>}
                    <Link to={`/student/exams/${r.exam_id}/submitted`}>
                      <Button size="sm" variant="outline">Review</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
