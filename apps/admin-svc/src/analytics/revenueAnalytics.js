const { MongoClient } = require('mongodb');

class RevenueAnalytics {
  constructor(mongoClient) {
    this.client = mongoClient;
    this.db = this.client.db('kayak');
    this.bookings = this.db.collection('bookings');
    this.deals = this.db.collection('deals');
  }

  async getRevenueAnalytics(timeRange, destination = null, includeForecasts = false) {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'last_24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const matchQuery = {
      created_at: { $gte: startDate },
      status: 'confirmed'
    };

    if (destination && destination !== 'All') {
      matchQuery.destination = { $regex: destination, $options: 'i' };
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            day: { $dayOfMonth: '$created_at' }
          },
          totalRevenue: { $sum: '$total_amount' },
          bookingCount: { $sum: 1 },
          averageBookingValue: { $avg: '$total_amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ];

    const dailyData = await this.bookings.aggregate(pipeline).toArray();
    
    // Calculate totals
    const totals = await this.bookings.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total_amount' },
          totalBookings: { $sum: 1 },
          averageBookingValue: { $avg: '$total_amount' }
        }
      }
    ]).toArray();

    const totalData = totals[0] || { totalRevenue: 0, totalBookings: 0, averageBookingValue: 0 };

    let forecasts = [];
    if (includeForecasts) {
      forecasts = await this.generateRevenueForecasts(dailyData);
    }

    return {
      totalRevenue: totalData.totalRevenue,
      totalBookings: totalData.totalBookings,
      averageBookingValue: Math.round(totalData.averageBookingValue * 100) / 100,
      dailyData: dailyData.map(item => ({
        date: new Date(item._id.year, item._id.month - 1, item._id.day),
        revenue: Math.round(item.totalRevenue * 100) / 100,
        bookings: item.bookingCount,
        averageValue: Math.round(item.averageBookingValue * 100) / 100
      })),
      forecasts: forecasts,
      period: timeRange,
      destination: destination
    };
  }

  async generateRevenueForecasts(dailyData) {
    if (dailyData.length < 7) return [];

    // Simple linear trend forecast
    const recentDays = dailyData.slice(-7);
    const recentRevenue = recentDays.map(d => d.totalRevenue);
    const avgDailyRevenue = recentRevenue.reduce((a, b) => a + b, 0) / recentRevenue.length;
    
    // Calculate trend
    const trend = this.calculateTrend(recentRevenue);
    
    const forecasts = [];
    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      
      const predictedRevenue = avgDailyRevenue + (trend * i);
      forecasts.push({
        date: forecastDate,
        predictedRevenue: Math.max(0, Math.round(predictedRevenue * 100) / 100),
        confidence: Math.min(0.9, Math.max(0.7, 1 - Math.abs(trend) / avgDailyRevenue))
      });
    }

    return forecasts;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = values.reduce((sum, _, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  async getRevenueByService() {
    const pipeline = [
      { $match: { status: 'confirmed' } },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.type',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ];

    const results = await this.bookings.aggregate(pipeline).toArray();
    
    return results.map(item => ({
      serviceType: item._id,
      revenue: Math.round(item.revenue * 100) / 100,
      count: item.count,
      percentage: 0 // Will be calculated by caller
    }));
  }

  async getTopDestinations(limit = 10) {
    const pipeline = [
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: '$destination',
          totalRevenue: { $sum: '$total_amount' },
          bookingCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit }
    ];

    const results = await this.bookings.aggregate(pipeline).toArray();
    
    return results.map(item => ({
      destination: item._id,
      revenue: Math.round(item.totalRevenue * 100) / 100,
      bookings: item.bookingCount
    }));
  }
}

module.exports = RevenueAnalytics;
