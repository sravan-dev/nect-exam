import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ResponseWithQuestion } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/useToast'

export default function GradePage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const [responses, setResponses] = useState<ResponseWithQuestion[]>([])
  const [attempt, setAttempt] = useState<{ score_pct: number | null; status: string; exam_id: string } | null>(null)
  const [graderNotes, setGraderNotes] = useState('')
  const [shortAnswerPoints, setShortAnswerPoints] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!attemptId) return
    Promise.all([
      supabase.from('attempts').select('score_pct, status, exam_id, grader_notes').eq('id', attemptId).single(),
      supabase.from('responses').select('*, questions(*, answer_options(*))').eq('attempt_id', attemptId).order('questions(position)'),
    ]).then(([attRes, resRes]) => {
      setAttempt(attRes.data)
      setGraderNotes(attRes.data?.grader_notes ?? '')
      setResponses((resRes.data ?? []) as ResponseWithQuestion[])
      const pts: Record<string, number> = {}
      resRes.data?.forEach((r) => {
        if (r.questions?.type === 'short_answer') pts[r.id] = r.points_awarded ?? 0
      })
      setShortAnswerPoints(pts)
      setLoading(false)
    })
  }, [attemptId])

  const saveGrades = async () => {
    if (!attemptId) return
    setSaving(true)
    for (const [responseId, pts] of Object.entries(shortAnswerPoints)) {
      const isCorrect = pts > 0
      await supabase.from('responses').update({ points_awarded: pts, is_correct: isCorrect }).eq('id', responseId)
    }
    await supabase.from('attempts').update({ grader_notes: graderNotes || null }).eq('id', attemptId)
    await supabase.rpc('grade_attempt', { p_attempt_id: attemptId } as never)
    setSaving(false)
    toast({ title: 'Grades saved!' })
    navigate(`/admin/exams/${attempt?.exam_id}/results`)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  const hasShortAnswer = responses.some((r) => r.questions?.type === 'short_answer')

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to={`/admin/exams/${attempt?.exam_id}/results`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Attempt</h1>
          {attempt?.score_pct != null && (
            <p className="text-sm text-gray-500 mt-0.5">Score: {attempt.score_pct}%</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {responses.map((r, idx) => {
          const q = r.questions
          const isShort = q?.type === 'short_answer'
          return (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>Q{idx + 1}. {q?.prompt}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{q?.type.replace('_', ' ')}</Badge>
                    {!isShort && r.is_correct === true  && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {!isShort && r.is_correct === false && <XCircle className="h-4 w-4 text-red-500" />}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* MCQ / True-False */}
                {!isShort && q?.answer_options && (
                  <div className="space-y-1">
                    {q.answer_options.map((opt) => (
                      <div key={opt.id} className={`text-sm px-3 py-1.5 rounded ${
                        opt.is_correct ? 'bg-green-50 text-green-700 font-medium' :
                        opt.id === r.selected_option_id ? 'bg-red-50 text-red-700' : 'text-gray-500'
                      }`}>
                        {opt.id === r.selected_option_id ? '→ ' : '○ '}
                        {opt.text}
                        {opt.is_correct && ' ✓'}
                      </div>
                    ))}
                  </div>
                )}

                {/* Short answer */}
                {isShort && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500 mb-1">Student answer:</p>
                      <p className="text-sm text-gray-900">{r.text_answer || <em className="text-gray-400">No answer</em>}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm whitespace-nowrap">Points (max {q?.points}):</Label>
                      <Input
                        type="number" min={0} max={q?.points}
                        value={shortAnswerPoints[r.id] ?? 0}
                        onChange={(e) => setShortAnswerPoints({ ...shortAnswerPoints, [r.id]: Number(e.target.value) })}
                        className="w-24"
                      />
                    </div>
                  </div>
                )}

                {q?.explanation && (
                  <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded">
                    💡 {q.explanation}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {hasShortAnswer && (
        <div className="space-y-2">
          <Label>Grader Notes (optional)</Label>
          <Textarea value={graderNotes} onChange={(e) => setGraderNotes(e.target.value)} rows={3} placeholder="Add notes for the student..." />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Link to={`/admin/exams/${attempt?.exam_id}/results`}>
          <Button variant="outline">Back</Button>
        </Link>
        {hasShortAnswer && (
          <Button onClick={saveGrades} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Grades
          </Button>
        )}
      </div>
    </div>
  )
}
