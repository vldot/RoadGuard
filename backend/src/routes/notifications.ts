import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticateToken, checkRole } from '../middleware/auth';

const router = Router();

// Create notification
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, title, message, type, relatedId } = req.body;
    
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        relatedId
      }
    });
    
    res.status(201).json({ notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notifications for a user
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    
    res.json({ notification });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read for a user
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { 
        userId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Count unread notifications
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Error counting notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
