import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  role: z.enum(['END_USER', 'WORKSHOP_ADMIN', 'MECHANIC']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  workshopData: z.object({
    name: z.string(),
    description: z.string().optional(),
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    phone: z.string()
  }).optional()
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['END_USER', 'WORKSHOP_ADMIN', 'MECHANIC']).optional(),
  verified: z.boolean().optional()
});

const createWorkshopSchema = z.object({
  name: z.string().min(1, 'Workshop name is required'),
  description: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  latitude: z.number(),
  longitude: z.number(),
  phone: z.string().min(1, 'Phone is required'),
  adminId: z.string().min(1, 'Admin ID is required')
});

// GET /api/admin/users - Get all users with pagination
router.get('/users', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};
    
    if (role && role !== 'ALL') {
      whereClause.role = role;
    }
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          verified: true,
          createdAt: true,
          updatedAt: true,
          workshop: {
            select: { id: true, name: true, isOpen: true }
          },
          mechanic: {
            select: { id: true, availability: true, rating: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.user.count({ where: whereClause })
    ]);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users - Create new user
router.post('/users', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const validatedData = createUserSchema.parse(req.body);
    const { name, email, phone, role, password, workshopData } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role,
          verified: true
        }
      });

      // If workshop admin, create workshop
      if (role === 'WORKSHOP_ADMIN' && workshopData) {
        await tx.workshop.create({
          data: {
            ...workshopData,
            adminId: newUser.id
          }
        });
      }

      return newUser;
    });

    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    res.status(201).json({ 
      message: 'User created successfully',
      user: userResponse 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateUserSchema.parse(req.body);

    // Check if email is already taken (if updating email)
    if (validatedData.email) {
      const existingUser = await prisma.user.findFirst({
        where: { 
          email: validatedData.email,
          NOT: { id }
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use by another user' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        verified: true,
        updatedAt: true
      }
    });

    res.json({ 
      message: 'User updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Prevent super admin from deleting themselves
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/workshops - Get all workshops
router.get('/workshops', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (status === 'open') {
      whereClause.isOpen = true;
    } else if (status === 'closed') {
      whereClause.isOpen = false;
    }

    const [workshops, total] = await Promise.all([
      prisma.workshop.findMany({
        where: whereClause,
        include: {
          admin: {
            select: { name: true, email: true, phone: true }
          },
          mechanics: {
            select: { 
              id: true, 
              availability: true,
              user: { select: { name: true } }
            }
          },
          _count: {
            select: {
              serviceRequests: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.workshop.count({ where: whereClause })
    ]);

    res.json({
      workshops,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching workshops:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/workshops - Create new workshop
router.post('/workshops', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const validatedData = createWorkshopSchema.parse(req.body);

    // Check if admin exists and is a workshop admin
    const admin = await prisma.user.findUnique({
      where: { id: validatedData.adminId }
    });

    if (!admin || admin.role !== 'WORKSHOP_ADMIN') {
      return res.status(400).json({ error: 'Invalid admin user or user is not a workshop admin' });
    }

    // Check if admin already has a workshop
    const existingWorkshop = await prisma.workshop.findUnique({
      where: { adminId: validatedData.adminId }
    });

    if (existingWorkshop) {
      return res.status(400).json({ error: 'This user already manages a workshop' });
    }

    const workshop = await prisma.workshop.create({
      data: validatedData,
      include: {
        admin: {
          select: { name: true, email: true, phone: true }
        }
      }
    });

    res.status(201).json({
      message: 'Workshop created successfully',
      workshop
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating workshop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/workshops/:id - Update workshop
router.put('/workshops/:id', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedWorkshop = await prisma.workshop.update({
      where: { id },
      data: updateData,
      include: {
        admin: {
          select: { name: true, email: true, phone: true }
        }
      }
    });

    res.json({
      message: 'Workshop updated successfully',
      workshop: updatedWorkshop
    });
  } catch (error) {
    console.error('Error updating workshop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/workshops/:id - Delete workshop
router.delete('/workshops/:id', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.workshop.delete({
      where: { id }
    });

    res.json({ message: 'Workshop deleted successfully' });
  } catch (error) {
    console.error('Error deleting workshop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/stats - Get platform statistics
router.get('/stats', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const [
      totalUsers,
      totalWorkshops,
      totalServiceRequests,
      totalMechanics,
      recentUsers,
      recentServiceRequests,
      usersByRole,
      serviceRequestsByStatus
    ] = await Promise.all([
      prisma.user.count(),
      prisma.workshop.count(),
      prisma.serviceRequest.count(),
      prisma.mechanic.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      }),
      prisma.serviceRequest.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true
        }
      }),
      prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      })
    ]);

    const stats = {
      overview: {
        totalUsers,
        totalWorkshops,
        totalServiceRequests,
        totalMechanics,
        recentUsers,
        recentServiceRequests
      },
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {} as Record<string, number>),
      serviceRequestsByStatus: serviceRequestsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;