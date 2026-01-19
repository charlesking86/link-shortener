import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import { Link2, Plus, Users, BarChart3, Settings, ExternalLink, Activity } from 'lucide-react'
import AnalyticsView from '../components/AnalyticsView'
import { format } from 'date-fns'

export default function Dashboard() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [links, setLinks] = useState([])
    const [events, setEvents] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [newUrl, setNewUrl] = useState('')
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('Links')

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) navigate('/login')
            else {
                setUser(session.user)
                fetchData(session.user.id)
            }
        })
    }, [])

    const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (data) setLinks(data)
    setLoading(false)
}

const handleCreateLink = async (e) => {
    e.preventDefault()
    if (!newUrl) return

    // 1. Generate or use custom slug
    const slug = customSlug || Math.random().toString(36).substring(2, 8)

    // 2. Insert into Supabase
    const { data, error } = await supabase
        .from('links')
        .insert([
            {
                original: newUrl,
                slug: slug,
                user_id: user.id
            }
        ])
        .select()

    if (error) {
        alert('Error creating link: ' + error.message)
    } else {
        // 3. Update UI
        setLinks([data[0], ...links])
        setShowModal(false)
        setNewUrl('')
        setCustomSlug('')
    }
}

if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>

return (
    <div className="flex h-screen bg-gray-50 font-sans">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-6">
                <div className="text-xl font-bold flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rounded-lg"></div>
                    Short.io Pro
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                <SidebarItem icon={<Link2 size={20} />} label="Links" active={activeTab === 'Links'} onClick={() => setActiveTab('Links')} />
                <SidebarItem icon={<BarChart3 size={20} />} label="Analytics" active={activeTab === 'Analytics'} onClick={() => setActiveTab('Analytics')} />
                <SidebarItem icon={<Users size={20} />} label="Team" active={activeTab === 'Team'} onClick={() => setActiveTab('Team')} />
                <SidebarItem icon={<Settings size={20} />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
            </nav>

            <div className="p-4 border-t">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">
                        {user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-medium truncate">{user.email}</div>
                        <div className="text-xs text-gray-500">Free Plan</div>
                    </div>
                </div>
                <button
                    onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
                    className="mt-4 w-full text-xs text-gray-500 hover:text-red-500 text-left"
                >
                    Log Out
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
            <header className="h-16 bg-white border-b flex items-center justify-between px-8 sticky top-0 z-10">
                <h1 className="text-lg font-semibold">{activeTab}</h1>
                {activeTab === 'Links' && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors"
                    >
                        <Plus size={16} />
                        New Link
                    </button>
                )}
            </header>

            <div className="p-8 max-w-5xl mx-auto">
                {/* LINKS TAB */}
                {activeTab === 'Links' && (
                    <>
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <StatCard label="Total Clicks" value={links.reduce((acc, curr) => acc + (curr.clicks || 0), 0)} />
                            <StatCard label="Active Links" value={links.length} />
                            <StatCard label="Top Source" value="Direct" />
                        </div>

                        <div className="bg-white rounded-xl border shadow-sm">
                            <div className="px-6 py-4 border-b flex justify-between items-center">
                                <h2 className="font-semibold">Your Links</h2>
                                <div className="text-sm text-gray-500">{links.length} results</div>
                            </div>
                            <div>
                                {loading ? (
                                    <div className="p-8 text-center text-gray-500">Loading links...</div>
                                ) : links.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No links yet. Create one!</div>
                                ) : (
                                    links.map(link => (
                                        <div key={link.id} className="px-6 py-4 border-b last:border-0 hover:bg-gray-50 transition-colors group flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <a
                                                        href={`https://gobd.site/${link.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-medium text-blue-600 hover:underline"
                                                    >
                                                        gobd.site/{link.slug}
                                                    </a>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(`https://gobd.site/${link.slug}`)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                                                        title="Copy to clipboard"
                                                    >
                                                        <ExternalLink size={14} className="text-gray-500" />
                                                    </button>
                                                </div>
                                                <div className="text-sm text-gray-500 truncate max-w-md">{link.original}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold">{link.clicks}</div>
                                                <div className="text-xs text-gray-400">{new Date(link.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === 'Analytics' && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border shadow-sm">
                        <BarChart3 size={48} className="text-gray-300 mb-4" />
                        <h2 className="text-xl font-bold mb-2">Analytics are coming soon</h2>
                        <p className="text-gray-500">We are processing your data. Check back later.</p>
                    </div>
                )}

                {/* TEAM TAB */}
                {activeTab === 'Team' && (
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                        <h2 className="font-bold text-lg mb-4">Team Members</h2>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold">{user.email[0].toUpperCase()}</div>
                            <div>
                                <div className="font-medium">You</div>
                                <div className="text-xs text-gray-500">{user.email} (Owner)</div>
                            </div>
                        </div>
                        <button className="mt-6 text-sm text-blue-600 font-medium hover:underline">+ Invite Member</button>
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'Settings' && (
                    <div className="bg-white rounded-xl border shadow-sm divide-y">
                        <div className="p-6">
                            <h3 className="font-medium mb-1">General</h3>
                            <p className="text-sm text-gray-500">Manage your workspace settings.</p>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium mb-1">Company Name</label>
                            <input type="text" value="My Shortener" className="w-full max-w-md p-2 border rounded bg-gray-50" readOnly />
                        </div>
                        <div className="p-6">
                            <button className="text-red-500 text-sm font-medium hover:underline">Delete Workspace</button>
                        </div>
                    </div>
                )}
            </div>
        </main>

        {/* Create Modal */}
        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden p-6 animate-fadeIn">
                    <h3 className="text-lg font-bold mb-4">Create New Link</h3>
                    <form onSubmit={handleCreateLink} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Destination URL</label>
                            <input
                                autoFocus
                                type="url"
                                placeholder="https://..."
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-black focus:outline-none"
                                value={newUrl}
                                onChange={e => setNewUrl(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                                Create Link
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
)
}

// Subcomponents
function SidebarItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-gray-100 text-black' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
        >
            {icon}
            {label}
        </button>
    )
}

function StatCard({ label, value, change }) {
    return (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="text-sm text-gray-500 mb-1">{label}</div>
            <div className="flex items-end gap-2">
                <div className="text-2xl font-bold">{value}</div>
                {change && <div className="text-xs text-green-600 font-medium mb-1">{change}</div>}
            </div>
        </div>
    )
}
