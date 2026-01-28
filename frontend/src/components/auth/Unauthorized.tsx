import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Unauthorized() {
  useEffect(() => {
    toast.error('Insufficient permissions')
  }, [])

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-destructive">
            Unauthorized
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            You are not authorized to access this page.
          </p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}