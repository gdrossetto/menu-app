import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { QrCode } from 'lucide-react'
import { useToast } from '../components/toastContext'
import { getErrorMessage, logger } from '../lib/logger'

export default function Login() {
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        toast.success(
          'Account created',
          'Check your email for the login link. If email confirmation is disabled, you can log in now.',
        )
        setIsSignUp(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (err: unknown) {
      const message = getErrorMessage(
        err,
        'An error occurred during authentication',
      )
      logger.error('Authentication flow failed.', err, {
        mode: isSignUp ? 'sign_up' : 'sign_in',
        email,
      })
      setError(message)
      toast.error('Authentication failed', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-screen-center p-8">
      <div className="card animate-fade-in w-full max-w-md border-none bg-app-surface px-10 py-12 shadow-app-md">
        <div className="mb-10 text-center">
          <div className="mb-4 flex justify-center">
            <QrCode className="h-10 w-10 text-app-primary" />
          </div>
          <h1 className="m-0 text-[1.75rem] font-bold tracking-[-0.02em] text-app-primary">MenuQR</h1>
          <p className="mt-2 text-[0.95rem] text-app-text-muted">
            {isSignUp ? 'Create your account' : 'Sign in to manage your menu'}
          </p>
        </div>
        
        {error && (
          <div className="app-danger-banner mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@restaurant.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn btn-primary mt-2.5 w-full py-3" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button" 
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }} 
            className="btn btn-ghost"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}
