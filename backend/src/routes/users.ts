import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// GET /api/users/profile - Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // TODO: Implement user profile endpoint
    res.json({ message: 'User profile endpoint - Coming soon' });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;