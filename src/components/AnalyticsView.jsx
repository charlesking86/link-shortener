import { useEffect, useState } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts'
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsView({ events }) {
    const [timeData, setTimeData] = useState([])
    const [deviceData, setDeviceData] = useState([])

    useEffect(() => {
        if (!events || events.length === 0) return;

        // 1. Process Time Series Data (Last 7 Days)
        const today = startOfDay(new Date());
        const last7Days = eachDayOfInterval({
            start: subDays(today, 6),
            end: today
        });

        const timeMap = new Map();
        last7Days.forEach(date => {
            timeMap.set(format(date, 'MMM dd'), 0);
        });

        events.forEach(event => {
            const dateStr = format(new Date(event.created_at), 'MMM dd');
            if (timeMap.has(dateStr)) {
                timeMap.set(dateStr, timeMap.get(dateStr) + 1);
            }
        });

        const processedTimeData = Array.from(timeMap).map(([date, clicks]) => ({
            date,
            clicks
        }));
        setTimeData(processedTimeData);


        // 2. Process Device Data
        const deviceCounts = {};
        events.forEach(event => {
            const device = event.device || 'desktop';
            deviceCounts[device] = (deviceCounts[device] || 0) + 1;
        });

        const processedDeviceData = Object.keys(deviceCounts).map(key => ({
            name: key.charAt(0).toUpperCase() + key.slice(1),
            value: deviceCounts[key]
        }));
        setDeviceData(processedDeviceData);

    }, [events]);

    if (!events || events.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500 bg-white rounded-lg border">
                No analytics data available yet. Share your links!
            </div>
        )
        import { Calendar, ArrowUp, MousePointer2, Globe, Smartphone, Monitor } from 'lucide-react'
        import { format, subDays, isAfter, startOfDay, parseISO } from 'date-fns'

        const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']

        export default function AnalyticsView({ events, totalLinks }) {
            const [dateRange, setDateRange] = useState('7d') // 7d, 30d, 90d

            // 1. Filter Data by Date Range
            const filteredEvents = useMemo(() => {
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
                    // Simple heuristic if User-Agent parsing isn't robust in DB yet
                    // Assuming 'os' or 'device' column might be populated or we parse user_agent
                    // For now, let's look at the existing data structure or default to generic
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
                    </div>
                        </div>
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
