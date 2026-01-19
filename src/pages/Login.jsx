import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [message, setMessage] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        // If already logged in, go to dashboard
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/dashboard')
        })

        // Listen for new login events (specifically magic link completion)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                navigate('/dashboard')
            }
        })
        return () => subscription.unsubscribe()
    }, [])

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        const { error } = await supabase.auth.signInWithOtp({ email })

        if (error) {
            setError(error.message)
        } else {
            setMessage('Check your email for the login link!')
        }
        setLoading(false)
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm">
                <h1 className="text-2xl font-bold mb-6 text-center">Login to Shortener</h1>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    />
                    <button disabled={loading} className="w-full bg-primary text-white p-2 rounded hover:bg-gray-800 disabled:opacity-50">
                        {loading ? 'Sending...' : 'Send Magic Link'}
                    </button>

                    {error && <div className="text-red-500 text-sm text-center mt-2 p-2 bg-red-50 rounded border border-red-200">{error}</div>}
                    {message && <div className="text-green-600 text-sm text-center mt-2 p-2 bg-green-50 rounded border border-green-200">{message}</div>}
                </form>
            </div>
        </div>
    )
}
