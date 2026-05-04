import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function ExamSubmittedPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-8 space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-green-100 rounded-full">
              <CheckCircle className="h-14 w-14 text-green-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Thank You!</h1>
            <p className="text-gray-500">Your exam has been submitted successfully.</p>
          </div>
          <Button className="w-full" onClick={() => navigate('/student', { replace: true })}>
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
