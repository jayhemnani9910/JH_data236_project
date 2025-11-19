import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface PropertyData {
  name: string;
  revenue: number;
  type: 'hotel' | 'flight' | 'car';
  bookings: number;
  rank: number;
}

const TYPE_COLORS = {
  hotel: '#FF6B6B',
  flight: '#4ECDC4',
  car: '#FFD93D'
};

export const TopPropertiesChart: React.FC = () => {
  const [data, setData] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchTopProperties();
  }, [limit]);

  const fetchTopProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/top-properties?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch property data');
      
      const result = await response.json();
      setData(result.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Mock data
      setData([
        { name: 'Hilton NYC', revenue: 850000, type: 'hotel' as const, bookings: 1234, rank: 1 },
        { name: 'United Airlines', revenue: 780000, type: 'flight' as const, bookings: 3456, rank: 2 },
        { name: 'Marriott LA', revenue: 720000, type: 'hotel' as const, bookings: 1098, rank: 3 },
        { name: 'Enterprise Rent', revenue: 680000, type: 'car' as const, bookings: 2345, rank: 4 },
        { name: 'Delta Airlines', revenue: 650000, type: 'flight' as const, bookings: 2987, rank: 5 },
        { name: 'Hyatt Chicago', revenue: 590000, type: 'hotel' as const, bookings: 876, rank: 6 },
        { name: 'Hertz', revenue: 520000, type: 'car' as const, bookings: 1987, rank: 7 },
        { name: 'American Air', revenue: 480000, type: 'flight' as const, bookings: 2234, rank: 8 },
        { name: 'Sheraton SF', revenue: 450000, type: 'hotel' as const, bookings: 765, rank: 9 },
        { name: 'Avis Budget', revenue: 420000, type: 'car' as const, bookings: 1543, rank: 10 },
      ].slice(0, limit));
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
          <h2 className="text-2xl font-bold text-gray-800">Top Properties by Revenue</h2>
          <p className="text-gray-600 mt-1">Highest earning listings across all categories</p>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[5, 10, 15, 20].map(num => (
            <option key={num} value={num}>Top {num}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Using mock data: {error}
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            type="number"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />
          <YAxis 
            type="category"
            dataKey="name" 
            tick={{ fontSize: 11 }}
            width={90}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'revenue') return [`$${value.toLocaleString()}`, 'Revenue'];
              return [value, name];
            }}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar 
            dataKey="revenue" 
            radius={[0, 8, 8, 0]}
            name="Revenue ($)"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.type]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: TYPE_COLORS.hotel }}></div>
          <span className="text-sm text-gray-600">Hotels</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: TYPE_COLORS.flight }}></div>
          <span className="text-sm text-gray-600">Flights</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: TYPE_COLORS.car }}></div>
          <span className="text-sm text-gray-600">Cars</span>
        </div>
      </div>
    </div>
  );
};
