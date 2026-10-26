import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/common/PasswordInput'
import { auth } from '@/lib/auth'
import { createPageUrl } from '@/lib/utils'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await auth.signInWithPassword(email, password)
      navigate(createPageUrl('Admin'))
    } catch (error) {
      toast.error(error.message ?? 'Could not sign in')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    try {
      await auth.signInWithGoogle()
    } catch (error) {
      toast.error(error.message ?? 'Google sign-in failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center font-display text-2xl font-bold gradient-text">Career Insight</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">Welcome back</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to={createPageUrl('ForgotPassword')} className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <PasswordInput id="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Admin console. Students and contributors sign up in the Career Insight mobile app.
        </p>
      </div>
    </div>
  )
}
