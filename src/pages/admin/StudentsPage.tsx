import { useEffect, useState } from 'react'
import { Users, Plus, Pencil, Trash2, Loader2, Search, KeyRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { db } from '@/lib/api'
import type { Profile, Course } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatDateShort } from '@/lib/utils'
import { StudentsPageSkeleton } from '@/components/skeletons'

const addSchema = z.object({
  full_name:   z.string().min(1, 'Full name is required'),
  course_id:   z.string().min(1, 'Please select a course'),
  dob:         z.string().min(1, 'Date of birth is required'),
  father_name: z.string().min(1, 'Father name is required'),
  mother_name: z.string().min(1, 'Mother name is required'),
  address:     z.string().min(1, 'Address is required'),
  pin_code:    z.string().regex(/^\d{6}$/, 'Enter valid 6-digit PIN'),
  mobile:      z.string().regex(/^\d{10}$/, 'Enter valid 10-digit mobile'),
  email:       z.string().email('Valid email required'),
  password:    z.string().min(6, 'Minimum 6 characters'),
  reference:   z.string().optional(),
})

const editSchema = z.object({
  full_name:   z.string().min(1, 'Full name is required'),
  course_id:   z.string().optional(),
  dob:         z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  address:     z.string().optional(),
  pin_code:    z.string().optional(),
  mobile:      z.string().optional(),
  email:       z.string().email('Valid email required'),
  reference:   z.string().optional(),
})

const pwSchema = z.object({
  password: z.string().min(6, 'Minimum 6 characters'),
})

