import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2, Users, Globe, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Exam, Profile, ExamAssignment } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/useToast'
import { getStatusColor } from '@/lib/utils'

export default function ExamAssignPage() {
  const { examId } = useParams<{ examId: string }>()
  const [exam, setExam] = useState<Exam | null>(null)
  const [assignments, setAssignments] = useState<(ExamAssignment & { profiles: Profile })[]>([])
  const [students, setStudents] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)

  const filteredStudents = students.filter((s) =>
    !assignments.find((a) => a.student_id === s.id) &&
    (s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
  )

  const fetchData = async () => {
    if (!examId) return
    const [examRes, assignRes, studentRes] = await Promise.all([
      supabase.from('exams').select('*').eq('id', examId).single(),
      supabase.from('exam_assignments').select('*, profiles(*)').eq('exam_id', examId),
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
    ])
    setExam(examRes.data)
    setAssignments((assignRes.data ?? []) as (ExamAssignment & { profiles: Profile })[])
    setStudents(studentRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [examId])

  const togglePublic = async () => {
    if (!exam) return
    const { error } = await supabase.from('exams').update({ is_public: !exam.is_public }).eq('id', examId!)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: exam.is_public ? 'Exam set to private' : 'Exam set to public' })
    fetchData()
  }

  const assignStudent = async (studentId: string) => {
    setAssigning(studentId)
    const { error } = await supabase.from('exam_assignments').insert({ exam_id: examId!, student_id: studentId })
    setAssigning(null)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    fetchData()
    toast({ title: 'Student assigned!' })
  }

  const removeAssignment = async (assignId: string) => {
    await supabase.from('exam_assignments').delete().eq('id', assignId)
    setAssignments((a) => a.filter((x) => x.id !== assignId))
    toast({ title: 'Assignment removed' })
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to={`/admin/courses/${exam?.course_id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{exam?.title}</h1>
            {exam && <Badge className={getStatusColor(exam.status)}>{exam.status}</Badge>}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Manage Assignments</p>
        </div>
      </div>

      {/* Public toggle */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {exam?.is_public ? <Globe className="h-6 w-6 text-green-600" /> : <Lock className="h-6 w-6 text-gray-400" />}
            <div>
              <p className="font-medium text-gray-900">{exam?.is_public ? 'Public Exam' : 'Private Exam'}</p>
              <p className="text-sm text-gray-500">
                {exam?.is_public
                  ? 'All students can see and take this exam'
                  : 'Only assigned students can access this exam'}
              </p>
            </div>
          </div>
          <Button onClick={togglePublic} variant={exam?.is_public ? 'outline' : 'default'}>
            {exam?.is_public ? 'Make Private' : 'Make Public'}
          </Button>
        </CardContent>
      </Card>

      {/* Assigned students */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assigned Students ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No students assigned yet</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.profiles?.full_name || '—'}</p>
                    <p className="text-xs text-gray-400">{a.profiles?.email}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeAssignment(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add student */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Students
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {search ? 'No matching students' : 'All students are already assigned'}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{student.full_name || '—'}</p>
                    <p className="text-xs text-gray-400">{student.email}</p>
                  </div>
                  <Button size="sm" onClick={() => assignStudent(student.id)} disabled={assigning === student.id}>
                    {assigning === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
