import express from 'express';
import { Email } from '../models/Email';
import { User } from '../models/User';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/stats/global - Get global platform statistics
router.get('/global', async (req, res) => {
  try {
    const [
      totalUsers,
      totalEmails,
      totalUnreadEmails,
      recentUsers,
      recentEmails
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Email.countDocuments({ isDeleted: false }),
      Email.countDocuments({ isDeleted: false, isRead: false }),
      User.countDocuments({
        isActive: true,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      Email.countDocuments({
        isDeleted: false,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    // Get email activity by hour for the last 24 hours
    const hourlyActivity = await Email.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1, '_id.hour': 1 }
      }
    ]);

    // Get priority distribution
    const priorityDistribution = await Email.aggregate([
      {
        $match: { isDeleted: false }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = {
      normal: 0,
      high: 0,
      urgent: 0
    };

    priorityDistribution.forEach(stat => {
      switch (stat._id) {
        case 0:
          priorityStats.normal = stat.count;
          break;
        case 1:
          priorityStats.high = stat.count;
          break;
        case 2:
          priorityStats.urgent = stat.count;
          break;
      }
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalEmails,
          totalUnreadEmails,
          recentUsers,
          recentEmails
        },
        hourlyActivity,
        priorityStats
      }
    });

  } catch (error) {
    logger.error('Error fetching global stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch global statistics'
    });
  }
});

// GET /api/stats/network - Get network statistics
router.get('/network', async (req, res) => {
  try {
    // Get most active users (by email count)
    const topSenders = await User.find({
      isActive: true,
      'emailCount.sent': { $gt: 0 }
    })
    .sort({ 'emailCount.sent': -1 })
    .limit(10)
    .select('username email emailCount.sent isVerified')
    .lean();

    const topReceivers = await User.find({
      isActive: true,
      'emailCount.received': { $gt: 0 }
    })
    .sort({ 'emailCount.received': -1 })
    .limit(10)
    .select('username email emailCount.received isVerified')
    .lean();

    // Get verification statistics
    const verificationStats = await User.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$isVerified',
          count: { $sum: 1 }
        }
      }
    ]);

    const verifiedCount = verificationStats.find(stat => stat._id === true)?.count || 0;
    const unverifiedCount = verificationStats.find(stat => stat._id === false)?.count || 0;

    // Get daily email volume for the last 30 days
    const dailyVolume = await Email.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        topSenders,
        topReceivers,
        verification: {
          verified: verifiedCount,
          unverified: unverifiedCount,
          total: verifiedCount + unverifiedCount
        },
        dailyVolume
      }
    });

  } catch (error) {
    logger.error('Error fetching network stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch network statistics'
    });
  }
});

export { router as statsRoutes };
