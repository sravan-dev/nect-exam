import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, Clock, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useExamSessionStore } from '@/store/examSessionStore'
import type { Exam, QuestionWithOptions } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

export default function ExamSessionPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { attemptId, startedAt, durationMins, responses, saveResponse, currentQuestionIndex, setCurrentIndex, clearSession } = useExamSessionStore()

  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!examId || !profile || !attemptId) {
      navigate(`/student/exams/${examId}`, { replace: true }); return
    }
    Promise.all([
      supabase.from('exams').select('*').eq('id', examId).single(),
      supabase.from('questions').select('*, answer_options(*)').eq('exam_id', examId).order('position'),
    ]).then(([examRes, qRes]) => {
      setExam(examRes.data)
      let qs = (qRes.data ?? []) as QuestionWithOptions[]
      if (examRes.data?.shuffle_questions) {
        qs = [...qs].sort(() => Math.random() - 0.5)
      }
      setQuestions(qs)
      setLoading(false)
    })
  }, [examId, profile, attemptId])

  // Timer
  useEffect(() => {
    if (!durationMins || !startedAt) return
    const endTime = startedAt + durationMins * 60 * 1000
    const updateTimer = () => {
      const left = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
      setTimeLeft(left)
      if (left === 0) { clearInterval(timerRef.current!); handleSubmit(true) }
    }
    updateTimer()
    timerRef.current = setInterval(updateTimer, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [durationMins, startedAt])

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (!attemptId || !profile || !exam) return
    if (!autoSubmit && !confirm('Submit exam? You cannot change your answers after submission.')) return
    setSubmitting(true)

    // Flush all responses to DB
    for (const resp of Object.values(responses)) {
      await supabase.from('responses').upsert({
        attempt_id: attemptId,
        question_id: resp.questionId,
        selected_option_id: resp.selectedOptionId ?? null,
        text_answer: resp.textAnswer ?? null,
      }, { onConflict: 'attempt_id,question_id' })
    }

    const timeSecs = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : null
    await supabase.from('attempts').update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      time_spent_secs: timeSecs,
    }).eq('id', attemptId)

    // Auto-grade
    await supabase.rpc('grade_attempt', { p_attempt_id: attemptId } as never)

    clearSession()
    navigate(`/student/exams/${examId}/submitted`, { replace: true })
  }, [attemptId, profile, exam, responses, startedAt])

  const saveCurrentResponse = async (questionId: string, selectedOptionId?: string, textAnswer?: string) => {
    saveResponse({ questionId, selectedOptionId, textAnswer })
    // Also persist to DB immediately
    await supabase.from('responses').upsert({
      attempt_id: attemptId!,
      question_id: questionId,
      selected_option_id: selectedOptionId ?? null,
      text_answer: textAnswer ?? null,
    }, { onConflict: 'attempt_id,question_id' })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  if (!attemptId) return null

  const currentQ = questions[currentQuestionIndex]
  const currentResp = currentQ ? responses[currentQ.id] : undefined

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const answeredCount = questions.filter((q) => responses[q.id]?.selectedOptionId || responses[q.id]?.textAnswer).length

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">{exam?.title}</h1>
            <p className="text-xs text-gray-400">{answeredCount}/{questions.length} answered</p>
          </div>
          {timeLeft !== null && (
            <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold',
              timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700')}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          )}
          <Button onClick={() => handleSubmit(false)} disabled={submitting} size="sm">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit
          </Button>
        </div>
      </header>

      <div className="flex flex-1 max-w-6xl mx-auto w-full px-6 py-6 gap-6">
        {/* Question Navigator */}
        <aside className="w-48 flex-shrink-0">
          <div className="bg-white rounded-lg border p-4 sticky top-20">
            <p className="text-xs font-medium text-gray-500 mb-3">Questions</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, i) => {
                const answered = !!(responses[q.id]?.selectedOptionId || responses[q.id]?.textAnswer)
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={cn('w-7 h-7 text-xs rounded font-medium transition-colors',
                      i === currentQuestionIndex ? 'bg-blue-600 text-white' :
                      answered ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Question Content */}
        <main className="flex-1">
          {currentQ && (
            <div className="bg-white rounded-lg border p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-2">Question {currentQuestionIndex + 1} of {questions.length} · {currentQ.points} pt{currentQ.points !== 1 ? 's' : ''}</p>
                  <p className="text-base font-medium text-gray-900">{currentQ.prompt}</p>
                </div>
              </div>

              {/* MCQ */}
              {currentQ.type === 'mcq' && (
                <div className="space-y-2">
                  {currentQ.answer_options.map((opt) => (
                    <label key={opt.id} className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      currentResp?.selectedOptionId === opt.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}>
                      <input
                        type="radio"
                        name={`q-${currentQ.id}`}
                        value={opt.id}
                        checked={currentResp?.selectedOptionId === opt.id}
                        onChange={() => saveCurrentResponse(currentQ.id, opt.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-800">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* True / False */}
              {currentQ.type === 'true_false' && (
                <div className="flex gap-3">
                  {currentQ.answer_options.map((opt) => (
                    <label key={opt.id} className={cn(
                      'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer font-medium transition-colors',
                      currentResp?.selectedOptionId === opt.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    )}>
                      <input type="radio" name={`q-${currentQ.id}`} value={opt.id}
                        checked={currentResp?.selectedOptionId === opt.id}
                        onChange={() => saveCurrentResponse(currentQ.id, opt.id)}
                        className="sr-only"
                      />
                      {opt.text}
                    </label>
                  ))}
                </div>
              )}

              {/* Short Answer */}
              {currentQ.type === 'short_answer' && (
                <Textarea
                  rows={5}
                  value={currentResp?.textAnswer ?? ''}
                  onChange={(e) => saveCurrentResponse(currentQ.id, undefined, e.target.value)}
                  placeholder="Type your answer here..."
                />
              )}
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => setCurrentIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            {currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={() => setCurrentIndex(currentQuestionIndex + 1)}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => handleSubmit(false)} disabled={submitting}
                className="bg-green-600 hover:bg-green-700">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Exam
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
