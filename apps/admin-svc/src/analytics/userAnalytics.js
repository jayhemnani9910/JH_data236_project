const { MongoClient } = require('mongodb');

class UserAnalytics {
  constructor(mongoClient) {
    this.client = mongoClient;
    this.db = this.client.db('kayak');
    this.users = this.db.collection('users');
    this.bookings = this.db.collection('bookings');
    this.clickstream = this.db.collection('clickstream');
  }

  async getUserAnalytics(timeRange) {
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

    // Basic user metrics
    const totalUsers = await this.users.countDocuments();
    const newUsers = await this.users.countDocuments({
      created_at: { $gte: startDate }
    });

    // Active users (made a booking in period)
    const activeUsers = await this.users.countDocuments({
      last_activity: { $gte: startDate }
    });

    // User demographics
    const demographics = await this.getUserDemographics();

    // User behavior metrics
    const behavior = await this.getUserBehavior(startDate);

    // Retention analysis
    const retention = await this.getRetentionAnalysis(startDate);

    // Booking patterns by user type
    const bookingPatterns = await this.getBookingPatterns(startDate);

    return {
      totalUsers,
      newUsers,
      activeUsers,
      demographics,
      behavior,
      retention,
      bookingPatterns,
      period: timeRange
    };
  }

  async getUserDemographics() {
    const ageGroups = await this.users.aggregate([
      {
        $bucket: {
          groupBy: '$age',
          boundaries: [18, 25, 35, 45, 55, 65, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            percentage: { $sum: 1 }
          }
        }
      }
    ]).toArray();

    const genderDistribution = await this.users.aggregate([
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 },
          percentage: { $sum: 1 }
        }
      }
    ]).toArray();

    const locationDistribution = await this.users.aggregate([
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    return {
      ageGroups: ageGroups.map(group => ({
        range: `${group._id}-${group._id === 18 ? 24 : group._id === 100 ? '65+' : group._id + 9}`,
        count: group.count,
        percentage: 0 // Will be calculated
      })),
      genderDistribution: genderDistribution.map(group => ({
        gender: group._id,
        count: group.count,
        percentage: 0 // Will be calculated
      })),
      topLocations: locationDistribution.map(group => ({
        location: group._id,
        count: group.count
      }))
    };
  }

  async getUserBehavior(startDate) {
    // Average session duration and page views
    const behaviorData = await this.clickstream.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          sessionCount: { $sum: 1 },
          pageViews: { $sum: '$pageViews' },
          totalDuration: { $sum: '$duration' },
          searches: { $sum: { $cond: [{ $eq: ['$eventType', 'search'] }, 1, 0] } },
          bookings: { $sum: { $cond: [{ $eq: ['$eventType', 'booking'] }, 1, 0] } }
        }
      }
    ]).toArray();

    // Calculate averages
    const totalUsers = behaviorData.length;
    const avgSessionDuration = totalUsers > 0 
      ? behaviorData.reduce((sum, user) => sum + user.totalDuration, 0) / totalUsers 
      : 0;
    const avgPageViews = totalUsers > 0 
      ? behaviorData.reduce((sum, user) => sum + user.pageViews, 0) / totalUsers 
      : 0;
    const conversionRate = totalUsers > 0 
      ? behaviorData.filter(user => user.bookings > 0).length / totalUsers * 100 
      : 0;

    return {
      avgSessionDuration: Math.round(avgSessionDuration),
      avgPageViews: Math.round(avgPageViews * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalSessions: behaviorData.reduce((sum, user) => sum + user.sessionCount, 0)
    };
  }

  async getRetentionAnalysis(startDate) {
    // Cohort analysis
    const cohortData = await this.users.aggregate([
      {
        $match: {
          created_at: { $gte: new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $addFields: {
          cohortWeek: {
            $week: '$created_at'
          }
        }
      },
      {
        $group: {
          _id: '$cohortWeek',
          cohortSize: { $sum: 1 },
          userIds: { $push: '$_id' }
        }
      }
    ]).toArray();

    // Calculate retention for each cohort
    const retentionRates = [];
    for (const cohort of cohortData) {
      const retention = await this.calculateCohortRetention(cohort.userIds, cohort.cohortSize);
      retentionRates.push({
        cohort: cohort._id,
        size: cohort.cohortSize,
        retention: retention
      });
    }

    return {
      retentionRates: retentionRates.slice(-10), // Last 10 cohorts
      avgRetention30Day: retentionRates.length > 0 
        ? retentionRates.reduce((sum, cohort) => sum + (cohort.retention['30'] || 0), 0) / retentionRates.length 
        : 0
    };
  }

  async calculateCohortRetention(userIds, cohortSize) {
    const retention = {};
    
    for (const day of [1, 7, 14, 30, 60, 90]) {
      const activeUsers = await this.users.countDocuments({
        _id: { $in: userIds },
        last_activity: { 
          $gte: new Date(Date.now() - day * 24 * 60 * 60 * 1000) 
        }
      });
      
      retention[day] = cohortSize > 0 ? (activeUsers / cohortSize) * 100 : 0;
    }

    return retention;
  }

  async getBookingPatterns(startDate) {
    const patterns = await this.bookings.aggregate([
      {
        $match: {
          created_at: { $gte: startDate },
          status: 'confirmed'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $group: {
          _id: {
            userType: '$user.user_type',
            serviceType: '$items.type'
          },
          avgBookingValue: { $avg: '$total_amount' },
          bookingCount: { $sum: 1 }
        }
      }
    ]).toArray();

    return patterns.map(pattern => ({
      userType: pattern._id.userType,
      serviceType: pattern._id.serviceType,
      avgBookingValue: Math.round(pattern.avgBookingValue * 100) / 100,
      bookingCount: pattern.bookingCount
    }));
  }

  async getUserEngagement() {
    // Daily active users (DAU)
    const dau = await this.users.countDocuments({
      last_activity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Weekly active users (WAU)
    const wau = await this.users.countDocuments({
      last_activity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    // Monthly active users (MAU)
    const mau = await this.users.countDocuments({
      last_activity: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    return {
      dau,
      wau,
      mau,
      dauWauRatio: wau > 0 ? Math.round((dau / wau) * 100) / 100 : 0,
      wauMauRatio: mau > 0 ? Math.round((wau / mau) * 100) / 100 : 0
    };
  }
}

module.exports = UserAnalytics;
