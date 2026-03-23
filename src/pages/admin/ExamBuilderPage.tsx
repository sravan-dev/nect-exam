import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2, GripVertical, Save, CheckCircle, Globe, Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Exam, QuestionWithOptions, QuestionType } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { getStatusColor } from '@/lib/utils'

const examSchema = z.object({
  title:             z.string().min(1, 'Required'),
  description:       z.string().optional(),
  instructions:      z.string().optional(),
  duration_mins:     z.string().optional(),
  pass_score:        z.string().optional(),
  starts_at:         z.string().optional(),
  ends_at:           z.string().optional(),
  is_public:         z.boolean().optional(),
  shuffle_questions: z.boolean().optional(),
  show_results:      z.boolean().optional(),
})
type ExamFormData = z.infer<typeof examSchema>

const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return ''
  return iso.slice(0, 16)
}

export default function ExamBuilderPage() {
  const { examId } = useParams<{ examId: string }>()
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [questionDialog, setQuestionDialog] = useState(false)
  const [newQType, setNewQType] = useState<QuestionType>('mcq')
  const [editingQ, setEditingQ] = useState<QuestionWithOptions | null>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
  })

  const fetchData = async () => {
    if (!examId) return
    const [examRes, qRes] = await Promise.all([
      supabase.from('exams').select('*').eq('id', examId).single(),
      supabase.from('questions').select('*, answer_options(*)').eq('exam_id', examId).order('position'),
    ])
    if (examRes.data) {
      setExam(examRes.data)
      reset({
        title: examRes.data.title,
        description: examRes.data.description ?? '',
        instructions: examRes.data.instructions ?? '',
        duration_mins: examRes.data.duration_mins ? String(examRes.data.duration_mins) : '',
        pass_score: String(examRes.data.pass_score ?? 60),
        starts_at: toLocalInput(examRes.data.starts_at),
        ends_at: toLocalInput(examRes.data.ends_at),
        is_public: examRes.data.is_public,
        shuffle_questions: examRes.data.shuffle_questions,
        show_results: examRes.data.show_results,
      })
    }
    setQuestions((qRes.data ?? []) as QuestionWithOptions[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [examId])

  const saveSettings = async (data: ExamFormData) => {
    if (!examId) return
    setSavingSettings(true)
    const { error } = await supabase.from('exams').update({
      title: data.title,
      description: data.description || null,
      instructions: data.instructions || null,
      duration_mins: data.duration_mins ? Number(data.duration_mins) : null,
      pass_score: Number(data.pass_score) || 60,
      starts_at: data.starts_at ? new Date(data.starts_at).toISOString() : null,
      ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
      is_public: data.is_public,
      shuffle_questions: data.shuffle_questions,
      show_results: data.show_results,
    }).eq('id', examId)
    setSavingSettings(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Settings saved!' })
    fetchData()
  }

  const publishExam = async () => {
    if (!examId || questions.length === 0) {
      toast({ title: 'Add at least one question first', variant: 'destructive' }); return
    }
    const { error } = await supabase.from('exams').update({ status: 'published' }).eq('id', examId)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Exam published!' })
    fetchData()
  }

  const expireExam = async () => {
    if (!examId) return
    await supabase.from('exams').update({ status: 'expired' }).eq('id', examId)
    toast({ title: 'Exam expired' })
    fetchData()
  }

  const resetToDraft = async () => {
    if (!examId || !confirm('Reset to draft? This will not delete submitted attempts.')) return
    await supabase.from('exams').update({ status: 'draft' }).eq('id', examId)
    fetchData()
  }

  const deleteQuestion = async (qId: string) => {
    await supabase.from('questions').delete().eq('id', qId)
    setQuestions((q) => q.filter((x) => x.id !== qId))
    toast({ title: 'Question deleted' })
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link to={`/admin/courses/${exam?.course_id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{exam?.title}</h1>
            {exam && <Badge className={getStatusColor(exam.status)}>{exam.status}</Badge>}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Exam Builder</p>
        </div>
        <div className="flex gap-2">
          {exam?.status === 'draft' && (
            <Button onClick={publishExam} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="mr-2 h-4 w-4" /> Publish
            </Button>
          )}
          {(exam?.status === 'published' || exam?.status === 'active') && (
            <Button variant="destructive" onClick={expireExam}>Expire Now</Button>
          )}
          {exam?.status === 'expired' && (
            <Button variant="outline" onClick={resetToDraft}>Reset to Draft</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <form onSubmit={handleSubmit(saveSettings)} className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input {...register('title')} />
                  {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea rows={2} {...register('description')} />
                </div>
                <div className="space-y-2">
                  <Label>Instructions (shown before exam starts)</Label>
                  <Textarea rows={3} {...register('instructions')} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Schedule & Rules</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date & Time</Label>
                  <Input type="datetime-local" {...register('starts_at')} />
                </div>
                <div className="space-y-2">
                  <Label>End Date & Time (auto-expires)</Label>
                  <Input type="datetime-local" {...register('ends_at')} />
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes, blank = unlimited)</Label>
                  <Input type="number" min={1} placeholder="e.g. 60" {...register('duration_mins')} />
                </div>
                <div className="space-y-2">
                  <Label>Passing Score (%)</Label>
                  <Input type="number" min={0} max={100} {...register('pass_score')} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Options</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" {...register('is_public')} className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1">
                      {watch('is_public') ? <Globe className="h-3.5 w-3.5 text-green-600" /> : <Lock className="h-3.5 w-3.5 text-gray-400" />}
                      Public exam
                    </p>
                    <p className="text-xs text-muted-foreground">All students can see and attempt this exam</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" {...register('shuffle_questions')} className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium">Shuffle questions</p>
                    <p className="text-xs text-muted-foreground">Each student sees questions in a different order</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" {...register('show_results')} className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium">Show results after submission</p>
                    <p className="text-xs text-muted-foreground">Students see their score immediately</p>
                  </div>
                </label>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingSettings}>
                {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Settings
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingQ(null); setQuestionDialog(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-500">
                No questions yet. Click &ldquo;Add Question&rdquo; to begin.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <Card key={q.id}>
                  <CardContent className="p-4 flex gap-3">
                    <div className="flex items-center text-gray-300">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-mono">Q{idx + 1}</span>
                        <Badge variant="outline" className="text-xs capitalize">{q.type.replace('_', ' ')}</Badge>
                        <span className="text-xs text-gray-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{q.prompt}</p>
                      {q.answer_options.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {q.answer_options.map((opt) => (
                            <div key={opt.id} className={`text-xs px-2 py-1 rounded ${opt.is_correct ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500'}`}>
                              {opt.is_correct ? '✓ ' : '○ '}{opt.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingQ(q); setQuestionDialog(true) }}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteQuestion(q.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <QuestionDialog
        open={questionDialog}
        onClose={() => { setQuestionDialog(false); setEditingQ(null) }}
        examId={examId!}
        initialType={newQType}
        onTypeChange={setNewQType}
        editingQuestion={editingQ}
        onSaved={fetchData}
        nextPosition={questions.length}
      />
    </div>
  )
}

// ─── Question Dialog ────────────────────────────────────────────────────────

interface QDialogProps {
  open: boolean
  onClose: () => void
  examId: string
  initialType: QuestionType
  onTypeChange: (t: QuestionType) => void
  editingQuestion: QuestionWithOptions | null
  onSaved: () => void
  nextPosition: number
}

function QuestionDialog({ open, onClose, examId, initialType, onTypeChange, editingQuestion, onSaved, nextPosition }: QDialogProps) {
  const [qType, setQType] = useState<QuestionType>(initialType)
  const [prompt, setPrompt] = useState('')
  const [points, setPoints] = useState(1)
  const [explanation, setExplanation] = useState('')
  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>([
    { text: '', is_correct: false }, { text: '', is_correct: false },
  ])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingQuestion) {
      setQType(editingQuestion.type)
      setPrompt(editingQuestion.prompt)
      setPoints(editingQuestion.points)
      setExplanation(editingQuestion.explanation ?? '')
      if (editingQuestion.answer_options.length > 0) {
        setOptions(editingQuestion.answer_options.map((o) => ({ text: o.text, is_correct: o.is_correct })))
      }
    } else {
      setPrompt(''); setPoints(1); setExplanation('')
      setOptions([{ text: '', is_correct: false }, { text: '', is_correct: false }])
    }
  }, [editingQuestion, open])

  const handleTypeChange = (t: QuestionType) => {
    setQType(t)
    onTypeChange(t)
    if (t === 'true_false') {
      setOptions([{ text: 'True', is_correct: true }, { text: 'False', is_correct: false }])
    } else if (t === 'mcq') {
      setOptions([{ text: '', is_correct: false }, { text: '', is_correct: false }])
    }
  }

  const save = async () => {
    if (!prompt.trim()) { toast({ title: 'Question prompt required', variant: 'destructive' }); return }
    setSaving(true)

    if (editingQuestion) {
      await supabase.from('questions').update({ prompt, points, explanation: explanation || null }).eq('id', editingQuestion.id)
      await supabase.from('answer_options').delete().eq('question_id', editingQuestion.id)
    } else {
      const { data: qData } = await supabase.from('questions').insert({
        exam_id: examId, type: qType, prompt, points,
        explanation: explanation || null, position: nextPosition,
      }).select().single()
      if (qData && qType !== 'short_answer') {
        await supabase.from('answer_options').insert(
          options.filter((o) => o.text.trim()).map((o, i) => ({ question_id: qData.id, ...o, position: i }))
        )
      }
      setSaving(false); onSaved(); onClose(); return
    }

    if (editingQuestion && qType !== 'short_answer') {
      await supabase.from('answer_options').insert(
        options.filter((o) => o.text.trim()).map((o, i) => ({ question_id: editingQuestion.id, ...o, position: i }))
      )
    }
    setSaving(false); onSaved(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!editingQuestion && (
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select value={qType} onValueChange={(v) => handleTypeChange(v as QuestionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Question *</Label>
            <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Enter your question here..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Points</Label>
              <Input type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            </div>
          </div>

          {qType === 'mcq' && (
            <div className="space-y-2">
              <Label>Answer Options (check correct answer)</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={opt.is_correct}
                    onChange={() => setOptions(options.map((o, j) => ({ ...o, is_correct: j === i })))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Input value={opt.text} onChange={(e) => setOptions(options.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                    placeholder={`Option ${i + 1}`} />
                  {options.length > 2 && (
                    <Button type="button" size="icon" variant="ghost" className="text-red-400"
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, { text: '', is_correct: false }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Option
              </Button>
            </div>
          )}

          {qType === 'true_false' && (
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <div className="flex gap-4">
                {['True', 'False'].map((v) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tf_correct" checked={options.find((o) => o.text === v)?.is_correct}
                      onChange={() => setOptions(options.map((o) => ({ ...o, is_correct: o.text === v })))}
                      className="w-4 h-4" />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          )}

          {qType === 'short_answer' && (
            <p className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded p-3">
              Short answer questions require manual grading by admin after submission.
            </p>
          )}

          <div className="space-y-2">
            <Label>Explanation (shown after submission)</Label>
            <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Optional explanation..." />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Question
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
