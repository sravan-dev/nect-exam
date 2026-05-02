import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

// ── Primitives ────────────────────────────────────────────────────────────────

function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <Skeleton className={`h-4 ${i === 0 ? 'w-36' : i === cols - 1 ? 'w-16' : 'w-24'}`} />
        </td>
      ))}
    </tr>
  )
}

function SkeletonTableHead({ labels }: { labels: string[] }) {
  return (
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        {labels.map((l) => (
          <th key={l} className="text-left px-5 py-3 font-medium text-gray-400 text-sm">{l}</th>
        ))}
      </tr>
    </thead>
  )
}

// ── Stat Cards ────────────────────────────────────────────────────────────────

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Generic Table ─────────────────────────────────────────────────────────────

export function TableSkeleton({
  cols = 5,
  rows = 6,
  headers,
}: {
  cols?: number
  rows?: number
  headers?: string[]
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        {headers
          ? <SkeletonTableHead labels={headers} />
          : (
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {Array.from({ length: cols }).map((_, i) => (
                  <th key={i} className="px-5 py-3">
                    <Skeleton className="h-3.5 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Card Grid ─────────────────────────────────────────────────────────────────

export function CardGridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-8 w-full rounded-md mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────────────────────

export function PageHeaderSkeleton({ hasButton = true }: { hasButton?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      {hasButton && <Skeleton className="h-9 w-32 rounded-md" />}
    </div>
  )
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

export function AdminDashboardSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>

      <StatCardsSkeleton count={4} />

      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Student Dashboard ─────────────────────────────────────────────────────────

export function StudentDashboardSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>

      <StatCardsSkeleton count={4} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-16" />
        </div>
        <CardGridSkeleton count={3} cols={3} />
      </div>
    </div>
  )
}

// ── Courses Page ──────────────────────────────────────────────────────────────

export function CoursesPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <PageHeaderSkeleton />
      {/* Trade filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <CardGridSkeleton count={6} cols={3} />
    </div>
  )
}

// ── Exams List Page ───────────────────────────────────────────────────────────

export function ExamsListSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <PageHeaderSkeleton />
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <TableSkeleton
        headers={['Exam', 'Course / Trade', 'Status', 'Schedule', '']}
        rows={6}
        cols={5}
      />
    </div>
  )
}

// ── Students Page ─────────────────────────────────────────────────────────────

export function StudentsPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-9 w-64 rounded-md" />
      <TableSkeleton
        headers={['Name', 'Mobile', 'Course', 'Joined', 'Status', '']}
        rows={7}
        cols={6}
      />
    </div>
  )
}

// ── Trades Page ───────────────────────────────────────────────────────────────

export function TradesPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3.5 w-12 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-3.5 w-full" />
              <div className="flex justify-between pt-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-24 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Admin Results Page ────────────────────────────────────────────────────────

export function AdminResultsSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
        <CardContent>
          <TableSkeleton
            headers={['Student', 'Exam', 'Status', 'Score', 'Result', 'Submitted', '']}
            rows={5}
            cols={7}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Student Exams Page ────────────────────────────────────────────────────────

export function StudentExamsSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-1/2" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-8 w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Student Results Page ──────────────────────────────────────────────────────

export function StudentResultsSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      {/* 3 stat mini-cards */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 text-center space-y-2">
              <Skeleton className="h-6 w-6 rounded-full mx-auto" />
              <Skeleton className="h-7 w-10 mx-auto" />
              <Skeleton className="h-3.5 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-20" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
