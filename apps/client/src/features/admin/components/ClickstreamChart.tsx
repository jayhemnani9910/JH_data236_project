import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ClickstreamData {
  page: string;
  clicks: number;
  views: number;
  conversionRate: number;
}

interface TimeSeriesData {
  hour: string;
  searches: number;
  bookings: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const ClickstreamChart: React.FC = () => {
  const [pageData, setPageData] = useState<ClickstreamData[]>([]);
  const [timeData, setTimeData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'pages' | 'timeline'>('pages');

  useEffect(() => {
    fetchClickstreamData();
  }, []);

  const fetchClickstreamData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/clickstream', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch clickstream data');
      
      const result = await response.json();
      setPageData(result.data?.pages || []);
      setTimeData(result.data?.timeline || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Mock data
      setPageData([
        { page: 'Home', clicks: 15420, views: 28500, conversionRate: 12.5 },
        { page: 'Search', clicks: 12340, views: 22100, conversionRate: 18.3 },
        { page: 'Flights', clicks: 8950, views: 15200, conversionRate: 22.1 },
        { page: 'Hotels', clicks: 7820, views: 13400, conversionRate: 19.8 },
        { page: 'Cars', clicks: 5430, views: 9800, conversionRate: 16.2 },
      ]);
      
      setTimeData([
        { hour: '00:00', searches: 120, bookings: 15 },
        { hour: '04:00', searches: 80, bookings: 8 },
        { hour: '08:00', searches: 340, bookings: 42 },
        { hour: '12:00', searches: 580, bookings: 78 },
        { hour: '16:00', searches: 720, bookings: 95 },
        { hour: '20:00', searches: 480, bookings: 61 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clickstream Analytics</h2>
          <p className="text-gray-600 mt-1">User interaction patterns and engagement metrics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('pages')}
            className={`px-4 py-2 rounded-md ${
              viewMode === 'pages'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            By Page
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded-md ${
              viewMode === 'timeline'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Using mock data: {error}
          </p>
        </div>
      )}

      {viewMode === 'pages' ? (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Clicks per Page</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pageData}
                  dataKey="clicks"
                  nameKey="page"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.page}: ${entry.clicks}`}
                >
                  {pageData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Conversion Rates</h3>
            <div className="space-y-3">
              {pageData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-32 text-sm font-medium">{item.page}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6">
                    <div
                      className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${item.conversionRate}%` }}
                    >
                      <span className="text-xs text-white font-semibold">
                        {item.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm text-gray-600">
                    {item.clicks.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={timeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="searches"
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ r: 5 }}
              name="Searches"
            />
            <Line
              type="monotone"
              dataKey="bookings"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={{ r: 5 }}
              name="Bookings"
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Clicks</p>
          <p className="text-2xl font-bold text-blue-600">
            {pageData.reduce((sum, item) => sum + item.clicks, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Views</p>
          <p className="text-2xl font-bold text-green-600">
            {pageData.reduce((sum, item) => sum + item.views, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Avg Conversion</p>
          <p className="text-2xl font-bold text-purple-600">
            {(pageData.reduce((sum, item) => sum + item.conversionRate, 0) / pageData.length).toFixed(1)}%
          </p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Peak Hour</p>
          <p className="text-2xl font-bold text-orange-600">
            {timeData.reduce((max, item) => item.searches > max.searches ? item : max, timeData[0])?.hour || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};
