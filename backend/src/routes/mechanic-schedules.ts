import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// Schema for creating a schedule entry
const createScheduleSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string().transform(val => new Date(val)),
  endTime: z.string().transform(val => new Date(val)),
  isAllDay: z.boolean().optional(),
  type: z.string(),
  serviceId: z.string().optional(),
});

// Create schedule entry for mechanic
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Check if the user is a mechanic
    const mechanic = await prisma.mechanic.findUnique({
      where: { userId: req.user.id }
    });

    if (!mechanic) {
      return res.status(403).json({ error: 'Only mechanics can create schedule entries' });
    }

    const validatedData = createScheduleSchema.parse(req.body);
    
    const scheduleEntry = await prisma.mechanicSchedule.create({
      data: {
        ...validatedData,
        mechanicId: mechanic.id
      }
    });
    
    res.status(201).json({ scheduleEntry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating schedule entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get schedule entries for a mechanic
router.get('/mechanic/:mechanicId', authenticateToken, async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Verify that the user has permission to view this mechanic's schedule
    const mechanic = await prisma.mechanic.findUnique({
      where: { id: mechanicId },
      include: { workshop: true }
    });

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    // Allow access if the user is the mechanic or the workshop admin
    if (req.user.id !== mechanic.userId && req.user.id !== mechanic.workshop.adminId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Not authorized to view this schedule' });
    }

    const whereClause: any = {
      mechanicId
    };

    // Filter by date range if provided
    if (startDate && endDate) {
      whereClause.startTime = {
        gte: new Date(startDate as string)
      };
      whereClause.endTime = {
        lte: new Date(endDate as string)
      };
    }

    const scheduleEntries = await prisma.mechanicSchedule.findMany({
      where: whereClause,
      orderBy: {
        startTime: 'asc'
      }
    });
    
    res.json({ scheduleEntries });
  } catch (error) {
    console.error('Error fetching schedule entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a schedule entry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the schedule entry
    const scheduleEntry = await prisma.mechanicSchedule.findUnique({
      where: { id },
      include: { 
        // Include relations if needed
      }
    });

    if (!scheduleEntry) {
      return res.status(404).json({ error: 'Schedule entry not found' });
    }

    // Check if the user is authorized to update this entry
    const mechanic = await prisma.mechanic.findUnique({
      where: { userId: req.user.id }
    });

    if (!mechanic || mechanic.id !== scheduleEntry.mechanicId) {
      return res.status(403).json({ error: 'Not authorized to update this schedule entry' });
    }

    const validatedData = createScheduleSchema.parse(req.body);
    
    const updatedEntry = await prisma.mechanicSchedule.update({
      where: { id },
      data: validatedData
    });
    
    res.json({ scheduleEntry: updatedEntry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating schedule entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a schedule entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the schedule entry
    const scheduleEntry = await prisma.mechanicSchedule.findUnique({
      where: { id }
    });

    if (!scheduleEntry) {
      return res.status(404).json({ error: 'Schedule entry not found' });
    }

    // Check if the user is authorized to delete this entry
    const mechanic = await prisma.mechanic.findUnique({
      where: { userId: req.user.id }
    });

    if (!mechanic || mechanic.id !== scheduleEntry.mechanicId) {
      return res.status(403).json({ error: 'Not authorized to delete this schedule entry' });
    }

    await prisma.mechanicSchedule.delete({
      where: { id }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mechanic's current availability status
router.get('/availability/:mechanicId', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    
    const mechanic = await prisma.mechanic.findUnique({
      where: { id: mechanicId }
    });

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }
    
    res.json({ availability: mechanic.availability });
  } catch (error) {
    console.error('Error fetching mechanic availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update mechanic's availability status
router.patch('/availability/:mechanicId', authenticateToken, async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const { availability } = req.body;
    
    // Validate the availability status
    if (!['AVAILABLE', 'IN_SERVICE', 'NOT_AVAILABLE'].includes(availability)) {
      return res.status(400).json({ error: 'Invalid availability status' });
    }

    // Check if the user is authorized to update the mechanic's availability
    const mechanic = await prisma.mechanic.findUnique({
      where: { id: mechanicId }
    });

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    // Only the mechanic or the workshop admin can update availability
    if (req.user.id !== mechanic.userId && req.user.role !== 'WORKSHOP_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Not authorized to update availability' });
    }

    const updatedMechanic = await prisma.mechanic.update({
      where: { id: mechanicId },
      data: { availability }
    });
    
    res.json({ mechanic: updatedMechanic });
  } catch (error) {
    console.error('Error updating mechanic availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
