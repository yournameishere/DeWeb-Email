import express from 'express';
import { User } from '../models/User';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const getUserSchema = Joi.object({
  wallet: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const searchUsersSchema = Joi.object({
  query: Joi.string().min(2).max(50).required(),
  limit: Joi.number().integer().min(1).max(20).default(10)
});

// GET /api/users/:wallet - Get user by wallet address
router.get('/:wallet', validateRequest(getUserSchema, 'params'), async (req, res) => {
  try {
    const { wallet } = req.params;

    const user = await User.findOne({
      walletAddress: wallet.toLowerCase(),
      isActive: true
    }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Remove sensitive information
    const { publicKeyEncrypt, ...safeUser } = user;

    res.json({
      success: true,
      data: safeUser
    });

  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// GET /api/users/search - Search users
router.get('/search', validateRequest(searchUsersSchema, 'query'), async (req, res) => {
  try {
    const { query: searchQuery, limit } = req.query as any;

    const users = await User.find({
      $or: [
        { username: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ],
      isActive: true,
      'settings.publicProfile': true
    })
    .select('walletAddress username email isVerified emailCount.sent emailCount.received')
    .limit(limit)
    .lean();

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

// GET /api/users/by-email/:email - Get user by email
router.get('/by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email required'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true
    })
    .select('walletAddress username email isVerified publicKeyEncrypt')
    .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    logger.error('Error fetching user by email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// GET /api/users/by-username/:username - Get user by username
router.get('/by-username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Valid username required'
      });
    }

    const user = await User.findOne({
      username: username.toLowerCase(),
      isActive: true
    })
    .select('walletAddress username email isVerified publicKeyEncrypt')
    .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    logger.error('Error fetching user by username:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

export { router as userRoutes };
