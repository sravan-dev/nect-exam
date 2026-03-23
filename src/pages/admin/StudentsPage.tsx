import { useEffect, useState } from 'react'
import { Users, Plus, Pencil, Trash2, Loader2, Search, KeyRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/hooks/useToast'
import { formatDateShort } from '@/lib/utils'

const addSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email:     z.string().email('Valid email required'),
  password:  z.string().min(6, 'Minimum 6 characters'),
})
const editSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email:     z.string().email('Valid email required'),
})
const pwSchema = z.object({
  password: z.string().min(6, 'Minimum 6 characters'),
})

type AddForm  = z.infer<typeof addSchema>
type EditForm = z.infer<typeof editSchema>
type PwForm   = z.infer<typeof pwSchema>

export default function StudentsPage() {
  const [students, setStudents]     = useState<Profile[]>([])
  const [filtered, setFiltered]     = useState<Profile[]>([])
  const [loading,  setLoading]      = useState(true)
  const [search,   setSearch]       = useState('')
  const [saving,   setSaving]       = useState(false)

  const [addOpen,  setAddOpen]      = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [pwOpen,   setPwOpen]       = useState(false)
  const [editing,  setEditing]      = useState<Profile | null>(null)

  const addForm  = useForm<AddForm>({  resolver: zodResolver(addSchema) })
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })
  const pwForm   = useForm<PwForm>({  resolver: zodResolver(pwSchema) })

  const fetchStudents = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false })
    setStudents(data ?? [])
    setFiltered(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchStudents() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(students.filter((s) =>
      (s.full_name ?? '').toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    ))
  }, [search, students])

  // ── Add student ───────────────────────────────────────────────────────────
  const onAdd = async (data: AddForm) => {
    setSaving(true)
    const { error } = await supabase.rpc('admin_create_student', {
      p_email:     data.email,
      p_password:  data.password,
      p_full_name: data.full_name,
    })
    setSaving(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Student added!' })
    addForm.reset()
    setAddOpen(false)
    fetchStudents()
  }

  // ── Edit student ──────────────────────────────────────────────────────────
  const openEdit = (s: Profile) => {
    setEditing(s)
    editForm.reset({ full_name: s.full_name ?? '', email: s.email })
    setEditOpen(true)
  }
  const onEdit = async (data: EditForm) => {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: data.full_name,
      email:     data.email,
    }).eq('id', editing.id)
    setSaving(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Student updated!' })
    setEditOpen(false)
    fetchStudents()
  }

  // ── Change password ───────────────────────────────────────────────────────
  const openPw = (s: Profile) => {
    setEditing(s)
    pwForm.reset()
    setPwOpen(true)
  }
  const onChangePw = async (data: PwForm) => {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase.rpc('admin_update_student_password', {
      p_user_id:  editing.id,
      p_password: data.password,
    })
    setSaving(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Password updated!' })
    setPwOpen(false)
  }

  // ── Delete student ────────────────────────────────────────────────────────
  const deleteStudent = async (id: string) => {
    if (!confirm('Delete this student and all their exam attempts?')) return
    // Delete from profiles (cascade will handle related data)
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Student deleted' })
    setStudents((s) => s.filter((x) => x.id !== id))
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} registered student{students.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Student</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
            <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="e.g. Rahul Kumar" {...addForm.register('full_name')} />
                {addForm.formState.errors.full_name && <p className="text-xs text-destructive">{addForm.formState.errors.full_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="student@example.com" {...addForm.register('email')} />
                {addForm.formState.errors.email && <p className="text-xs text-destructive">{addForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="Min 6 characters" {...addForm.register('password')} />
                {addForm.formState.errors.password && <p className="text-xs text-destructive">{addForm.formState.errors.password.message}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Student
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{search ? 'No students match your search.' : 'No students yet. Add your first student.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Joined</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                        {(s.full_name ?? s.email)[0].toUpperCase()}
                      </div>
                      {s.full_name || '—'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{s.email}</td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDateShort(s.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" title="Change Password" onClick={() => openPw(s)}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                        onClick={() => deleteStudent(s.id)}>
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...editForm.register('full_name')} />
              {editForm.formState.errors.full_name && <p className="text-xs text-destructive">{editForm.formState.errors.full_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...editForm.register('email')} />
              {editForm.formState.errors.email && <p className="text-xs text-destructive">{editForm.formState.errors.email.message}</p>}
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

      {/* Change Password Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Password — {editing?.full_name || editing?.email}</DialogTitle></DialogHeader>
          <form onSubmit={pwForm.handleSubmit(onChangePw)} className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" placeholder="Min 6 characters" {...pwForm.register('password')} />
              {pwForm.formState.errors.password && <p className="text-xs text-destructive">{pwForm.formState.errors.password.message}</p>}
            </div>
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
