const { MongoClient } = require('mongodb');

class BookingAnalytics {
  constructor(mongoClient) {
    this.client = mongoClient;
    this.db = this.client.db('kayak');
    this.bookings = this.db.collection('bookings');
    this.clickstream = this.db.collection('clickstream');
  }

  async getBookingTrends(timeRange, groupBy = 'day') {
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

    // Determine grouping format
    let groupFormat;
    switch (groupBy) {
      case 'hour':
        groupFormat = {
          year: { $year: '$created_at' },
          month: { $month: '$created_at' },
          day: { $dayOfMonth: '$created_at' },
          hour: { $hour: '$created_at' }
        };
        break;
      case 'day':
        groupFormat = {
          year: { $year: '$created_at' },
          month: { $month: '$created_at' },
          day: { $dayOfMonth: '$created_at' }
        };
        break;
      case 'week':
        groupFormat = {
          year: { $year: '$created_at' },
          week: { $week: '$created_at' }
        };
        break;
      case 'month':
        groupFormat = {
          year: { $year: '$created_at' },
          month: { $month: '$created_at' }
        };
        break;
    }

    const pipeline = [
      {
        $match: {
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupFormat,
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          pendingBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, '$total_amount', 0] }
          },
          averageBookingValue: {
            $avg: { $cond: [{ $eq: ['$status', 'confirmed'] }, '$total_amount', null] }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    const dailyData = await this.bookings.aggregate(pipeline).toArray();

    // Calculate conversion rates
    const conversionRates = dailyData.map(item => ({
      ...item,
      conversionRate: item.totalBookings > 0 
        ? Math.round((item.confirmedBookings / item.totalBookings) * 10000) / 100 
        : 0,
      cancellationRate: item.totalBookings > 0 
        ? Math.round((item.cancelledBookings / item.totalBookings) * 10000) / 100 
        : 0,
      averageValue: Math.round(item.averageBookingValue * 100) / 100
    }));

    // Find peak days
    const confirmedBookings = conversionRates.filter(item => item.confirmedBookings > 0);
    const maxBookings = Math.max(...confirmedBookings.map(item => item.confirmedBookings));
    const peakDays = confirmedBookings
      .filter(item => item.confirmedBookings > maxBookings * 0.8)
      .map(item => item._id);

    // Calculate growth metrics
    const growthMetrics = this.calculateGrowthMetrics(conversionRates);

    return {
      dailyData: conversionRates,
      peakDays: peakDays,
      growthMetrics: growthMetrics,
      conversionRates: {
        overall: this.calculateOverallConversionRate(conversionRates),
        average: this.calculateAverageConversionRate(conversionRates)
      },
      period: timeRange,
      grouping: groupBy
    };
  }

  calculateGrowthMetrics(data) {
    if (data.length < 2) return { growth: 0, trend: 'stable' };

    const firstPeriod = data.slice(0, Math.floor(data.length / 2));
    const secondPeriod = data.slice(Math.floor(data.length / 2));

    const firstTotal = firstPeriod.reduce((sum, item) => sum + item.confirmedBookings, 0);
    const secondTotal = secondPeriod.reduce((sum, item) => sum + item.confirmedBookings, 0);

    const growth = firstTotal > 0 
      ? ((secondTotal - firstTotal) / firstTotal) * 100 
      : 0;

    let trend = 'stable';
    if (Math.abs(growth) > 5) {
      trend = growth > 0 ? 'growing' : 'declining';
    }

    return {
      growth: Math.round(growth * 100) / 100,
      trend,
      firstPeriodTotal: firstTotal,
      secondPeriodTotal: secondTotal
    };
  }

  calculateOverallConversionRate(data) {
    const totalBookings = data.reduce((sum, item) => sum + item.totalBookings, 0);
    const confirmedBookings = data.reduce((sum, item) => sum + item.confirmedBookings, 0);
    
    return totalBookings > 0 
      ? Math.round((confirmedBookings / totalBookings) * 10000) / 100 
      : 0;
  }

  calculateAverageConversionRate(data) {
    const confirmedData = data.filter(item => item.totalBookings > 0);
    if (confirmedData.length === 0) return 0;

    const avgRate = confirmedData.reduce((sum, item) => 
      sum + (item.confirmedBookings / item.totalBookings), 0) / confirmedData.length;
    
    return Math.round(avgRate * 10000) / 100;
  }

  async getBookingPatterns() {
    // Booking patterns by day of week
    const dayOfWeekPatterns = await this.bookings.aggregate([
      {
        $match: { status: 'confirmed' }
      },
      {
        $addFields: {
          dayOfWeek: { $dayOfWeek: '$created_at' }
        }
      },
      {
        $group: {
          _id: '$dayOfWeek',
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: '$total_amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Booking patterns by hour of day
    const hourOfDayPatterns = await this.bookings.aggregate([
      {
        $match: { status: 'confirmed' }
      },
      {
        $addFields: {
          hourOfDay: { $hour: '$created_at' }
        }
      },
      {
        $group: {
          _id: '$hourOfDay',
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: '$total_amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Service type distribution
    const serviceDistribution = await this.bookings.aggregate([
      {
        $match: { status: 'confirmed' }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.type',
          count: { $sum: 1 },
          revenue: { $sum: '$items.price' }
        }
      },
      { $sort: { revenue: -1 } }
    ]).toArray();

    return {
      dayOfWeek: dayOfWeekPatterns.map(item => ({
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][item._id - 1],
        bookings: item.bookingCount,
        revenue: Math.round(item.totalRevenue * 100) / 100
      })),
      hourOfDay: hourOfDayPatterns.map(item => ({
        hour: item._id,
        bookings: item.bookingCount,
        revenue: Math.round(item.totalRevenue * 100) / 100
      })),
      serviceTypes: serviceDistribution.map(item => ({
        type: item._id,
        count: item.count,
        revenue: Math.round(item.revenue * 100) / 100
      }))
    };
  }

  async getConversionFunnel() {
    // Track user journey from search to booking
    const funnel = await this.clickstream.aggregate([
      {
        $match: {
          eventType: { $in: ['search', 'view', 'add_to_cart', 'booking'] }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      }
    ]).toArray();

    const search = funnel.find(f => f._id === 'search') || { uniqueUsers: [] };
    const view = funnel.find(f => f._id === 'view') || { uniqueUsers: [] };
    const addToCart = funnel.find(f => f._id === 'add_to_cart') || { uniqueUsers: [] };
    const booking = funnel.find(f => f._id === 'booking') || { uniqueUsers: [] };

    return {
      stages: [
        {
          stage: 'Search',
          count: search.uniqueUsers.length,
          percentage: 100
        },
        {
          stage: 'View Results',
          count: view.uniqueUsers.length,
          percentage: search.uniqueUsers.length > 0 
            ? Math.round((view.uniqueUsers.length / search.uniqueUsers.length) * 10000) / 100 
            : 0
        },
        {
          stage: 'Add to Cart',
          count: addToCart.uniqueUsers.length,
          percentage: view.uniqueUsers.length > 0 
            ? Math.round((addToCart.uniqueUsers.length / view.uniqueUsers.length) * 10000) / 100 
            : 0
        },
        {
          stage: 'Complete Booking',
          count: booking.uniqueUsers.length,
          percentage: addToCart.uniqueUsers.length > 0 
            ? Math.round((booking.uniqueUsers.length / addToCart.uniqueUsers.length) * 10000) / 100 
            : 0
        }
      ]
    };
  }

  async getPeakBookingTimes() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const peakTimes = await this.bookings.aggregate([
      {
        $match: {
          created_at: { $gte: thirtyDaysAgo },
          status: 'confirmed'
        }
      },
      {
        $addFields: {
          dayOfWeek: { $dayOfWeek: '$created_at' },
          hourOfDay: { $hour: '$created_at' }
        }
      },
      {
        $group: {
          _id: {
            day: '$dayOfWeek',
            hour: '$hourOfDay'
          },
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: '$total_amount' }
        }
      },
      { $sort: { bookingCount: -1 } },
      { $limit: 10 }
    ]).toArray();

    return peakTimes.map(item => ({
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][item._id.day - 1],
      hour: item._id.hour,
      bookings: item.bookingCount,
      revenue: Math.round(item.totalRevenue * 100) / 100
    }));
  }
}

module.exports = BookingAnalytics;
