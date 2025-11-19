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

interface CityRevenue {
  city: string;
  revenue: number;
  year: number;
  bookings: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const RevenueByCity: React.FC = () => {
  const [data, setData] = useState<CityRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchRevenueData();
  }, [selectedYear]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/revenue-by-city?year=${selectedYear}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch revenue data');
      
      const result = await response.json();
      setData(result.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Use mock data for development
      setData([
        { city: 'New York', revenue: 2500000, year: selectedYear, bookings: 4521 },
        { city: 'Los Angeles', revenue: 1800000, year: selectedYear, bookings: 3234 },
        { city: 'Chicago', revenue: 1200000, year: selectedYear, bookings: 2134 },
        { city: 'Miami', revenue: 950000, year: selectedYear, bookings: 1876 },
        { city: 'San Francisco', revenue: 2100000, year: selectedYear, bookings: 3456 },
        { city: 'Las Vegas', revenue: 1600000, year: selectedYear, bookings: 2987 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatRevenue = (value: number) => {
    return `$${(value / 1000000).toFixed(1)}M`;
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
          <h2 className="text-2xl font-bold text-gray-800">Revenue by City</h2>
          <p className="text-gray-600 mt-1">Total revenue per city for {selectedYear}</p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[2023, 2024, 2025].map(year => (
            <option key={year} value={year}>{year}</option>
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

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="city" 
            tick={{ fontSize: 12 }}
            angle={-15}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tickFormatter={formatRevenue}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar 
            dataKey="revenue" 
            fill="#8884d8" 
            radius={[8, 8, 0, 0]}
            name="Revenue ($)"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatRevenue(data.reduce((sum, item) => sum + item.revenue, 0))}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Bookings</p>
          <p className="text-2xl font-bold text-green-600">
            {data.reduce((sum, item) => sum + item.bookings, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Avg per City</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatRevenue(data.reduce((sum, item) => sum + item.revenue, 0) / data.length)}
          </p>
        </div>
      </div>
    </div>
  );
};
