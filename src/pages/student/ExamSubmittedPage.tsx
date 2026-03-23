import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, Trophy, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { ResponseWithQuestion } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatSeconds } from '@/lib/utils'

export default function ExamSubmittedPage() {
  const { examId } = useParams<{ examId: string }>()
  const { profile } = useAuthStore()
  const [attempt, setAttempt] = useState<{ id: string; score_pct: number | null; passed: boolean | null; time_spent_secs: number | null; status: string } | null>(null)
  const [examShowResults, setExamShowResults] = useState(true)
  const [responses, setResponses] = useState<ResponseWithQuestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!examId || !profile) return
    supabase.from('attempts').select('id, score_pct, passed, time_spent_secs, status')
      .eq('exam_id', examId).eq('student_id', profile.id).maybeSingle()
      .then(async ({ data: att }) => {
        setAttempt(att)
        const { data: exam } = await supabase.from('exams').select('show_results').eq('id', examId).single()
        setExamShowResults(exam?.show_results ?? true)
        if (att && exam?.show_results) {
          const { data: resData } = await supabase.from('responses')
            .select('*, questions(*, answer_options(*))')
            .eq('attempt_id', att.id)
            .order('questions(position)')
          setResponses((resData ?? []) as ResponseWithQuestion[])
        }
        setLoading(false)
      })
  }, [examId, profile])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Score card */}
        <Card className="text-center">
          <CardContent className="pt-10 pb-8">
            {attempt?.passed === true ? (
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-100 rounded-full">
                  <Trophy className="h-12 w-12 text-green-600" />
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-red-100 rounded-full">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
              </div>
            )}

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {attempt?.passed === true ? 'Congratulations! You Passed!' : attempt?.passed === false ? 'Exam Complete' : 'Exam Submitted!'}
            </h1>

            {examShowResults && attempt?.score_pct != null ? (
              <>
                <p className="text-5xl font-bold my-4" style={{ color: attempt.passed ? '#16a34a' : '#dc2626' }}>
                  {attempt.score_pct}%
                </p>
                <Badge variant={attempt.passed ? 'success' : 'destructive'} className="text-sm px-3 py-1">
                  {attempt.passed ? 'PASSED' : 'FAILED'}
                </Badge>
                {attempt.time_spent_secs && (
                  <p className="mt-3 text-sm text-gray-400 flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" /> Time: {formatSeconds(attempt.time_spent_secs)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-500 mt-2">Your results will be available after grading.</p>
            )}
          </CardContent>
        </Card>

        {/* Detailed review */}
        {examShowResults && responses.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Answer Review</h2>
            {responses.map((r, idx) => {
              const q = r.questions
              const isShort = q?.type === 'short_answer'
              return (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span>Q{idx + 1}. {q?.prompt}</span>
                      {!isShort && (
                        r.is_correct
                          ? <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          : <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {!isShort && q?.answer_options.map((opt) => (
                      <div key={opt.id} className={`text-sm px-3 py-1.5 rounded ${
                        opt.is_correct ? 'bg-green-50 text-green-700 font-medium' :
                        opt.id === r.selected_option_id ? 'bg-red-50 text-red-700' : 'text-gray-500'
                      }`}>
                        {opt.is_correct ? '✓ ' : opt.id === r.selected_option_id ? '✗ ' : '○ '}
                        {opt.text}
                      </div>
                    ))}
                    {isShort && (
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-xs text-gray-400 mb-1">Your answer:</p>
                        <p className="text-sm">{r.text_answer || <em className="text-gray-400">No answer provided</em>}</p>
                        <p className="text-xs text-gray-400 mt-1">{r.points_awarded ?? 0}/{q?.points} points</p>
                      </div>
                    )}
                    {q?.explanation && (
                      <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded">💡 {q.explanation}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link to="/student/exams"><Button variant="outline">Back to Exams</Button></Link>
          <Link to="/student/results"><Button>View All Results</Button></Link>
        </div>
      </div>
    </div>
  )
}
