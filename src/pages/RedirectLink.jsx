import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'

export default function RedirectLink() {
    const { slug } = useParams()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function getLink() {
            // 1. Try to fetch from real Supabase DB
            const { data, error } = await supabase
                .from('links')
                .select('original')
                .eq('slug', slug)
                .single()

            if (data) {
                // Increment click count (fire and forget)
                supabase.rpc('increment_clicks', { slug_input: slug })

                // Redirect
                window.location.href = data.original
                return
            }

            // 2. If DB fails (table doesn't exist yet), check our "Mock" data for demo purposes
            // (In a real app, this fallback wouldn't exist)
            console.log("Checking mock data...")
            const mockLink = [
                { original: 'https://github.com/obra/superpowers', slug: 'super-powers' },
                { original: 'https://react.dev/reference/react', slug: 'react-docs' }
            ].find(l => l.slug === slug)

            if (mockLink) {
                window.location.href = mockLink.original
                return
            }

            setError('Link not found')
            setLoading(false)
        }

        getLink()
    }, [slug])

    if (loading) return <div className="flex h-screen items-center justify-center">Redirecting...</div>
    if (error) return <div className="flex h-screen items-center justify-center text-red-500 font-bold text-2xl">404 - {error}</div>

    return null
}
