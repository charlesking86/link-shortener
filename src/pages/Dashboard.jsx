import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import {
    Link2, Plus, Users, BarChart3, Settings, ExternalLink,
    Search, Filter, FileSpreadsheet, ChevronDown, MoreHorizontal,
    Pencil, Trash2, Share2, Copy, BarChart2, FolderPlus, Globe,
    Smartphone, Lock, Tag, QrCode, Download
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
    const [showQRModal, setShowQRModal] = useState(false)
    const [qrData, setQrData] = useState({ url: '', slug: '' })
    const [showDomainMenu, setShowDomainMenu] = useState(false)
    const [activeEditTab, setActiveEditTab] = useState('basic') // basic, mobile, geo, social, security

    // Form States
    const [formData, setFormData] = useState({
        original: '',
        slug: '',
        title: '',
        tags: '',
        ios_url: '',
        android_url: '',
        password: '',
        expires_at: '',
        geo_targets: [],
        social_tags: { title: '', description: '', image: '' }
    })

    // Domain State
    const [domains, setDomains] = useState([{ domain: 'gobd.site' }])
    const [currentDomain, setCurrentDomain] = useState('gobd.site')
    const [showDomainModal, setShowDomainModal] = useState(false)
    const [newDomainInput, setNewDomainInput] = useState('')

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

        // 2. Fetch Events
        const { data: eventsData } = await supabase
            .from('click_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(2000)

        setEvents(eventsData || [])

        // 3. Fetch Domains
        const { data: domainData } = await supabase
            .from('domains')
            .select('*')
            .eq('user_id', userId)

        if (domainData && domainData.length > 0) {
            setDomains([{ domain: 'gobd.site' }, ...domainData])
        }

        setLoading(false)
    }

    const handleAddDomain = async () => {
        if (!newDomainInput) return
        const { data, error } = await supabase.from('domains').insert([{
            domain: newDomainInput,
            user_id: user.id
        }]).select()

        if (data) {
            setDomains([...domains, data[0]])
            setCurrentDomain(data[0].domain)
            setShowDomainModal(false)
            setNewDomainInput('')
        }
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
            android_url: formData.android_url || null,
            password: formData.password || null,
            expires_at: formData.expires_at || null,
            geo_targets: formData.geo_targets,
            social_tags: formData.social_tags,
            domain: currentDomain // Add domain to link
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
            slug: formData.slug,
            title: formData.title,
            tags: tagsArray,
            ios_url: formData.ios_url || null,
            android_url: formData.android_url || null,
            password: formData.password || null,
            expires_at: formData.expires_at || null,
            geo_targets: formData.geo_targets,
            social_tags: formData.social_tags
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
            android_url: link.android_url || '',
            password: link.password || '',
            expires_at: link.expires_at ? link.expires_at.slice(0, 16) : '',
            geo_targets: link.geo_targets || [],
            social_tags: link.social_tags || { title: '', description: '', image: '' }
        })
        setActiveEditTab('basic')
        setShowEditModal(true)
    }

    const openQR = (link) => {
        const fullUrl = `https://${link.domain || 'gobd.site'}/${link.slug}`
        setQrData({ url: fullUrl, slug: link.slug })
        setShowQRModal(true)
    }

    const downloadQR = async () => {
        try {
            const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData.url)}`
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const link = document.createElement('a')
            link.href = window.URL.createObjectURL(blob)
            link.download = `${qrData.slug}-qr.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (err) {
            console.error('Download failed', err)
            alert('Could not download QR code.')
        }
    }

    const resetForm = () => {
        setFormData({
            original: '', slug: '', title: '', tags: '', ios_url: '', android_url: '',
            password: '', expires_at: '', geo_targets: [], social_tags: { title: '', description: '', image: '' }
        })
        setSelectedLink(null)
        setActiveEditTab('basic')
    }

    if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>

    return (
        <div className="flex h-screen bg-white font-sans text-gray-900">
            {/* Sidebar */}
            <aside className="w-72 border-r border-gray-100 flex flex-col bg-white">
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-lg whitespace-nowrap">LCM Global Solution</span>
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
                        <div className="relative">
                            <button
                                onClick={() => setShowDomainMenu(!showDomainMenu)}
                                className={`flex items-center gap-2 text-sm font-medium hover:text-black transition-colors ${showDomainMenu ? 'text-black' : 'text-gray-700'}`}
                            >
                                <Globe size={16} className={showDomainMenu ? "text-emerald-500" : "text-gray-400"} />
                                <span>{currentDomain}</span>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${showDomainMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Backdrop to close menu when clicking outside */}
                            {showDomainMenu && (
                                <div className="fixed inset-0 z-40" onClick={() => setShowDomainMenu(false)}></div>
                            )}

                            {/* Dropdown Content */}
                            {showDomainMenu && (
                                <div className="absolute top-full left-0 mt-2 w-48 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="bg-white border border-gray-100 rounded-lg shadow-xl shadow-gray-200/50 overflow-hidden">
                                        {domains.map(d => (
                                            <button
                                                key={d.domain}
                                                onClick={() => {
                                                    setCurrentDomain(d.domain)
                                                    setShowDomainMenu(false)
                                                }}
                                                className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${currentDomain === d.domain ? 'text-emerald-600 bg-emerald-50/50 font-medium' : 'text-gray-700'}`}
                                            >
                                                {d.domain}
                                                {currentDomain === d.domain && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                                            </button>
                                        ))}
                                        <div className="border-t border-gray-100 p-2 bg-gray-50/50">
                                            <button
                                                onClick={() => {
                                                    setShowDomainModal(true)
                                                    setShowDomainMenu(false)
                                                }}
                                                className="w-full flex items-center justify-center gap-2 text-xs font-medium text-emerald-600 bg-white border border-gray-200 py-2 rounded-md hover:bg-emerald-50 transition-colors hover:border-emerald-200"
                                            >
                                                <Plus size={12} /> Add Domain
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                                    <h1 className="text-2xl font-bold text-gray-900">Links for {currentDomain}</h1>
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
                                        {links
                                            .filter(l => (l.domain === currentDomain) || (!l.domain && currentDomain === 'gobd.site'))
                                            .map(link => (
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
                                                            <a href={`https://${link.domain || 'gobd.site'}/${link.slug}`} target="_blank" className="text-sm font-medium text-emerald-600 hover:underline">
                                                                {link.domain || 'gobd.site'}/{link.slug}
                                                            </a>
                                                            <button
                                                                onClick={() => navigator.clipboard.writeText(`https://${link.domain || 'gobd.site'}/${link.slug}`)}
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

            {/* CREATE / EDIT MODAL (SIDEBAR LAYOUT) */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[600px] flex overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Sidebar */}
                        <div className="w-64 bg-gray-50 border-r border-gray-100 flex flex-col">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-xl font-bold">{selectedLink ? 'Edit Link' : 'New Link'}</h2>
                            </div>
                            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                                <button onClick={() => setActiveEditTab('basic')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeEditTab === 'basic' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    <Link2 size={16} /> Basic Link
                                </button>
                                <button onClick={() => setActiveEditTab('mobile')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeEditTab === 'mobile' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    <Smartphone size={16} /> Mobile Targeting
                                </button>
                                <button onClick={() => setActiveEditTab('geo')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeEditTab === 'geo' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    <Globe size={16} /> Geo-Targeting
                                </button>
                                <button onClick={() => setActiveEditTab('social')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeEditTab === 'social' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    <Share2 size={16} /> Social Media
                                </button>
                                <button onClick={() => setActiveEditTab('security')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeEditTab === 'security' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    <Lock size={16} /> Security
                                </button>
                            </nav>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 flex flex-col h-full">
                            <div className="flex-1 p-8 overflow-y-auto">
                                <form id="linkForm" onSubmit={selectedLink ? handleUpdate : handleCreate} className="space-y-6">

                                    {/* BASIC TAB */}
                                    {activeEditTab === 'basic' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Destination URL</label>
                                                <input required type="url" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="https://example.com/very-long-url" value={formData.original} onChange={e => setFormData({ ...formData, original: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
                                                <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="My Awesome Link" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Slug</label>
                                                    <div className="flex items-center">
                                                        <span className="bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg p-2.5 text-gray-500 text-sm overflow-hidden whitespace-nowrap max-w-[80px]">{currentDomain}/</span>
                                                        <input type="text" className="w-full p-2.5 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="custom" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                                                    <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="promo, social" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* MOBILE TAB */}
                                    {activeEditTab === 'mobile' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <p className="text-sm text-gray-500">Redirect users to different URLs based on their device.</p>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">iOS Destination</label>
                                                <input type="url" className="w-full p-2.5 border border-gray-200 rounded-lg" placeholder="https://apps.apple.com/..." value={formData.ios_url} onChange={e => setFormData({ ...formData, ios_url: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Android Destination</label>
                                                <input type="url" className="w-full p-2.5 border border-gray-200 rounded-lg" placeholder="https://play.google.com/..." value={formData.android_url} onChange={e => setFormData({ ...formData, android_url: e.target.value })} />
                                            </div>
                                        </div>
                                    )}

                                    {/* GEO TAB */}
                                    {activeEditTab === 'geo' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <p className="text-sm text-gray-500">Redirect users based on their country (Two-letter Code, e.g., US, IN, GB).</p>
                                            {formData.geo_targets.map((rule, idx) => (
                                                <div key={idx} className="flex gap-2">
                                                    <input type="text" className="w-20 p-2 border border-gray-200 rounded-lg uppercase" placeholder="US" value={rule.country} onChange={e => {
                                                        const newGeo = [...formData.geo_targets];
                                                        newGeo[idx].country = e.target.value.toUpperCase();
                                                        setFormData({ ...formData, geo_targets: newGeo });
                                                    }} />
                                                    <input type="url" className="flex-1 p-2 border border-gray-200 rounded-lg" placeholder="https://..." value={rule.url} onChange={e => {
                                                        const newGeo = [...formData.geo_targets];
                                                        newGeo[idx].url = e.target.value;
                                                        setFormData({ ...formData, geo_targets: newGeo });
                                                    }} />
                                                    <button type="button" onClick={() => {
                                                        const newGeo = formData.geo_targets.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, geo_targets: newGeo });
                                                    }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16} /></button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setFormData({ ...formData, geo_targets: [...formData.geo_targets, { country: '', url: '' }] })} className="text-sm text-emerald-600 font-medium hover:underline">+ Add Country Rule</button>
                                        </div>
                                    )}

                                    {/* SOCIAL TAB */}
                                    {activeEditTab === 'social' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <p className="text-sm text-gray-500">Customize how your link looks on Facebook, Twitter, and LinkedIn.</p>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Social Title</label>
                                                <input type="text" className="w-full p-2.5 border border-gray-200 rounded-lg" placeholder="Start your journey..." value={formData.social_tags?.title || ''} onChange={e => setFormData({ ...formData, social_tags: { ...formData.social_tags, title: e.target.value } })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Social Description</label>
                                                <textarea className="w-full p-2.5 border border-gray-200 rounded-lg h-24" placeholder="Get the best deals on..." value={formData.social_tags?.description || ''} onChange={e => setFormData({ ...formData, social_tags: { ...formData.social_tags, description: e.target.value } })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Preview Image URL</label>
                                                <input type="url" className="w-full p-2.5 border border-gray-200 rounded-lg" placeholder="https://..." value={formData.social_tags?.image || ''} onChange={e => setFormData({ ...formData, social_tags: { ...formData.social_tags, image: e.target.value } })} />
                                            </div>
                                        </div>
                                    )}

                                    {/* SECURITY TAB */}
                                    {activeEditTab === 'security' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <p className="text-sm text-gray-500">Protect your links from unwanted access.</p>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Password Protection</label>
                                                <input type="text" className="w-full p-2.5 border border-gray-200 rounded-lg" placeholder="Optional password..." value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                                                <input type="datetime-local" className="w-full p-2.5 border border-gray-200 rounded-lg" value={formData.expires_at} onChange={e => setFormData({ ...formData, expires_at: e.target.value })} />
                                            </div>
                                        </div>
                                    )}

                                </form>
                            </div>
                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-br-xl">
                                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancel</button>
                                <button type="submit" form="linkForm" className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-medium shadow-lg shadow-gray-200 transition-colors flex items-center gap-2">
                                    {selectedLink ? 'Save Changes' : 'Create Link'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ADD DOMAIN MODAL */}
            {showDomainModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-bold mb-4">Add Custom Domain</h2>
                        <p className="text-xs text-gray-500 mb-4">Make sure to configure your DNS to point to this project first.</p>
                        <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="example.com"
                            value={newDomainInput}
                            onChange={e => setNewDomainInput(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowDomainModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={handleAddDomain} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium">Add Domain</button>
                        </div>
                    </div>
                </div>
            )}
            {/* QR CODE MODAL */}
            {showQRModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 text-center">
                        <h2 className="text-lg font-bold mb-2">QR Code</h2>
                        <p className="text-sm text-gray-500 mb-6 break-all">{qrData.url}</p>

                        <div className="bg-white p-4 rounded-lg border border-gray-100 inline-block mb-6 shadow-inner">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData.url)}`}
                                alt="QR Code"
                                className="w-48 h-48"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowQRModal(false)}
                                className="flex-1 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                Close
                            </button>
                            <button
                                onClick={downloadQR}
                                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                <Download size={18} />
                                Download
                            </button>
                        </div>
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
