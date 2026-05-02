import { useEffect, useState } from 'react'
import { BarChart2, Users, FileText, TrendingUp, Award, AlertTriangle } from 'lucide-react'
import { db } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// ── Types ──────────────────────────────────────────────────────────────────────
interface AttemptRow {
  id: string
  passed: boolean | null
  score_pct: number | null
  status: string
  exam_id: string
  student_id: string
  exams: { title: string } | null
  profiles: { full_name: string } | null
}

interface ResponseRow {
  id: string
  is_correct: boolean | null
  question_id: string
  questions: { prompt: string; type: string } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 100)
}

function avg(nums: number[]) {
  return nums.length === 0 ? 0 : Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ReportsSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <div className="h-8 w-48"><Skeleton className="h-full w-full" /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      db.from('attempts')
        .select('id, passed, score_pct, status, exam_id, student_id, exams(title), profiles(full_name)')
        .order('id', { ascending: false }),
      db.from('responses')
        .select('id, is_correct, question_id, questions(prompt, type)'),
    ]).then(([attRes, resRes]) => {
      setAttempts((attRes.data ?? []) as AttemptRow[])
      setResponses((resRes.data ?? []) as ResponseRow[])
      setLoading(false)
    })
  }, [])

  if (loading) return <ReportsSkeleton />

  // ── Overview calculations ──────────────────────────────────────────────────
  const graded = attempts.filter((a) => a.status === 'graded' || a.status === 'submitted')
  const gradedWithScore = graded.filter((a) => a.score_pct != null)
  const totalStudents = new Set(attempts.map((a) => a.student_id)).size
  const totalExams    = new Set(attempts.map((a) => a.exam_id)).size
  const passedCount   = graded.filter((a) => a.passed === true).length
  const overallPassRate = pct(passedCount, graded.length)
  const overallAvgScore = avg(gradedWithScore.map((a) => a.score_pct!))

  // ── Exam performance ───────────────────────────────────────────────────────
  const examMap: Record<string, { title: string; attempts: AttemptRow[] }> = {}
  for (const a of attempts) {
    if (!examMap[a.exam_id]) examMap[a.exam_id] = { title: a.exams?.title ?? 'Unknown', attempts: [] }
    examMap[a.exam_id].attempts.push(a)
  }
  const examRows = Object.entries(examMap).map(([examId, { title, attempts: rows }]) => {
    const g = rows.filter((r) => r.status === 'graded' || r.status === 'submitted')
    const scored = g.filter((r) => r.score_pct != null)
    return {
      examId,
      title,
      total: rows.length,
      passRate: pct(g.filter((r) => r.passed).length, g.length),
      avgScore: avg(scored.map((r) => r.score_pct!)),
    }
  }).sort((a, b) => b.total - a.total)

  // ── Student performance ────────────────────────────────────────────────────
  const studentMap: Record<string, { name: string; attempts: AttemptRow[] }> = {}
  for (const a of attempts) {
    if (!studentMap[a.student_id]) studentMap[a.student_id] = { name: a.profiles?.full_name ?? 'Unknown', attempts: [] }
    studentMap[a.student_id].attempts.push(a)
  }
  const studentRows = Object.entries(studentMap).map(([sid, { name, attempts: rows }]) => {
    const g = rows.filter((r) => r.status === 'graded' || r.status === 'submitted')
    const scored = g.filter((r) => r.score_pct != null)
    return {
      sid,
      name,
      total: rows.length,
      passRate: pct(g.filter((r) => r.passed).length, g.length),
      avgScore: avg(scored.map((r) => r.score_pct!)),
    }
  }).sort((a, b) => b.total - a.total)

  // ── Question analysis ──────────────────────────────────────────────────────
  const qMap: Record<string, { prompt: string; type: string; correct: number; total: number }> = {}
  for (const r of responses) {
    if (!r.question_id || r.questions?.type === 'short_answer') continue
    if (!qMap[r.question_id]) qMap[r.question_id] = { prompt: r.questions?.prompt ?? '', type: r.questions?.type ?? '', correct: 0, total: 0 }
    qMap[r.question_id].total++
    if (r.is_correct) qMap[r.question_id].correct++
  }
  const questionRows = Object.entries(qMap)
    .map(([qid, { prompt, type, correct, total }]) => ({
      qid, prompt, type, correctPct: pct(correct, total), total,
    }))
    .filter((q) => q.total >= 2)
    .sort((a, b) => a.correctPct - b.correctPct)
    .slice(0, 15)

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-blue-600" />
          Reports & Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide performance overview</p>
      </div>

      {/* ── Overview stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5 text-blue-500" />}   label="Total Students"  value={totalStudents} />
        <StatCard icon={<FileText className="h-5 w-5 text-purple-500" />} label="Total Exams"  value={totalExams} />
        <StatCard
          icon={<Award className="h-5 w-5 text-green-500" />}
          label="Pass Rate"
          value={`${overallPassRate}%`}
          sub={`${passedCount} / ${graded.length} attempts`}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
          label="Avg Score"
          value={`${overallAvgScore}%`}
          sub={`${gradedWithScore.length} graded`}
        />
      </div>

      {/* ── Exam performance ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Exam Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-2.5 text-left font-medium">Exam</th>
                  <th className="px-4 py-2.5 text-center font-medium">Attempts</th>
                  <th className="px-4 py-2.5 text-center font-medium">Pass Rate</th>
                  <th className="px-4 py-2.5 text-center font-medium">Avg Score</th>
                  <th className="px-4 py-2.5 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {examRows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No exam data yet</td></tr>
                )}
                {examRows.map((e) => (
                  <tr key={e.examId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{e.title}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{e.total}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${e.passRate >= 60 ? 'text-green-600' : 'text-red-500'}`}>
                        {e.passRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${e.avgScore >= 60 ? 'text-blue-600' : 'text-orange-500'}`}>
                        {e.avgScore}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PassRateBar pct={e.passRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Student performance ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Student Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-2.5 text-left font-medium">Student</th>
                  <th className="px-4 py-2.5 text-center font-medium">Exams Taken</th>
                  <th className="px-4 py-2.5 text-center font-medium">Pass Rate</th>
                  <th className="px-4 py-2.5 text-center font-medium">Avg Score</th>
                  <th className="px-4 py-2.5 text-center font-medium">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {studentRows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No student data yet</td></tr>
                )}
                {studentRows.map((s) => (
                  <tr key={s.sid} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{s.total}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${s.passRate >= 60 ? 'text-green-600' : 'text-red-500'}`}>
                        {s.passRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${s.avgScore >= 60 ? 'text-blue-600' : 'text-orange-500'}`}>
                        {s.avgScore}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StudentBadge passRate={s.passRate} avgScore={s.avgScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Question analysis ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Hardest Questions
            <span className="text-xs font-normal text-gray-400">(lowest correct %, min 2 attempts)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-2.5 text-left font-medium">Question</th>
                  <th className="px-4 py-2.5 text-center font-medium">Type</th>
                  <th className="px-4 py-2.5 text-center font-medium">Attempts</th>
                  <th className="px-4 py-2.5 text-center font-medium">Correct %</th>
                  <th className="px-4 py-2.5 text-center font-medium">Difficulty</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {questionRows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No question data yet</td></tr>
                )}
                {questionRows.map((q) => (
                  <tr key={q.qid} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800 max-w-xs truncate" title={q.prompt}>{q.prompt}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-xs capitalize">{q.type.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{q.total}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${q.correctPct >= 50 ? 'text-green-600' : q.correctPct >= 25 ? 'text-orange-500' : 'text-red-600'}`}>
                        {q.correctPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DifficultyBadge pct={q.correctPct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function PassRateBar({ pct: p }: { pct: number }) {
  const color = p >= 70 ? 'bg-green-500' : p >= 40 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

function StudentBadge({ passRate, avgScore }: { passRate: number; avgScore: number }) {
  const score = (passRate + avgScore) / 2
  if (score >= 80) return <Badge variant="success" className="text-xs">Excellent</Badge>
  if (score >= 60) return <Badge className="text-xs bg-blue-100 text-blue-700 border-0">Good</Badge>
  if (score >= 40) return <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Average</Badge>
  return <Badge variant="destructive" className="text-xs">Needs Help</Badge>
}

function DifficultyBadge({ pct: p }: { pct: number }) {
  if (p >= 70) return <Badge variant="outline" className="text-xs text-green-600 border-green-300">Easy</Badge>
  if (p >= 40) return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">Medium</Badge>
  if (p >= 20) return <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Hard</Badge>
  return <Badge variant="destructive" className="text-xs">Very Hard</Badge>
}
