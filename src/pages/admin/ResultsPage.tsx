import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface Row {
  id: string
  status: string
  score_pct: number | null
  passed: boolean | null
  submitted_at: string | null
  exams: { title: string; id: string }
  profiles: { full_name: string | null; email: string }
}

export default function ResultsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('attempts')
      .select('id, status, score_pct, passed, submitted_at, exams(id, title), profiles(full_name, email)')
      .neq('status', 'in_progress')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => { setRows((data ?? []) as unknown as Row[]); setLoading(false) })
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Results</h1>
        <p className="text-gray-500 text-sm mt-1">All submitted exam attempts</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Submissions ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No submissions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Student</th>
                    <th className="pb-3 pr-4 font-medium">Exam</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Score</th>
                    <th className="pb-3 pr-4 font-medium">Result</th>
                    <th className="pb-3 pr-4 font-medium">Submitted</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{r.profiles?.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{r.profiles?.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{r.exams?.title}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs capitalize">{r.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 font-semibold">{r.score_pct != null ? `${r.score_pct}%` : '—'}</td>
                      <td className="py-3 pr-4">
                        {r.passed === true  && <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" />Pass</span>}
                        {r.passed === false && <span className="flex items-center gap-1 text-red-500"><XCircle className="h-4 w-4" />Fail</span>}
                        {r.passed == null   && '—'}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(r.submitted_at)}</td>
                      <td className="py-3">
                        <Link to={`/admin/attempts/${r.id}/grade`}>
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
