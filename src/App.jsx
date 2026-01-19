import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RedirectLink from './pages/RedirectLink'

function AuthGuard({ children }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      }
      setLoading(false)
    })

    // Listen for auth changes (Magic Link login, Sign out, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Just logged in or session refreshed
      } else if (event === 'SIGNED_OUT') {
        navigate('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="flex h-screen items-center justify-center">Loading your session...</div>

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />
        <Route path="/:slug" element={<RedirectLink />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}
