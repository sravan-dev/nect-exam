import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, FileText, Pencil, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Course, Exam } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/useToast'
import { formatDate, getStatusColor } from '@/lib/utils'

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!courseId) return
    Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('exams').select('*').eq('course_id', courseId).order('created_at', { ascending: false }),
    ]).then(([courseRes, examsRes]) => {
      setCourse(courseRes.data)
      setExams(examsRes.data ?? [])
      setLoading(false)
    })
  }, [courseId])

  const createExam = async () => {
    if (!courseId) return
    setCreating(true)
    const { data, error } = await supabase.from('exams').insert({
      course_id: courseId,
      title: 'Untitled Exam',
      status: 'draft',
      is_public: false,
      shuffle_questions: false,
      show_results: true,
      pass_score: 60,
    }).select().single()
    setCreating(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    navigate(`/admin/exams/${data.id}/build`)
  }

  const deleteExam = async (id: string) => {
    if (!confirm('Delete this exam and all its questions?')) return
    const { error } = await supabase.from('exams').delete().eq('id', id)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    setExams((e) => e.filter((x) => x.id !== id))
    toast({ title: 'Exam deleted' })
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/courses">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{course?.title}</h1>
          {course?.description && <p className="text-gray-500 text-sm mt-0.5">{course.description}</p>}
        </div>
        <Button onClick={createExam} disabled={creating}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          New Exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No exams yet. Click &ldquo;New Exam&rdquo; to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{exam.title}</h3>
                    <Badge className={getStatusColor(exam.status)}>{exam.status}</Badge>
                    {exam.is_public && <Badge variant="outline" className="text-xs">Public</Badge>}
                  </div>
                  <p className="text-xs text-gray-400">
                    {exam.starts_at ? `Starts: ${formatDate(exam.starts_at)}` : 'No start date'}
                    {exam.ends_at && ` · Ends: ${formatDate(exam.ends_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/admin/exams/${exam.id}/assign`}>
                    <Button size="sm" variant="outline">Assign</Button>
                  </Link>
                  <Link to={`/admin/exams/${exam.id}/results`}>
                    <Button size="sm" variant="outline">Results</Button>
                  </Link>
                  <Link to={`/admin/exams/${exam.id}/build`}>
                    <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => deleteExam(exam.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
