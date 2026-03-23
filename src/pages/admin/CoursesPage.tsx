import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Loader2, Pencil, Filter } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Course, Trade } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  title:       z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  trade_id:    z.string().optional(),
})
type FormData = z.infer<typeof schema>

const BADGE_COLOURS: Record<string, string> = {
  ELE:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  FIT:  'bg-blue-50 text-blue-700 border-blue-200',
  WLD:  'bg-orange-50 text-orange-700 border-orange-200',
  COPA: 'bg-purple-50 text-purple-700 border-purple-200',
  PLB:  'bg-teal-50 text-teal-700 border-teal-200',
}
const DEFAULT_COLOUR = 'bg-gray-50 text-gray-700 border-gray-200'

interface CourseWithTrade extends Course { trade?: Trade }

export default function CoursesPage() {
  const { profile } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const tradeFilter = searchParams.get('trade') ?? 'all'

  const [courses,  setCourses]  = useState<CourseWithTrade[]>([])
  const [trades,   setTrades]   = useState<Trade[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing,  setEditing]  = useState<Course | null>(null)

  const addForm  = useForm<FormData>({ resolver: zodResolver(schema) })
  const editForm = useForm<FormData>({ resolver: zodResolver(schema) })

  const fetchData = async () => {
    setLoading(true)
    const [{ data: tradesData }, { data: coursesData }] = await Promise.all([
      supabase.from('trades').select('*').order('name'),
      supabase.from('courses').select('*').order('created_at', { ascending: false }),
    ])
    const tradeMap: Record<string, Trade> = {}
    ;(tradesData ?? []).forEach((t) => { tradeMap[t.id] = t })
    const merged = (coursesData ?? []).map((c) => ({
      ...c,
      trade: c.trade_id ? tradeMap[c.trade_id] : undefined,
    }))
    setTrades(tradesData ?? [])
    setCourses(merged)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // Set default trade_id when opening add dialog
  const openAdd = () => {
    addForm.reset({
      title: '', description: '',
      trade_id: tradeFilter !== 'all' ? tradeFilter : undefined,
    })
    setAddOpen(true)
  }

  const onAdd = async (data: FormData) => {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase.from('courses').insert({ ...data, admin_id: profile.id })
    setSaving(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Course created!' })
    setAddOpen(false)
    fetchData()
  }

  const openEdit = (c: Course) => {
    setEditing(c)
    editForm.reset({ title: c.title, description: c.description ?? '', trade_id: c.trade_id ?? '' })
    setEditOpen(true)
  }

  const onEdit = async (data: FormData) => {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase.from('courses').update(data).eq('id', editing.id)
    setSaving(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Course updated!' })
    setEditOpen(false)
    fetchData()
  }

  const deleteCourse = async (id: string) => {
    if (!confirm('Delete this course and all its exams?')) return
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Course deleted' })
    setCourses((c) => c.filter((x) => x.id !== id))
  }

  const filtered = tradeFilter === 'all'
    ? courses
    : courses.filter((c) => c.trade_id === tradeFilter)

  const activeTradeName = trades.find((t) => t.id === tradeFilter)?.name ?? 'All Trades'

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} course{filtered.length !== 1 ? 's' : ''}
            {tradeFilter !== 'all' && <> in <span className="font-medium text-gray-700">{activeTradeName}</span></>}
          </p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />New Course</Button>
      </div>

      {/* Trade Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSearchParams({})}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
              tradeFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            All Trades
          </button>
          {trades.map((t) => {
            const active = tradeFilter === t.id
            return (
              <button
                key={t.id}
                onClick={() => setSearchParams({ trade: t.id })}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {t.name}
                {t.code && <span className="ml-1 opacity-60 text-xs">({t.code})</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No courses yet. Click <strong>New Course</strong> to add one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => {
            const code   = course.trade?.code
            const colour = (code && BADGE_COLOURS[code]) || DEFAULT_COLOUR
            return (
              <Card key={course.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      {course.trade && (
                        <Badge variant="outline" className={`text-xs ${colour}`}>
                          {course.trade.code ?? course.trade.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(course)}
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteCourse(course.id)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.description}</p>
                  )}
                  <div className="mt-4">
                    <Link to={`/admin/courses/${course.id}`}>
                      <Button size="sm" variant="outline" className="w-full">View Exams</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Course</DialogTitle></DialogHeader>
          <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="e.g. Basic Electrical Theory" {...addForm.register('title')} />
              {addForm.formState.errors.title && <p className="text-xs text-destructive">{addForm.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Textarea placeholder="What does this course cover?" {...addForm.register('description')} />
            </div>
            <div className="space-y-2">
              <Label>Trade</Label>
              <Select value={addForm.watch('trade_id') ?? ''} onValueChange={(v) => addForm.setValue('trade_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select trade..." /></SelectTrigger>
                <SelectContent>
                  {trades.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Course</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...editForm.register('title')} />
              {editForm.formState.errors.title && <p className="text-xs text-destructive">{editForm.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...editForm.register('description')} />
            </div>
            <div className="space-y-2">
              <Label>Trade</Label>
              <Select value={editForm.watch('trade_id') ?? ''} onValueChange={(v) => editForm.setValue('trade_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select trade..." /></SelectTrigger>
                <SelectContent>
                  {trades.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
