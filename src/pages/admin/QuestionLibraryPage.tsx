import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit, Loader2, Upload, CheckSquare, Square } from 'lucide-react'
import { db } from '@/lib/api'
import type { QuestionLibraryItem, QuestionType } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/useToast'
import JSZip from 'jszip'

interface LibraryDialogState {
  open: boolean
  mode: 'add' | 'edit'
  item: QuestionLibraryItem | null
}

const defaultOptions = [{ text: '', is_correct: false }, { text: '', is_correct: false }]

type ParsedQuestion = { prompt: string; options: string[]; correctIndex: number | null }

export default function QuestionLibraryPage() {
  const [items, setItems] = useState<QuestionLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<LibraryDialogState>({ open: false, mode: 'add', item: null })
  const [prompt, setPrompt] = useState<string>('')
  const [points, setPoints] = useState<number>(1)
  const [qType, setQType] = useState<QuestionType>('mcq')
  const [explanation, setExplanation] = useState<string>('')
  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>(defaultOptions)
  const [importing, setImporting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const allSelected = items.length > 0 && selected.size === items.length
  const toggleOne = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map(i => i.id)))

  const deleteSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} question(s)?`)) return
    setDeleting(true)
    let failed = 0
    for (const id of selected) {
      const { error } = await db.from('question_library').delete().eq('id', id)
      if (error) failed++
    }
    setDeleting(false)
    setSelected(new Set())
    if (failed > 0) toast({ title: `${failed} deletion(s) failed`, variant: 'destructive' })
    else toast({ title: `${selected.size} question(s) deleted` })
    fetchItems()
  }

  const fetchItems = async () => {
    setLoading(true)
    const { data, error } = await db.from('question_library').select('*').order('created_at', { ascending: false })
    setLoading(false)
    if (error) { toast({ title: 'Failed to load library', description: error.message, variant: 'destructive' }); return }
    setItems(data ?? [])
    setSelected(new Set())
  }

  useEffect(() => { fetchItems() }, [])

  const openAdd = () => {
    setDialog({ open: true, mode: 'add', item: null })
    setPrompt('')
    setPoints(1)
    setQType('mcq')
    setExplanation('')
    setOptions(defaultOptions)
  }

  const openEdit = (item: QuestionLibraryItem) => {
    setDialog({ open: true, mode: 'edit', item })
    setPrompt(item.prompt)
    setPoints(item.points)
    setQType(item.type)
    setExplanation(item.explanation ?? '')
    if (item.type === 'mcq') {
      const opts = options.length >= 2 ? options : defaultOptions
      setOptions(opts)
    } else {
      setOptions([])
    }
  }

  const saveItem = async () => {
    if (!prompt.trim()) { toast({ title: 'Prompt is required', variant: 'destructive' }); return }
    if (qType === 'mcq' && options.filter((o) => o.text.trim()).length < 2) {
      toast({ title: 'At least 2 options required for MCQ', variant: 'destructive' }); return
    }

    if (dialog.mode === 'add') {
      const { error } = await db.from('question_library').insert({ type: qType, prompt, points, explanation: explanation || null })
      if (error) { toast({ title: 'Create failed', description: error.message, variant: 'destructive' }); return }
      toast({ title: 'Question added to library' })
    } else if (dialog.item) {
      const { error } = await db.from('question_library').update({ type: qType, prompt, points, explanation: explanation || null }).eq('id', dialog.item.id)
      if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return }
      toast({ title: 'Question updated' })
    }

    setDialog({ open: false, mode: 'add', item: null })
    fetchItems()
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this library question?')) return
    const { error } = await db.from('question_library').delete().eq('id', id)
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Question deleted' })
    fetchItems()
  }

  const parseDocxToText = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)
    const xmlFile = zip.file('word/document.xml')
    if (!xmlFile) throw new Error('Invalid DOCX file')
    const xml = await xmlFile.async('string')
    const dom = new DOMParser().parseFromString(xml, 'application/xml')
    const paragraphs = Array.from(dom.getElementsByTagName('w:p'))
    return paragraphs.map((p) => Array.from(p.getElementsByTagName('w:t')).map((t) => t.textContent || '').join('')).join('\n')
  }

  const normalizeDocxLines = (rawLines: string[]): string[] => {
    const out: string[] = []
    for (const raw of rawLines) {
      const line = raw.trim()
      if (!line) continue

      const isQuestion = /^\s*(?:Q\s*)?\d+\s*[\.\)]/.test(line)
      const isChoice = /^\s*[A-Da-d]\s*[\.\)]/.test(line)
      const isAnswerLabel = /^\s*(?:Correct Answer|Answer)\s*[:\-]?/i.test(line)

      if (out.length === 0) {
        out.push(line)
        continue
      }

      const prev = out[out.length - 1]
      const prevIsQuestion = /^\s*(?:Q\s*)?\d+\s*[\.\)]/.test(prev)
      const prevIsChoice = /^\s*[A-Da-d]\s*[\.\)]/.test(prev)

      if (!isQuestion && !isChoice && !isAnswerLabel && (prevIsChoice || prevIsQuestion)) {
        out[out.length - 1] = `${prev} ${line}`
      } else {
        out.push(line)
      }
    }
    return out
  }

  const parseQuestionsFromDocxText = (text: string): ParsedQuestion[] => {
    const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const lines = normalizeDocxLines(rawLines)
    const result: ParsedQuestion[] = []
    let current: ParsedQuestion | null = null
    let awaitingAnswer = false

    const applyAnswerValue = (value: string) => {
      if (!current) return
      const answerValue = value.trim()
      const letterMatch = answerValue.match(/^([A-Da-d])/)
      if (letterMatch) {
        const idx = 'ABCD'.indexOf(letterMatch[1].toUpperCase())
        if (idx >= 0 && idx < current.options.length) {
          current.correctIndex = idx
          return
        }
      }
      const idx = current.options.findIndex((opt) => opt.toLowerCase().includes(answerValue.toLowerCase()))
      if (idx >= 0) current.correctIndex = idx
    }

    const flushCurrent = () => {
      if (current) {
        if (current.options.length > 0 && current.correctIndex === null) current.correctIndex = 0
        result.push(current)
        current = null
      }
    }

    for (const line of lines) {
      // Skip footer/note lines that are not questions
      if (/^\s*Note\s*[:\-]/i.test(line)) continue

      const qMatch = line.match(/^\s*(?:Q\s*)?(\d+)\s*[\.\)]\s*(.*)$/i)
      const choiceMatch = line.match(/^\s*([A-Da-d])\s*[\.\)]\s*(.*)$/i)
      const answerMatch = line.match(/^\s*(?:Correct Answer|Answer)\s*[:\-]?\s*(.*)$/i)

      if (awaitingAnswer) {
        applyAnswerValue(line)
        awaitingAnswer = false
        continue
      }

      if (qMatch) {
        flushCurrent()
        current = { prompt: qMatch[2].replace(/[✔✓✗✘☑☒✅]/g, '').trim(), options: [], correctIndex: null }
      } else if (choiceMatch && current) {
        // Strip checkmark characters (✔ ✓ etc.) that may appear on correct options
        current.options.push(choiceMatch[2].replace(/[✔✓✗✘☑☒✅]/g, '').trim())
      } else if (answerMatch && current) {
        const value = answerMatch[1].trim()
        if (value) applyAnswerValue(value)
        else awaitingAnswer = true
      } else if (current) {
        if (current.options.length > 0) {
          current.options[current.options.length - 1] = `${current.options[current.options.length - 1]} ${line}`.trim()
        } else {
          current.prompt = `${current.prompt} ${line}`.trim()
        }
      } else {
        current = { prompt: line, options: [], correctIndex: null }
      }
    }

    flushCurrent()
    return result
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast({ title: 'Only DOCX supported', variant: 'destructive' }); return
    }
    setImporting(true)
    try {
      const text = await parseDocxToText(file)
      const questions = parseQuestionsFromDocxText(text)
      if (questions.length === 0) { toast({ title: 'No questions found', variant: 'destructive' }); return }

      setUploadProgress(5)
      const totalQuestions = questions.length

      for (let idx = 0; idx < totalQuestions; idx += 1) {
        const q = questions[idx]
        const { data: insertedQuestion, error: qErr } = await db.from('question_library').insert({
          type: q.options.length >= 2 ? 'mcq' : 'short_answer',
          prompt: q.prompt,
          points: 1,
          explanation: null,
        }).select().single()

        if (qErr || !insertedQuestion) {
          console.error('Question library insert failed', qErr)
          continue
        }

        if (q.options.length >= 2) {
          const inserts = q.options.map((opt, i) => ({
            question_library_id: insertedQuestion.id,
            text: opt,
            is_correct: i === (q.correctIndex ?? 0),
            position: i,
          }))
          const { error: optErr } = await db.from('question_library_options').insert(inserts)
          if (optErr) {
            console.error('Question library options insert failed', optErr)
          }
        }

        setUploadProgress(Math.round(((idx + 1) / totalQuestions) * 100))
      }
      toast({ title: 'Imported into library', description: `${questions.length} questions added` })
      fetchItems()
    } catch (err) {
      toast({ title: 'Import failed', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setImporting(false)
      setUploadProgress(0)
      event.target.value = ''
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Question Library</h1>
          <p className="text-sm text-gray-500">Manage shared question templates for exams.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => document.getElementById('library-upload-docx')?.click()} disabled={importing}>
            <Upload className="mr-2 h-4 w-4" />
            Upload DOCX
          </Button>
          <input
            id="library-upload-docx"
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleUpload}
            disabled={importing}
          />
          <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Question</Button>
        </div>
      </div>

      {uploadProgress > 0 && (
        <div>
          <div className="h-2 w-full rounded bg-slate-200 overflow-hidden">
            <div className="h-2 rounded bg-blue-600 transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="mt-1 text-xs text-gray-500">Import progress: {uploadProgress}%</p>
        </div>
      )}

      {/* Bulk action bar — visible when at least one item is selected */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-gray-50 px-4 py-2">
          <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            {allSelected
              ? <CheckSquare className="h-4 w-4 text-blue-600" />
              : <Square className="h-4 w-4" />}
            {allSelected ? 'Deselect all' : `Select all (${items.length})`}
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-sm text-gray-600">{selected.size} selected</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={deleteSelected}
                disabled={deleting}
                className="ml-auto"
              >
                {deleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
                Delete selected
              </Button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-500">No library questions yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isSelected = selected.has(item.id)
            return (
              <Card
                key={item.id}
                className={`cursor-pointer transition-colors ${isSelected ? 'border-blue-400 bg-blue-50' : ''}`}
                onClick={() => toggleOne(item.id)}
              >
                <CardContent className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      className="mt-0.5 shrink-0"
                      onClick={e => { e.stopPropagation(); toggleOne(item.id) }}
                    >
                      {isSelected
                        ? <CheckSquare className="h-4 w-4 text-blue-600" />
                        : <Square className="h-4 w-4 text-gray-400" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-mono">{item.type.toUpperCase()}</span>
                        <span className="text-xs text-gray-400">{item.points} pt</span>
                      </div>
                      <p className="text-sm font-semibold">{item.prompt}</p>
                      {item.explanation && <p className="text-xs text-gray-500 mt-1">{item.explanation}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, mode: 'add', item: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.mode === 'add' ? 'Add Library Question' : 'Edit Library Question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <select className="w-full border rounded p-2" value={qType} onChange={(e) => setQType(e.target.value as QuestionType)}>
                <option value="mcq">MCQ</option>
                <option value="true_false">True/False</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Prompt</Label>
              <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Points</Label>
              <Input type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Explanation (optional)</Label>
              <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog({ open: false, mode: 'add', item: null })}>Cancel</Button>
              <Button onClick={saveItem}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