type AddForm  = z.infer<typeof addSchema>
type EditForm = z.infer<typeof editSchema>
type PwForm   = z.infer<typeof pwSchema>

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [courses,  setCourses]  = useState<Course[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [saving,   setSaving]   = useState(false)

  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [pwOpen,   setPwOpen]   = useState(false)
  const [editing,  setEditing]  = useState<Profile | null>(null)

  // course_id → duration lookup for add/edit forms
  const [addCourse,  setAddCourse]  = useState('')
  const [editCourse, setEditCourse] = useState('')
  const addDuration  = courses.find((c) => c.id === addCourse)?.duration  ?? ''
  const editDuration = courses.find((c) => c.id === editCourse)?.duration ?? ''

  const addForm  = useForm<AddForm>({  resolver: zodResolver(addSchema) })
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })
  const pwForm   = useForm<PwForm>({  resolver: zodResolver(pwSchema) })

  const fetchStudents = async () => {
    setLoading(true)
    const { data } = await db.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false })
    setStudents(data ?? [])
    setFiltered(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchStudents()
    db.from('courses').select('*').order('title').then(({ data }) => setCourses((data as Course[]) ?? []))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(students.filter((s) =>
      (s.full_name ?? '').toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    ))
  }, [search, students])

  // ── Add ──────────────────────────────────────────────────────────────────────
  const openAdd = () => {
    addForm.reset()
    setAddCourse('')
    setAddOpen(true)
  }

  const onAdd = async (data: AddForm) => {
    setSaving(true)
    const { error } = await db.rpc('admin_create_student', {
      p_email:       data.email,
      p_password:    data.password,
      p_full_name:   data.full_name,
      p_dob:         data.dob,
      p_father_name: data.father_name,
      p_mother_name: data.mother_name,
      p_address:     data.address,
      p_pin_code:    data.pin_code,
      p_mobile:      data.mobile,
      p_course_id:   data.course_id,
      p_reference:   data.reference ?? '',
    })
    setSaving(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Student added!' })
    setAddOpen(false)
    fetchStudents()
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const openEdit = (s: Profile) => {
    setEditing(s)
    setEditCourse(s.course_id ?? '')
    editForm.reset({
      full_name:   s.full_name   ?? '',
      course_id:   s.course_id   ?? '',
      dob:         s.dob         ?? '',
      father_name: s.father_name ?? '',
      mother_name: s.mother_name ?? '',
      address:     s.address     ?? '',
      pin_code:    s.pin_code    ?? '',
      mobile:      s.mobile      ?? '',
      email:       s.email,
      reference:   s.reference   ?? '',
    })
    setEditOpen(true)
  }

  const onEdit = async (data: EditForm) => {
    if (!editing) return
    setSaving(true)
    const { error } = await db.from('profiles').update({
      full_name:   data.full_name,
      email:       data.email,
      course_id:   data.course_id   || null,
      dob:         data.dob         || null,
      father_name: data.father_name || null,
      mother_name: data.mother_name || null,
      address:     data.address     || null,
      pin_code:    data.pin_code    || null,
      mobile:      data.mobile      || null,
      reference:   data.reference   || null,
    }).eq('id', editing.id)
    setSaving(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Student updated!' })
    setEditOpen(false)
    fetchStudents()
  }

  // ── Password ─────────────────────────────────────────────────────────────────
  const openPw = (s: Profile) => { setEditing(s); pwForm.reset(); setPwOpen(true) }
  const onChangePw = async (data: PwForm) => {
    if (!editing) return
    setSaving(true)
    const { error } = await db.rpc('admin_update_student_password', { p_user_id: editing.id, p_password: data.password })
    setSaving(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Password updated!' })
    setPwOpen(false)
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const deleteStudent = async (id: string) => {
    if (!confirm('Delete this student and all their exam attempts?')) return
    const { error } = await db.from('profiles').delete().eq('id', id)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Student deleted' })
    setStudents((s) => s.filter((x) => x.id !== id))
  }

  const courseName = (id: string | null) => courses.find((c) => c.id === id)?.title ?? '—'

  if (loading) return <StudentsPageSkeleton />

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} registered student{students.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Student</Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{search ? 'No students match your search.' : 'No students yet.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Mobile</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Course</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Joined</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs shrink-0">
                        {(s.full_name ?? s.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{s.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{s.mobile || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-600">{courseName(s.course_id)}</td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDateShort(s.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" title="Change Password" onClick={() => openPw(s)}><KeyRound className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete" onClick={() => deleteStudent(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Student Dialog ───────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
          <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4 pt-2">

            <div className="grid grid-cols-2 gap-4">
              <Field label="Name of Student *" error={addForm.formState.errors.full_name?.message}>
                <Input placeholder="Full name" {...addForm.register('full_name')} />
              </Field>
              <Field label="Date of Birth *" error={addForm.formState.errors.dob?.message}>
                <Input type="date" {...addForm.register('dob')} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Course *" error={addForm.formState.errors.course_id?.message}>
                <Select value={addCourse} onValueChange={(v) => { setAddCourse(v); addForm.setValue('course_id', v) }}>
                  <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Duration of Course">
                <Input value={addDuration} readOnly placeholder="Auto-filled" className="bg-gray-50 text-gray-500 cursor-not-allowed" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Father's Name *" error={addForm.formState.errors.father_name?.message}>
                <Input placeholder="Father's full name" {...addForm.register('father_name')} />
              </Field>
              <Field label="Mother's Name *" error={addForm.formState.errors.mother_name?.message}>
                <Input placeholder="Mother's full name" {...addForm.register('mother_name')} />
              </Field>
            </div>

            <Field label="Full Address *" error={addForm.formState.errors.address?.message}>
              <Input placeholder="House no., Street, Area, City, State" {...addForm.register('address')} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="PIN Code *" error={addForm.formState.errors.pin_code?.message}>
                <Input placeholder="6-digit PIN" maxLength={6} {...addForm.register('pin_code')} />
              </Field>
              <Field label="Mobile Number *" error={addForm.formState.errors.mobile?.message}>
                <Input placeholder="10-digit mobile" maxLength={10} {...addForm.register('mobile')} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Email Address *" error={addForm.formState.errors.email?.message}>
                <Input type="email" placeholder="student@example.com" {...addForm.register('email')} />
              </Field>
              <Field label="Password *" error={addForm.formState.errors.password?.message}>
                <Input type="password" placeholder="Min 6 characters" {...addForm.register('password')} />
              </Field>
            </div>

            <Field label="Reference (optional)">
              <Input placeholder="Referred by (name or code)" {...addForm.register('reference')} />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Student
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Student Dialog ──────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4 pt-2">

            <div className="grid grid-cols-2 gap-4">
              <Field label="Name of Student *" error={editForm.formState.errors.full_name?.message}>
                <Input {...editForm.register('full_name')} />
              </Field>
              <Field label="Date of Birth">
                <Input type="date" {...editForm.register('dob')} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Course">
                <Select value={editCourse} onValueChange={(v) => { setEditCourse(v); editForm.setValue('course_id', v) }}>
                  <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Duration of Course">
                <Input value={editDuration} readOnly placeholder="Auto-filled" className="bg-gray-50 text-gray-500 cursor-not-allowed" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Father's Name">
                <Input {...editForm.register('father_name')} />
              </Field>
              <Field label="Mother's Name">
                <Input {...editForm.register('mother_name')} />
              </Field>
            </div>

            <Field label="Full Address">
              <Input {...editForm.register('address')} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="PIN Code">
                <Input maxLength={6} {...editForm.register('pin_code')} />
              </Field>
              <Field label="Mobile Number">
                <Input maxLength={10} {...editForm.register('mobile')} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Email Address *" error={editForm.formState.errors.email?.message}>
                <Input type="email" {...editForm.register('email')} />
              </Field>
              <Field label="Reference">
                <Input {...editForm.register('reference')} />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Dialog ───────────────────────────────────────────── */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Password — {editing?.full_name || editing?.email}</DialogTitle></DialogHeader>
          <form onSubmit={pwForm.handleSubmit(onChangePw)} className="space-y-4">
            <Field label="New Password" error={pwForm.formState.errors.password?.message}>
              <Input type="password" placeholder="Min 6 characters" {...pwForm.register('password')} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Password
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
