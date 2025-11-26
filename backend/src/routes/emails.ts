import express from 'express';
import { Email } from '../models/Email';
import { User } from '../models/User';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const getEmailsSchema = Joi.object({
  wallet: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid('received', 'sent').default('received'),
  unread: Joi.boolean().default(false),
  priority: Joi.number().integer().min(0).max(2).optional(),
  search: Joi.string().max(100).optional()
});

const markReadSchema = Joi.object({
  mailId: Joi.number().integer().required(),
  wallet: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

// GET /api/emails - Get emails for a user
router.get('/', validateRequest(getEmailsSchema, 'query'), async (req, res) => {
  try {
    const { wallet, page, limit, type, unread, priority, search } = req.query as any;

    // Build query
    const query: any = {
      isDeleted: false
    };

    if (type === 'received') {
      query.to = wallet.toLowerCase();
    } else {
      query.from = wallet.toLowerCase();
    }

    if (unread) {
      query.isRead = false;
    }

    if (priority !== undefined) {
      query.priority = priority;
    }

    if (search) {
      query.$or = [
        { fromEmail: { $regex: search, $options: 'i' } },
        { toEmail: { $regex: search, $options: 'i' } },
        { fromUsername: { $regex: search, $options: 'i' } },
        { toUsername: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [emails, total] = await Promise.all([
      Email.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Email.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        emails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emails'
    });
  }
});

// GET /api/emails/:mailId - Get specific email
router.get('/:mailId', async (req, res) => {
  try {
    const { mailId } = req.params;
    const { wallet } = req.query;

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet as string)) {
      return res.status(400).json({
        success: false,
        error: 'Valid wallet address required'
      });
    }

    const email = await Email.findOne({
      mailId: parseInt(mailId),
      $or: [
        { from: (wallet as string).toLowerCase() },
        { to: (wallet as string).toLowerCase() }
      ],
      isDeleted: false
    }).lean();

    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    res.json({
      success: true,
      data: email
    });

  } catch (error) {
    logger.error('Error fetching email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email'
    });
  }
});

// POST /api/emails/mark-read - Mark email as read
router.post('/mark-read', validateRequest(markReadSchema), async (req, res) => {
  try {
    const { mailId, wallet } = req.body;

    const email = await Email.findOneAndUpdate(
      {
        mailId,
        to: wallet.toLowerCase(),
        isDeleted: false,
        isRead: false
      },
      {
        isRead: true,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found or already read'
      });
    }

    // Update user unread count
    await User.findOneAndUpdate(
      { walletAddress: wallet.toLowerCase() },
      { $inc: { 'emailCount.unread': -1 } }
    );

    res.json({
      success: true,
      data: email
    });

  } catch (error) {
    logger.error('Error marking email as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark email as read'
    });
  }
});

// GET /api/emails/stats/:wallet - Get email statistics
router.get('/stats/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }

    const walletLower = wallet.toLowerCase();

    const [sentCount, receivedCount, unreadCount] = await Promise.all([
      Email.countDocuments({ from: walletLower, isDeleted: false }),
      Email.countDocuments({ to: walletLower, isDeleted: false }),
      Email.countDocuments({ to: walletLower, isDeleted: false, isRead: false })
    ]);

    // Get priority breakdown
    const priorityStats = await Email.aggregate([
      {
        $match: {
          to: walletLower,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityBreakdown = {
      normal: 0,
      high: 0,
      urgent: 0
    };

    priorityStats.forEach(stat => {
      switch (stat._id) {
        case 0:
          priorityBreakdown.normal = stat.count;
          break;
        case 1:
          priorityBreakdown.high = stat.count;
          break;
        case 2:
          priorityBreakdown.urgent = stat.count;
          break;
      }
    });

    res.json({
      success: true,
      data: {
        sent: sentCount,
        received: receivedCount,
        unread: unreadCount,
        priorityBreakdown
      }
    });

  } catch (error) {
    logger.error('Error fetching email stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email statistics'
    });
  }
});

// GET /api/emails/search - Search emails
router.get('/search', async (req, res) => {
  try {
    const { wallet, query: searchQuery, page = 1, limit = 20 } = req.query;

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet as string)) {
      return res.status(400).json({
        success: false,
        error: 'Valid wallet address required'
      });
    }

    if (!searchQuery || typeof searchQuery !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query required'
      });
    }

    const walletLower = (wallet as string).toLowerCase();
    const skip = (Number(page) - 1) * Number(limit);

    const searchFilter = {
      $or: [
        { from: walletLower },
        { to: walletLower }
      ],
      isDeleted: false,
      $text: { $search: searchQuery }
    };

    const [emails, total] = await Promise.all([
      Email.find(searchFilter)
        .sort({ score: { $meta: 'textScore' }, timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Email.countDocuments(searchFilter)
    ]);

    res.json({
      success: true,
      data: {
        emails,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Error searching emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search emails'
    });
  }
});

export { router as emailRoutes };
