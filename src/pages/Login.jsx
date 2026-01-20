import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import { Link2, LayoutDashboard, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'

export default function Login() {
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState(null)
    const [error, setError] = useState(null)
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

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        if (isSignUp) {
            // Sign Up
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            })
            if (error) {
                setError(error.message)
            } else {
                setMessage("Account created! You can now log in (check email for verification if enforced).")
                setIsSignUp(false) // Switch to login mode
            }
        } else {
            // Sign In
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) {
                setError(error.message)
            } else {
                navigate('/dashboard')
            }
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Left Side - Design */}
            <div className="hidden lg:flex w-1/2 bg-black items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black z-0"></div>
                <div className="z-10 text-white p-12 max-w-lg">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                            <img src="/logo.jpg" alt="LCM Logo" className="w-10 h-10 object-contain" />
                        </div>
                        <span className="text-2xl font-bold">LCM Global Solution</span>
                    </div>
                    <h1 className="text-4xl font-bold mb-6">Connect Globally,<br />Track Locally</h1>
                    <p className="text-gray-400 text-lg leading-relaxed">
                        Intelligent Link Management for the modern enterprise. Shorten, track, and optimize your global reach.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="w-10 h-10 bg-black rounded-lg overflow-hidden">
                            <img src="/logo.jpg" alt="LCM Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xl font-bold">LCM Global Solution</span>
                    </div>

                    <h2 className="text-2xl font-bold mb-2">{isSignUp ? 'Create an account' : 'Welcome back'}</h2>
                    <p className="text-gray-500 mb-8">
                        {isSignUp ? 'Start your free trial today.' : 'Enter your details to access your dashboard.'}
                    </p>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none transition-all"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 size={18} className="animate-spin" />}
                            {isSignUp ? 'Sign Up' : 'Sign In'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                            Alert: {error}
                        </div>
                    )}

                    {message && (
                        <div className="mt-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100">
                            {message}
                        </div>
                    )}

                    <div className="mt-6 text-center text-sm text-gray-500">
                        {isSignUp ? "Already have an account?" : "Don't have an account?"}
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp)
                                setError(null)
                                setMessage(null)
                            }}
                            className="ml-2 font-medium text-black hover:underline"
                        >
                            {isSignUp ? 'Log in' : 'Sign up'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
