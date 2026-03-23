import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Loader2, Layers, BookOpen, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Trade } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  name:        z.string().min(1, 'Trade name is required'),
  code:        z.string().optional(),
  description: z.string().optional(),
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

interface TradeWithCount extends Trade { course_count: number }

export default function TradesPage() {
  const navigate = useNavigate()
  const [trades,  setTrades]  = useState<TradeWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing,  setEditing]  = useState<Trade | null>(null)

  const addForm  = useForm<FormData>({ resolver: zodResolver(schema) })
  const editForm = useForm<FormData>({ resolver: zodResolver(schema) })

  const fetchTrades = async () => {
    setLoading(true)
    const [{ data: tradesData }, { data: coursesData }] = await Promise.all([
      supabase.from('trades').select('*').order('name'),
      supabase.from('courses').select('id, trade_id'),
    ])
    const counts: Record<string, number> = {}
    ;(coursesData ?? []).forEach((c) => {
      if (c.trade_id) counts[c.trade_id] = (counts[c.trade_id] ?? 0) + 1
    })
    setTrades((tradesData ?? []).map((t) => ({ ...t, course_count: counts[t.id] ?? 0 })))
    setLoading(false)
  }

  useEffect(() => { fetchTrades() }, [])

  const onAdd = async (data: FormData) => {
    setSaving(true)
    const { error } = await supabase.from('trades').insert(data)
    setSaving(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Trade created!' })
    addForm.reset()
    setAddOpen(false)
    fetchTrades()
  }

  const openEdit = (t: Trade) => {
    setEditing(t)
    editForm.reset({ name: t.name, code: t.code ?? '', description: t.description ?? '' })
    setEditOpen(true)
  }

  const onEdit = async (data: FormData) => {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase.from('trades').update(data).eq('id', editing.id)
    setSaving(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Trade updated!' })
    setEditOpen(false)
    fetchTrades()
  }

  const deleteTrade = async (id: string) => {
    if (!confirm('Delete this trade? Courses under it will become uncategorised.')) return
    const { error } = await supabase.from('trades').delete().eq('id', id)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Trade deleted' })
    fetchTrades()
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trades</h1>
          <p className="text-gray-500 text-sm mt-1">{trades.length} trade{trades.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Trade</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Trade</DialogTitle></DialogHeader>
            <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4">
              <div className="space-y-2">
                <Label>Trade Name</Label>
                <Input placeholder="e.g. Electrician" {...addForm.register('name')} />
                {addForm.formState.errors.name && <p className="text-xs text-destructive">{addForm.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Code <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input placeholder="e.g. ELE" maxLength={8} {...addForm.register('code')} />
              </div>
              <div className="space-y-2">
                <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Textarea placeholder="Brief description..." {...addForm.register('description')} />
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
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : trades.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No trades yet. Create your first trade to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trades.map((trade) => {
            const colour = (trade.code && BADGE_COLOURS[trade.code]) || DEFAULT_COLOUR
            return (
              <Card key={trade.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Layers className="h-5 w-5 text-blue-600" />
                      </div>
                      {trade.code && (
                        <Badge variant="outline" className={`text-xs ${colour}`}>{trade.code}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(trade)}
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteTrade(trade.id)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">{trade.name}</h3>
                  {trade.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{trade.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <BookOpen className="h-3.5 w-3.5" />
                      {trade.course_count} course{trade.course_count !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => navigate(`/admin/courses?trade=${trade.id}`)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                    >
                      View Courses <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Trade</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Trade Name</Label>
              <Input {...editForm.register('name')} />
              {editForm.formState.errors.name && <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input maxLength={8} {...editForm.register('code')} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...editForm.register('description')} />
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
