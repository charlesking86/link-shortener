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
    }

    return (
        <div className="space-y-6">
            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">Total Clicks</div>
                    <div className="text-2xl font-bold">{events.length}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">Top Country</div>
                    <div className="text-2xl font-bold">
                        {getTopMetric(events, 'country') || '-'}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">Top Device</div>
                    <div className="text-2xl font-bold">
                        {getTopMetric(events, 'device') || 'Desktop'}
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Time Series Chart */}
                <div className="bg-white p-6 rounded-xl border shadow-sm h-80">
                    <h3 className="font-semibold mb-4">Clicks Last 7 Days</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                            />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Line
                                type="monotone"
                                dataKey="clicks"
                                stroke="#2563eb"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Device Pie Chart */}
                <div className="bg-white p-6 rounded-xl border shadow-sm h-80">
                    <h3 className="font-semibold mb-4">Devices</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={deviceData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {deviceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-[-20px]">
                        {deviceData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-1 text-sm text-gray-600">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                {entry.name}
                            </div>
                        ))}
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
