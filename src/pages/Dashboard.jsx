import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import {
    Link2, Plus, Users, BarChart3, Settings, ExternalLink,
    Search, Filter, FileSpreadsheet, ChevronDown, MoreHorizontal,
    Pencil, Trash2, Share2, Copy, BarChart2, FolderPlus, Globe,
    Smartphone, Lock, Tag
} from 'lucide-react'
import AnalyticsView from '../components/AnalyticsView'
import { format } from 'date-fns'

export default function Dashboard() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [links, setLinks] = useState([])
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('Links')

    // Modal States
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedLink, setSelectedLink] = useState(null) // For editing

    // Form States
    const [formData, setFormData] = useState({
        original: '',
        slug: '',
        title: '',
        tags: '',
        ios_url: '',
        android_url: ''
    })

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

        // 1. Fetch Links with new columns
        const { data: linksData } = await supabase
            .from('links')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        setLinks(linksData || [])

        // 2. Fetch Events
        const { data: eventsData } = await supabase
            .from('click_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(2000) // Increased limit for better stats

        setEvents(eventsData || [])
        setLoading(false)
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        const slug = formData.slug || Math.random().toString(36).substring(7)
        const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t)

        const { data, error } = await supabase.from('links').insert([{
            user_id: user.id,
            original: formData.original,
            slug: slug,
            title: formData.title || new URL(formData.original).hostname,
            tags: tagsArray,
            ios_url: formData.ios_url || null,
            android_url: formData.android_url || null
        }]).select()

        if (data) {
            setLinks([data[0], ...links])
            setShowCreateModal(false)
            resetForm()
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        if (!selectedLink) return

        const tagsArray = typeof formData.tags === 'string'
            ? formData.tags.split(',').map(t => t.trim()).filter(t => t)
            : formData.tags

        const { data, error } = await supabase.from('links').update({
            original: formData.original,
            title: formData.title,
            tags: tagsArray,
            ios_url: formData.ios_url,
            android_url: formData.android_url
        }).eq('id', selectedLink.id).select()

        if (data) {
            setLinks(links.map(l => l.id === selectedLink.id ? data[0] : l))
            setShowEditModal(false)
            resetForm()
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) return
        await supabase.from('links').delete().eq('id', id)
        setLinks(links.filter(l => l.id !== id))
    }

    const openEditModal = (link) => {
        setSelectedLink(link)
        setFormData({
            original: link.original,
            slug: link.slug,
            title: link.title || '',
            tags: link.tags ? link.tags.join(', ') : '',
            ios_url: link.ios_url || '',
            android_url: link.android_url || ''
        })
        setShowEditModal(true)
    }

    const resetForm = () => {
        setFormData({ original: '', slug: '', title: '', tags: '', ios_url: '', android_url: '' })
        setSelectedLink(null)
    }

    if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>

    return (
        <div className="flex h-screen bg-white font-sans text-gray-900">
            {/* Sidebar */}
            <aside className="w-64 border-r border-gray-100 flex flex-col bg-white">
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden">
                            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-lg">LCM Global Solution</span>
                    </div>
                </div>

                <nav className="flex-1 px-3 space-y-1">
                    <SidebarItem icon={<Link2 size={18} />} label="Links" active={activeTab === 'Links'} onClick={() => setActiveTab('Links')} />
                    <SidebarItem icon={<BarChart3 size={18} />} label="Analytics" active={activeTab === 'Analytics'} onClick={() => setActiveTab('Analytics')} />
                    <SidebarItem icon={<Settings size={18} />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                            {user.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-medium truncate">{user.email}</div>
                            <div className="text-xs text-gray-500">Free Plan</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gray-50/50">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        {/* Domain Selector */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-black">
                                <Globe size={16} className="text-gray-400" />
                                <span>gobd.site</span>
                                <ChevronDown size={14} className="text-gray-400" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm shadow-emerald-200"
                    >
                        <Plus size={16} />
                        New Link
                    </button>
                </header>

                <div className="p-8 max-w-[1600px] mx-auto">

                    {/* LINKS TAB (RICH TABLE) */}
                    {activeTab === 'Links' && (
                        <div>
                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold text-gray-900">Links for domain</h1>
                                    <button onClick={() => fetchData(user.id)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><Share2 size={14} className="rotate-180" /></button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">
                                        <Filter size={14} />
                                        Filters
                                    </button>
                                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">
                                        <FileSpreadsheet size={14} />
                                        Sheets
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                                <button className="px-4 py-2 bg-white border-b-2 border-emerald-500 font-medium text-sm text-emerald-600">All links</button>
                                <button className="px-4 py-2 text-gray-500 hover:text-gray-900 text-sm font-medium flex items-center gap-2">
                                    <FolderPlus size={14} /> Create Folder
                                </button>
                            </div>

                            {/* THE TABLE */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                            <th className="p-4 w-10"><input type="checkbox" className="rounded text-emerald-500 focus:ring-emerald-500" /></th>
                                            <th className="p-4 w-32">By</th>
                                            <th className="p-4 w-64">Short Link</th>
                                            <th className="p-4 min-w-[300px]">Original Link</th>
                                            <th className="p-4 w-24 text-right">Clicks</th>
                                            <th className="p-4 w-32">Tags</th>
                                            <th className="p-4 w-40 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {links.map(link => (
                                            <tr key={link.id} className="group hover:bg-gray-50 transition-colors">
                                                <td className="p-4 align-top"><input type="checkbox" className="rounded text-emerald-500 focus:ring-emerald-500" /></td>
                                                <td className="p-4 align-top">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                            {user.email[0].toUpperCase()}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{format(new Date(link.created_at), 'MMM dd, yyyy')}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top">
                                                    <div className="flex items-center gap-2">
                                                        <Globe size={14} className="text-gray-400" />
                                                        <a href={`https://gobd.site/${link.slug}`} target="_blank" className="text-sm font-medium text-emerald-600 hover:underline">
                                                            gobd.site/{link.slug}
                                                        </a>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(`https://gobd.site/${link.slug}`)}
                                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-900"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top">
                                                    <div className="max-w-md">
                                                        <div className="text-sm font-medium text-gray-900 truncate" title={link.title}>{link.title || 'Untitled Link'}</div>
                                                        <div className="text-xs text-gray-400 truncate mt-0.5">{link.original}</div>
                                                        {/* Badges for Mobile */}
                                                        <div className="flex gap-2 mt-1">
                                                            {link.android_url && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded flex items-center gap-1"><Smartphone size={8} /> Android</span>}
                                                            {link.ios_url && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1"><Smartphone size={8} /> iOS</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top text-right">
                                                    <span className="font-medium text-gray-900">{link.clicks}</span>
                                                </td>
                                                <td className="p-4 align-top">
                                                    <div className="flex flex-wrap gap-1">
                                                        {link.tags && link.tags.map((tag, i) => (
                                                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                <Tag size={10} className="mr-1 opacity-50" /> {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ActionButton icon={<Pencil size={14} />} onClick={() => openEditModal(link)} tooltip="Edit" />
                                                        <ActionButton icon={<BarChart2 size={14} />} onClick={() => setActiveTab('Analytics')} tooltip="Stats" />
                                                        <ActionButton icon={<Share2 size={14} />} tooltip="Share" />
                                                        <ActionButton icon={<Trash2 size={14} />} onClick={() => handleDelete(link.id)} tooltip="Delete" danger />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {links.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className="p-12 text-center text-gray-500">
                                                    No links found. Create one to get started!
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ANALYTICS TAB */}
                    {activeTab === 'Analytics' && (
                        <AnalyticsView events={events} totalLinks={links.length} />
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'Settings' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-xl font-bold mb-4">Workspace Settings</h2>
                            <button
                                onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
                                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                            >
                                Log Out
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* CREATE/EDIT MODAL */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-end z-50">
                    <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{showEditModal ? 'Edit Link' : 'Create New Link'}</h2>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
                        </div>

                        <form onSubmit={showEditModal ? handleUpdate : handleCreate} className="space-y-6">

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Destination URL</label>
                                <input
                                    type="url" required
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    placeholder="https://example.com"
                                    value={formData.original}
                                    onChange={e => setFormData({ ...formData, original: e.target.value })}
                                />
                            </div>

                            {!showEditModal && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Slug (Optional)</label>
                                    <div className="flex items-center">
                                        <span className="bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg p-2.5 text-gray-500 text-sm">gobd.site/</span>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                            placeholder="custom-name"
                                            value={formData.slug}
                                            onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link Title</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="My Awesome Link"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-3 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="marketing, social, q1"
                                        value={formData.tags}
                                        onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                                    <Smartphone size={16} /> Mobile Targeting
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">iOS Destination</label>
                                        <input
                                            type="url"
                                            className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                            placeholder="https://apps.apple.com/..."
                                            value={formData.ios_url}
                                            onChange={e => setFormData({ ...formData, ios_url: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Android Destination</label>
                                        <input
                                            type="url"
                                            className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                            placeholder="https://play.google.com/..."
                                            value={formData.android_url}
                                            onChange={e => setFormData({ ...formData, android_url: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                                    className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium shadow-sm"
                                >
                                    {showEditModal ? 'Save Changes' : 'Create Link'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function SidebarItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
        >
            {icon}
            {label}
        </button>
    )
}

function ActionButton({ icon, onClick, tooltip, danger }) {
    return (
        <button
            onClick={onClick}
            title={tooltip}
            className={`p-2 rounded-lg transition-colors ${danger
                ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
        >
            {icon}
        </button>
    )
}
