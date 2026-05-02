import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GraduationCap, Loader2 } from 'lucide-react'
import { db } from '@/lib/api'
import type { Course } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  full_name:   z.string().min(2, 'Name is required'),
  course_id:   z.string().min(1, 'Please select a course'),
  dob:         z.string().min(1, 'Date of birth is required'),
  father_name: z.string().min(2, 'Father name is required'),
  mother_name: z.string().min(2, 'Mother name is required'),
  address:     z.string().min(5, 'Address is required'),
  pin_code:    z.string().regex(/^\d{6}$/, 'Enter valid 6-digit PIN'),
  mobile:      z.string().regex(/^\d{10}$/, 'Enter valid 10-digit mobile number'),
  email:       z.string().email('Invalid email address'),
  password:    z.string().min(6, 'Minimum 6 characters'),
  reference:   z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const [loading,   setLoading]   = useState(false)
  const [courses,   setCourses]   = useState<Course[]>([])
  const [duration,  setDuration]  = useState('')
  const [courseVal, setCourseVal] = useState('')

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    db.from('courses').select('*').order('title').then(({ data }) => {
      setCourses((data as Course[]) ?? [])
    })
  }, [])

  const handleCourseChange = (id: string) => {
    setCourseVal(id)
    setValue('course_id', id)
    const course = courses.find((c) => c.id === id)
    setDuration(course?.duration ?? '')
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const { error } = await db.auth.signUp({
      email:    data.email,
      password: data.password,
      options:  {
        data: {
          full_name:   data.full_name,
          role:        'student',
          dob:         data.dob,
          father_name: data.father_name,
          mother_name: data.mother_name,
          address:     data.address,
          pin_code:    data.pin_code,
          mobile:      data.mobile,
          course_id:   data.course_id,
          reference:   data.reference ?? '',
        },
      },
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Registration failed', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Account created!', description: 'You can now sign in.' })
    navigate('/login')
  }

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-10">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-blue-600 rounded-xl">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join NECT Exam platform — fill in all details below</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* ── Personal Info ──────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name of Student *" error={errors.full_name?.message}>
                <Input placeholder="Full name" {...register('full_name')} />
              </Field>

              <Field label="Date of Birth *" error={errors.dob?.message}>
                <Input type="date" {...register('dob')} />
              </Field>
            </div>

            {/* ── Course ────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Course *" error={errors.course_id?.message}>
                <Select value={courseVal} onValueChange={handleCourseChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Duration of Course">
                <Input
                  value={duration}
                  readOnly
                  placeholder="Auto-filled on course selection"
                  className="bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </Field>
            </div>

            {/* ── Family ────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Father's Name *" error={errors.father_name?.message}>
                <Input placeholder="Father's full name" {...register('father_name')} />
              </Field>

              <Field label="Mother's Name *" error={errors.mother_name?.message}>
                <Input placeholder="Mother's full name" {...register('mother_name')} />
              </Field>
            </div>

            {/* ── Address ───────────────────────────────────── */}
            <Field label="Full Address *" error={errors.address?.message}>
              <Input placeholder="House no., Street, Area, City, State" {...register('address')} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="PIN Code *" error={errors.pin_code?.message}>
                <Input placeholder="6-digit PIN code" maxLength={6} {...register('pin_code')} />
              </Field>

              <Field label="Mobile Number *" error={errors.mobile?.message}>
                <Input placeholder="10-digit mobile number" maxLength={10} {...register('mobile')} />
              </Field>
            </div>

            {/* ── Account ───────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email Address *" error={errors.email?.message}>
                <Input type="email" placeholder="you@example.com" {...register('email')} />
              </Field>

              <Field label="Password *" error={errors.password?.message}>
                <Input type="password" placeholder="Minimum 6 characters" {...register('password')} />
              </Field>
            </div>

            {/* ── Reference ─────────────────────────────────── */}
            <Field label="Reference (optional)" error={errors.reference?.message}>
              <Input placeholder="Referred by (name or code)" {...register('reference')} />
            </Field>

            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
