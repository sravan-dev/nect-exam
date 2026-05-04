import { User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function StudentProfilePage() {
  const { profile } = useAuthStore()

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-xl">
          <User className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">View your details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input value={profile?.email ?? ''} disabled className="mt-1 bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <Input value={profile?.full_name ?? ''} disabled className="mt-1" placeholder="Full name" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Mobile</label>
            <Input value={profile?.mobile ?? ''} disabled className="mt-1" placeholder="Mobile number" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Date of Birth</label>
            <Input type="date" value={profile?.dob ?? ''} disabled className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Family Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Father's Name</label>
            <Input value={profile?.father_name ?? ''} disabled className="mt-1" placeholder="Father's name" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Mother's Name</label>
            <Input value={profile?.mother_name ?? ''} disabled className="mt-1" placeholder="Mother's name" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <textarea
              value={profile?.address ?? ''}
              disabled
              rows={3}
              placeholder="Full address"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">PIN Code</label>
            <Input value={profile?.pin_code ?? ''} disabled className="mt-1" placeholder="PIN code" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
