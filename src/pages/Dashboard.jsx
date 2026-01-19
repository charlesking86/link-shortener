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

    const fetchData = async (userId) => {
        setLoading(true)

        // 1. Fetch Links
        const { data: linksData } = await supabase
            .from('links')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        setLinks(linksData || [])

        // 2. Fetch Click Events (Analytics)
        const { data: eventsData } = await supabase
            .from('click_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000)

        setEvents(eventsData || [])
        setLoading(false)
    }

    const handleCreateLink = async (e) => {
        e.preventDefault()
        const slug = Math.random().toString(36).substring(7)

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

        if (data) {
            setLinks([data[0], ...links])
            setShowModal(false)
            setNewUrl('')
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
                    <SidebarItem icon={<BarChart3 size={20} />} label="Domain Statistics" active={activeTab === 'Analytics'} onClick={() => setActiveTab('Analytics')} />
                    <SidebarItem icon={<Activity size={20} />} label="Click Stream" active={activeTab === 'Stream'} onClick={() => setActiveTab('Stream')} />
                    <SidebarItem icon={<Settings size={20} />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
                </nav>

                <div className="p-4 border-t">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">
                            {user.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-medium truncate">{user.email}</div>
                            <div className="text-xs text-gray-500">Pro Plan</div>
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
                    <h1 className="text-lg font-semibold">
                        {activeTab === 'Analytics' ? 'Domain Statistics' : activeTab}
                    </h1>
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

                <div className="p-8 max-w-6xl mx-auto">

                    {/* LINKS TAB */}
                    {activeTab === 'Links' && (
                        <>
                            <div className="grid grid-cols-3 gap-6 mb-8">
                                <StatCard label="Total Clicks" value={events.length} change="+100%" />
                                <StatCard label="Active Links" value={links.length} />
                                <StatCard label="Top Country" value={getTopMetric(events, 'country') || '-'} />
                            </div>

                            <div className="bg-white rounded-xl border shadow-sm">
                                <div className="px-6 py-4 border-b flex justify-between items-center">
                                    <h2 className="font-semibold">Your Links</h2>
                                    <div className="text-sm text-gray-500">{links.length} results</div>
                                </div>
                                <div>
                                    {links.length === 0 ? (
                                        <div className="p-10 text-center text-gray-500">No links created yet.</div>
                                    ) : links.map(link => (
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
                                                <div className="font-medium">{link.clicks} clicks</div>
                                                <div className="text-xs text-gray-400">{new Date(link.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ANALYTICS TAB */}
                    {activeTab === 'Analytics' && (
                        <AnalyticsView events={events} />
                    )}

                    {/* CLICK STREAM TAB */}
                    {activeTab === 'Stream' && (
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b">
                                <h2 className="font-semibold">Real-time Click Stream</h2>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                    <tr>
                                        <th className="px-6 py-3">Time</th>
                                        <th className="px-6 py-3">Country</th>
                                        <th className="px-6 py-3">City</th>
                                        <th className="px-6 py-3">Device</th>
                                        <th className="px-6 py-3">Referrer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {events.map(event => (
                                        <tr key={event.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-gray-900">
                                                {format(new Date(event.created_at), 'MMM dd, HH:mm')}
                                            </td>
                                            <td className="px-6 py-3 flex items-center gap-2">
                                                <span className="font-medium bg-gray-100 px-2 py-0.5 rounded text-xs">{event.country}</span>
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">{event.city || '-'}</td>
                                            <td className="px-6 py-3 capitalize">{event.device}</td>
                                            <td className="px-6 py-3 text-gray-500 truncate max-w-[200px]">
                                                {event.referrer || 'Direct'}
                                            </td>
                                        </tr>
                                    ))}
                                    {events.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-gray-500">No clicks recorded yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
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

                {/* Create Link Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                            <h2 className="text-xl font-bold mb-4">Create New Link</h2>
                            <form onSubmit={handleCreateLink}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Destination URL</label>
                                    <input
                                        type="url"
                                        required
                                        className="w-full p-2 border rounded-lg"
                                        placeholder="https://example.com"
                                        value={newUrl}
                                        onChange={e => setNewUrl(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                                    >
                                        Create Link
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

function SidebarItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-gray-100 text-black' : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                }`}
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
            <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">{value}</div>
                {change && <div className="text-xs text-green-500 font-medium">{change}</div>}
            </div>
        </div>
    )
}

function getTopMetric(events, key) {
    if (!events.length) return null;
    const counts = {};
    let maxCount = 0;
    let topItem = null;

    events.forEach(e => {
        const val = e[key] || 'Unknown';
        counts[val] = (counts[val] || 0) + 1;
        if (counts[val] > maxCount) {
            maxCount = counts[val];
            topItem = val;
        }
    });
    return topItem;
}
