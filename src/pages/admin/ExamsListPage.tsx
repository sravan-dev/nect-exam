import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText, Pencil, Trash2, Loader2, Plus, Search,
  Users, BarChart2, Filter,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Exam, Course, Trade } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatDate, getStatusColor } from '@/lib/utils'

type ExamStatus = 'all' | 'draft' | 'published' | 'active' | 'expired'

interface ExamRow extends Exam {
  course?: Course & { trade?: Trade }
}

export default function ExamsListPage() {
  const navigate  = useNavigate()
  const [exams,    setExams]    = useState<ExamRow[]>([])
  const [filtered, setFiltered] = useState<ExamRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState<ExamStatus>('all')
  const [tradeId,  setTradeId]  = useState('all')
  const [trades,   setTrades]   = useState<Trade[]>([])
  const [courses,  setCourses]  = useState<Course[]>([])

  const fetchData = async () => {
    setLoading(true)
    const [
      { data: examsData },
      { data: coursesData },
      { data: tradesData },
    ] = await Promise.all([
      supabase.from('exams').select('*').order('created_at', { ascending: false }),
      supabase.from('courses').select('*'),
      supabase.from('trades').select('*').order('name'),
    ])

    const tradeMap: Record<string, Trade>  = {}
    const courseMap: Record<string, Course & { trade?: Trade }> = {}

    ;(tradesData ?? []).forEach((t) => { tradeMap[t.id] = t })
    ;(coursesData ?? []).forEach((c) => {
      courseMap[c.id] = { ...c, trade: c.trade_id ? tradeMap[c.trade_id] : undefined }
    })

    const merged: ExamRow[] = (examsData ?? []).map((e) => ({
      ...e,
      course: courseMap[e.course_id],
    }))

    setTrades(tradesData ?? [])
    setCourses(coursesData ?? [])
    setExams(merged)
    setFiltered(merged)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // ── Filter ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let list = exams
    if (status !== 'all') list = list.filter((e) => e.status === status)
    if (tradeId !== 'all') list = list.filter((e) => e.course?.trade_id === tradeId)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        (e.course?.title ?? '').toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [exams, search, status, tradeId])

  // ── Create new exam (picks first course) ──────────────────────────────────
  const createExam = async () => {
    if (courses.length === 0) {
      toast({ title: 'No courses', description: 'Create a course first before adding an exam.', variant: 'destructive' })
      return
    }
    setCreating(true)
    const { data, error } = await supabase.from('exams').insert({
      course_id:         courses[0].id,
      title:             'Untitled Exam',
      status:            'draft',
      is_public:         false,
      shuffle_questions: false,
      show_results:      true,
      pass_score:        60,
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

  const STATUS_OPTIONS: { value: ExamStatus; label: string }[] = [
    { value: 'all',       label: 'All Status' },
    { value: 'draft',     label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'active',    label: 'Active' },
    { value: 'expired',   label: 'Expired' },
  ]

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} exam{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== exams.length && ` of ${exams.length}`}
          </p>
        </div>
        <Button onClick={createExam} disabled={creating}>
          {creating
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Plus className="mr-2 h-4 w-4" />}
          New Exam
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search exams or courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <Select value={status} onValueChange={(v) => setStatus(v as ExamStatus)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tradeId} onValueChange={setTradeId}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Trades" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              {trades.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No exams found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Exam</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Course / Trade</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Schedule</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50 transition-colors group">
                  {/* Exam title */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-purple-50 rounded-lg shrink-0">
                        <FileText className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{exam.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {exam.is_public && (
                            <span className="text-xs text-green-600 font-medium">Public</span>
                          )}
                          {exam.duration_mins && (
                            <span className="text-xs text-gray-400">{exam.duration_mins} min</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Course / Trade */}
                  <td className="px-5 py-3.5">
                    <p className="text-gray-800 font-medium">{exam.course?.title ?? '—'}</p>
                    {exam.course?.trade && (
                      <p className="text-xs text-gray-400 mt-0.5">{exam.course.trade.name}</p>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <Badge className={getStatusColor(exam.status)}>{exam.status}</Badge>
                  </td>

                  {/* Schedule */}
                  <td className="px-5 py-3.5 text-xs text-gray-500">
                    {exam.starts_at ? (
                      <div>
                        <p>Start: {formatDate(exam.starts_at)}</p>
                        {exam.ends_at && <p>End: {formatDate(exam.ends_at)}</p>}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/admin/exams/${exam.id}/assign`}>
                        <Button size="sm" variant="ghost" title="Assign Students">
                          <Users className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link to={`/admin/exams/${exam.id}/results`}>
                        <Button size="sm" variant="ghost" title="View Results">
                          <BarChart2 className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link to={`/admin/exams/${exam.id}/build`}>
                        <Button size="sm" variant="ghost" title="Edit Exam">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        size="sm" variant="ghost"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                        onClick={() => deleteExam(exam.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
