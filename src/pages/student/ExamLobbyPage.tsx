import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Loader2, Clock, Users, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useExamSessionStore } from '@/store/examSessionStore'
import type { Exam } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatDuration } from '@/lib/utils'
import { toast } from '@/hooks/useToast'

export default function ExamLobbyPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { setAttempt } = useExamSessionStore()
  const [exam, setExam] = useState<Exam | null>(null)
  const [questionCount, setQuestionCount] = useState(0)
  const [existingAttempt, setExistingAttempt] = useState<{ id: string; status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!examId || !profile) return
    supabase.rpc('expire_past_exams').then(() => {
      Promise.all([
        supabase.from('exams').select('*').eq('id', examId).single(),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', examId),
        supabase.from('attempts').select('id, status').eq('exam_id', examId).eq('student_id', profile.id).maybeSingle(),
      ]).then(([examRes, qRes, attRes]) => {
        setExam(examRes.data)
        setQuestionCount(qRes.count ?? 0)
        setExistingAttempt(attRes.data)
        setLoading(false)
      })
    })
  }, [examId, profile])

  const startExam = async () => {
    if (!examId || !profile) return
    setStarting(true)
    const { data, error } = await supabase.from('attempts').insert({
      exam_id: examId,
      student_id: profile.id,
      status: 'in_progress',
    }).select().single()

    if (error) {
      toast({ title: 'Could not start exam', description: error.message, variant: 'destructive' })
      setStarting(false)
      return
    }

    setAttempt(data.id, examId, exam?.duration_mins ?? null)
    navigate(`/student/exams/${examId}/session`)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  const now = new Date()
  const isExpired   = exam?.status === 'expired' || (exam?.ends_at && new Date(exam.ends_at) < now)
  const notStarted  = exam?.starts_at && new Date(exam.starts_at) > now
  const alreadyDone = existingAttempt && existingAttempt.status !== 'in_progress'
  const inProgress  = existingAttempt?.status === 'in_progress'

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/student/exams">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{exam?.title}</h1>
      </div>

      {isExpired && (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>This exam has expired and is no longer available.</p>
        </div>
      )}

      {alreadyDone && (
        <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p>You have already completed this exam. Check your results in the Results page.</p>
        </div>
      )}

      {/* Exam info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Exam Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Questions</p>
            <p className="font-semibold text-gray-900 flex items-center gap-1"><CheckCircle className="h-4 w-4 text-blue-600" />{questionCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Duration</p>
            <p className="font-semibold text-gray-900 flex items-center gap-1"><Clock className="h-4 w-4 text-blue-600" />{formatDuration(exam?.duration_mins)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Passing Score</p>
            <p className="font-semibold text-gray-900 flex items-center gap-1"><Users className="h-4 w-4 text-blue-600" />{exam?.pass_score}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Deadline</p>
            <p className="font-semibold text-gray-900 text-sm">{exam?.ends_at ? formatDate(exam.ends_at) : 'No deadline'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      {exam?.instructions && (
        <Card>
          <CardHeader><CardTitle className="text-base">Instructions</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{exam.instructions}</p>
          </CardContent>
        </Card>
      )}

      {!isExpired && !alreadyDone && !notStarted && (
        inProgress ? (
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base"
            onClick={() => {
              setAttempt(existingAttempt.id, examId!, exam?.duration_mins ?? null)
              navigate(`/student/exams/${examId}/session`)
            }}
          >
            Continue Exam
          </Button>
        ) : (
          <Button className="w-full h-12 text-base" onClick={startExam} disabled={starting || questionCount === 0}>
            {starting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {questionCount === 0 ? 'No questions yet' : 'Start Exam'}
          </Button>
        )
      )}

      {notStarted && !isExpired && (
        <Button disabled className="w-full h-12 text-base">
          Starts {formatDate(exam?.starts_at)}
        </Button>
      )}
    </div>
  )
}
