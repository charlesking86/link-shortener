import { useMemo, useState } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts'
import { Calendar, ArrowUp, MousePointer2, Globe, Monitor } from 'lucide-react'
import { format, subDays, isAfter, parseISO } from 'date-fns'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']

export default function AnalyticsView({ events, totalLinks }) {
    const [dateRange, setDateRange] = useState('7d') // 7d, 30d, 90d

    // 1. Filter Data by Date Range
    const filteredEvents = useMemo(() => {
        if (!events) return []
        const now = new Date()
        let startDate = subDays(now, 7)
        if (dateRange === '30d') startDate = subDays(now, 30)
        if (dateRange === '90d') startDate = subDays(now, 90)

        return events.filter(e => isAfter(parseISO(e.created_at), startDate))
    }, [events, dateRange])

    // 2. Compute Metrics
    const metrics = useMemo(() => {
        const totalClicks = filteredEvents.length

        // Find Top Source (Referrer)
        const sources = {}
        filteredEvents.forEach(e => {
            const domain = e.referrer ? new URL(e.referrer).hostname : 'Direct'
            sources[domain] = (sources[domain] || 0) + 1
        })
        const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0]

        return {
            totalClicks,
            topSource: topSource ? topSource[0] : 'None'
        }
    }, [filteredEvents])

    // 3. Prepare Chart Data (Time Series)
    const chartData = useMemo(() => {
        const days = {}
        const now = new Date()
        const daysCount = dateRange === '7d' ? 7 : (dateRange === '30d' ? 30 : 90)

        // Initialize all days with 0
        for (let i = 0; i < daysCount; i++) {
            const d = format(subDays(now, i), 'MMM dd')
            days[d] = 0
        }

        // Fill with data
        filteredEvents.forEach(e => {
            const d = format(parseISO(e.created_at), 'MMM dd')
            if (days[d] !== undefined) days[d]++
        })

        return Object.entries(days).reverse().map(([name, clicks]) => ({ name, clicks }))
    }, [filteredEvents, dateRange])

    // 4. Device Stats (Pie Chart)
    const deviceData = useMemo(() => {
        const stats = { Desktop: 0, Mobile: 0, Tablet: 0, Other: 0 }
        filteredEvents.forEach(e => {
            const ua = (e.user_agent || '').toLowerCase()
            if (ua.includes('mobile')) stats.Mobile++
            else if (ua.includes('tablet') || ua.includes('ipad')) stats.Tablet++
            else stats.Desktop++
        })
        return Object.entries(stats)
            .filter(([_, val]) => val > 0)
            .map(([name, value]) => ({ name, value }))
    }, [filteredEvents])

    return (
        <div className="space-y-6">
            {/* Header / Date Filter */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Domain Statistics</h2>
                <div className="bg-white border border-gray-200 rounded-lg p-1 flex">
                    <button onClick={() => setDateRange('7d')} className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${dateRange === '7d' ? 'bg-gray-100 text-black' : 'text-gray-500'}`}>7 Days</button>
                    <button onClick={() => setDateRange('30d')} className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${dateRange === '30d' ? 'bg-gray-100 text-black' : 'text-gray-500'}`}>30 Days</button>
                    <button onClick={() => setDateRange('90d')} className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${dateRange === '90d' ? 'bg-gray-100 text-black' : 'text-gray-500'}`}>90 Days</button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    label="Total Clicks"
                    value={metrics.totalClicks}
                    icon={<MousePointer2 size={20} className="text-blue-500" />}
                />
                <MetricCard
                    label="Active Links"
                    value={totalLinks}
                    icon={<Globe size={20} className="text-emerald-500" />}
                />
                <MetricCard
                    label="Top Source"
                    value={metrics.topSource}
                    icon={<ArrowUp size={20} className="text-orange-500" />}
                    subtext="Most traffic origin"
                />
            </div>

            {/* Main Area Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" />
                    Conversions Map
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="clicks"
                                stroke="#10b981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorClicks)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Row - Device Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">Devices</h3>
                    <div className="h-[200px] flex items-center justify-center">
                        {deviceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={deviceData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {deviceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-gray-400 text-sm">No device data yet</div>
                        )}
                    </div>
                </div>

                {/* Placeholder for future Geo Map or Browser Stat */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                        <Monitor size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Browser stats coming soon</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function MetricCard({ label, value, icon, subtext }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <span className="text-gray-500 text-sm font-medium">{label}</span>
                <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
            {subtext && <div className="text-xs text-emerald-600 font-medium">{subtext}</div>}
        </div>
    )
}
