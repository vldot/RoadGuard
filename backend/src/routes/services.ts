import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { io } from '../index';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createServiceRequestSchema = z.object({
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  issueType: z.string().min(1, 'Issue type is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  latitude: z.number(),
  longitude: z.number(),
  images: z.array(z.string()).default([]),
  workshopId: z.string().optional(),
  serviceType: z.enum(['instant', 'prebook']).optional(),
  scheduledTime: z.string().optional(),
  servicePresetId: z.string().optional(),
  costBreakdown: z.any().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional()
});

const updateServiceStatusSchema = z.object({
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'REACHED', 'COMPLETED', 'CANCELLED']),
  message: z.string().optional(),
  estimatedCost: z.number().optional(),
  actualCost: z.number().optional()
});

const assignMechanicSchema = z.object({
  mechanicId: z.string().min(1, 'Mechanic ID is required')
});

// GET /api/services - Get all service requests (admin only) or mechanic's assigned requests
router.get('/', authenticateToken, requireRole(['WORKSHOP_ADMIN', 'MECHANIC']), async (req: AuthRequest, res) => {
  try {
    const { status, limit = 20, offset = 0, assignedMechanicId } = req.query;

    let whereClause: any = {};

    if (req.user!.role === 'WORKSHOP_ADMIN') {
      // Get user's workshop
      const workshop = await prisma.workshop.findUnique({
        where: { adminId: req.user!.id }
      });

      if (!workshop) {
        return res.status(404).json({ error: 'Workshop not found' });
      }

      whereClause = {
        OR: [
          { workshopId: workshop.id },
          { workshopId: null } // Unassigned requests
        ]
      };
    } else if (req.user!.role === 'MECHANIC') {
      // Handle mechanic queries
      if (assignedMechanicId) {
        // Verify the mechanic belongs to the requesting user
        const mechanic = await prisma.mechanic.findUnique({
          where: { id: assignedMechanicId as string, userId: req.user!.id }
        });

        if (!mechanic) {
          return res.status(403).json({ error: 'Access denied - mechanic not found or not yours' });
        }

        whereClause.mechanicId = assignedMechanicId;
      } else {
        // Get mechanic's own assignments
        const mechanic = await prisma.mechanic.findUnique({
          where: { userId: req.user!.id }
        });

        if (!mechanic) {
          return res.status(404).json({ error: 'Mechanic profile not found' });
        }

        whereClause.mechanicId = mechanic.id;
      }
    }

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const serviceRequests = await prisma.serviceRequest.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        },
        mechanic: {
          include: {
            user: {
              select: { name: true, phone: true }
            }
          }
        },
        updates: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    res.json({ serviceRequests });
  } catch (error) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/services - Create new service request (end users)
router.post('/', authenticateToken, requireRole(['END_USER']), async (req: AuthRequest, res) => {
  try {
    const validatedData = createServiceRequestSchema.parse(req.body);

    // Create service request with all the fields
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        vehicleType: validatedData.vehicleType,
        vehicleMake: validatedData.vehicleMake,
        vehicleModel: validatedData.vehicleModel,
        issueType: validatedData.issueType,
        description: validatedData.description,
        urgency: validatedData.urgency,
        pickupAddress: validatedData.pickupAddress,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        images: validatedData.images,
        workshopId: validatedData.workshopId,
        customerId: req.user!.id
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        },
        workshop: {
          include: {
            admin: {
              select: { name: true, email: true }
            }
          }
        }
      }
    });

    // Send email notification to workshop admin if workshop is assigned
    if (serviceRequest.workshop && serviceRequest.workshop.admin.email) {
      try {
        const sendServiceRequestNotification = require('../utils/sendServiceRequestNotification');
        await sendServiceRequestNotification(serviceRequest.workshop.admin.email, serviceRequest);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Notify nearby workshops via socket
    io.emit('new-service-request', {
      id: serviceRequest.id,
      location: {
        latitude: serviceRequest.latitude,
        longitude: serviceRequest.longitude
      },
      issueType: serviceRequest.issueType,
      urgency: serviceRequest.urgency,
      workshopId: serviceRequest.workshopId
    });

    res.status(201).json({ serviceRequest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating service request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/services/my-requests - Get user's service requests
router.get('/my-requests', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const serviceRequests = await prisma.serviceRequest.findMany({
      where: { customerId: req.user!.id },
      include: {
        workshop: {
          select: { name: true, phone: true, address: true }
        },
        mechanic: {
          include: {
            user: {
              select: { name: true, phone: true }
            }
          }
        },
        updates: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ serviceRequests });
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/services/my-tasks - Get mechanic's assigned tasks
router.get('/my-tasks', authenticateToken, requireRole(['MECHANIC']), async (req: AuthRequest, res) => {
  try {
    const mechanic = await prisma.mechanic.findUnique({
      where: { userId: req.user!.id }
    });

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic profile not found' });
    }

    const tasks = await prisma.serviceRequest.findMany({
      where: { mechanicId: mechanic.id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        },
        workshop: {
          select: { name: true, address: true, phone: true }
        },
        updates: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching mechanic tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/services/:id/assign - Assign mechanic to service request (admin only)
router.put('/:id/assign', authenticateToken, requireRole(['WORKSHOP_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { mechanicId } = assignMechanicSchema.parse(req.body);

    // Verify workshop ownership
    const workshop = await prisma.workshop.findUnique({
      where: { adminId: req.user!.id }
    });

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    // Verify mechanic belongs to workshop
    const mechanic = await prisma.mechanic.findFirst({
      where: { id: mechanicId, workshopId: workshop.id },
      include: { user: true }
    });

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found in your workshop' });
    }

    // Update service request
    const updatedRequest = await prisma.serviceRequest.update({
      where: { id },
      data: {
        status: 'ASSIGNED',
        mechanicId,
        workshopId: workshop.id,
        assignedAt: new Date()
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        },
        mechanic: {
          include: {
            user: {
              select: { id: true, name: true, phone: true }
            }
          }
        }
      }
    });

    // Create schedule entry for the mechanic
    try {
      // Calculate estimated end time (default: 2 hours from now)
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
      
      await prisma.mechanicSchedule.create({
        data: {
          mechanicId,
          title: `Service Request #${updatedRequest.id.slice(-6)}`,
          description: `${updatedRequest.vehicleType} - ${updatedRequest.issueType || 'Service'} at ${updatedRequest.pickupAddress}`,
          startTime,
          endTime,
          type: 'SERVICE',
          serviceId: updatedRequest.id
        }
      });
      
      // Update mechanic availability
      await prisma.mechanic.update({
        where: { id: mechanicId },
        data: { availability: 'IN_SERVICE' }
      });
    } catch (error) {
      console.error('Error creating mechanic schedule:', error);
      // We don't want to fail the request if scheduling fails
    }

    // Create notifications for mechanic and customer
    try {
      // Notification for mechanic
      await prisma.notification.create({
        data: {
          userId: mechanic.userId,
          title: 'New Service Assignment',
          message: `You've been assigned a new ${updatedRequest.vehicleType} service request in ${updatedRequest.pickupAddress}`,
          type: 'NEW_ASSIGNMENT',
          relatedId: updatedRequest.id
        }
      });
      
      // Notification for customer
      await prisma.notification.create({
        data: {
          userId: updatedRequest.customerId,
          title: 'Service Request Update',
          message: `Your service request has been assigned to ${mechanic.user.name}. They will contact you shortly.`,
          type: 'SERVICE_UPDATE',
          relatedId: updatedRequest.id
        }
      });
    } catch (error) {
      console.error('Error creating notifications:', error);
      // We don't want to fail the request if notification creation fails
    }

    // Notify mechanic and customer via WebSockets
    io.to(`mechanic-${mechanicId}`).emit('task-assigned', {
      serviceRequest: updatedRequest
    });

    io.to(`user-${updatedRequest.customerId}`).emit('request-assigned', {
      mechanic: mechanic.user.name,
      phone: mechanic.user.phone,
      workshop: workshop.name
    });

    res.json({ serviceRequest: updatedRequest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error assigning mechanic:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/services/:id/status - Update service status (mechanic only)
router.put('/:id/status', authenticateToken, requireRole(['MECHANIC']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, message, estimatedCost, actualCost } = updateServiceStatusSchema.parse(req.body);

    // Verify mechanic ownership
    const mechanic = await prisma.mechanic.findUnique({
      where: { userId: req.user!.id }
    });

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic profile not found' });
    }

    const serviceRequest = await prisma.serviceRequest.findFirst({
      where: { id, mechanicId: mechanic.id }
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: 'Service request not found or not assigned to you' });
    }

    // Update service request
    const updateData: any = { status };
    
    if (status === 'IN_PROGRESS' && !serviceRequest.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === 'REACHED' && !serviceRequest.reachedAt) {
      updateData.reachedAt = new Date();
    }
    if (status === 'COMPLETED' && !serviceRequest.completedAt) {
      updateData.completedAt = new Date();
    }
    if (estimatedCost) updateData.estimatedCost = estimatedCost;
    if (actualCost) updateData.actualCost = actualCost;

    const updatedRequest = await prisma.$transaction(async (tx: any) => {
      // Update service request
      const updated = await tx.serviceRequest.update({
        where: { id },
        data: updateData,
        include: {
          customer: {
            select: { name: true, phone: true }
          }
        }
      });

      // Add update log if message provided
      if (message) {
        await tx.serviceUpdate.create({
          data: {
            serviceRequestId: id,
            message
          }
        });
      }

      return updated;
    });

    // Notify customer
    io.to(`user-${updatedRequest.customerId}`).emit('status-updated', {
      status,
      message,
      serviceRequestId: id
    });

    res.json({ serviceRequest: updatedRequest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating service status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/services/:id - Get single service request details
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        },
        workshop: {
          select: { name: true, address: true, phone: true }
        },
        mechanic: {
          include: {
            user: {
              select: { name: true, phone: true }
            }
          }
        },
        updates: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    // Check permission - for workshop admin, we need to verify separately
    let canView = false;
    
    if (req.user!.role === 'END_USER' && serviceRequest.customerId === req.user!.id) {
      canView = true;
    } else if (req.user!.role === 'MECHANIC' && serviceRequest.mechanic?.userId === req.user!.id) {
      canView = true;
    } else if (req.user!.role === 'WORKSHOP_ADMIN' && serviceRequest.workshopId) {
      // Check if this workshop belongs to the admin
      const workshop = await prisma.workshop.findFirst({
        where: { 
          id: serviceRequest.workshopId,
          adminId: req.user!.id 
        }
      });
      canView = !!workshop;
    }

    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ serviceRequest });
  } catch (error) {
    console.error('Error fetching service request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/services/estimate - Get service estimate
router.post('/estimate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const estimateSchema = z.object({
      workshopId: z.string(),
      vehicleType: z.string(),
      issueType: z.string(),
      description: z.string()
    });

    const { workshopId, vehicleType, issueType, description } = estimateSchema.parse(req.body);

    const basePrice = {
      'Engine Problem': 2000,
      'Flat Tire': 300,
      'Battery Issue': 800,
      'Brake Problem': 1500,
      'AC Issue': 1200,
      'Oil Change': 500,
      'General Service': 1000
    };

    const vehicleMultiplier = {
      'Car': 1.0,
      'Motorcycle': 0.6,
      'Truck': 1.5,
      'Bus': 2.0,
      'Auto Rickshaw': 0.8
    };

    const baseCost = basePrice[issueType as keyof typeof basePrice] || 1000;
    const multiplier = vehicleMultiplier[vehicleType as keyof typeof vehicleMultiplier] || 1.0;
    const estimatedCost = Math.round(baseCost * multiplier);

    const estimate = {
      workshopId,
      vehicleType,
      issueType,
      estimatedCost,
      estimatedTime: '1-2 hours',
      breakdown: {
        serviceCost: Math.round(estimatedCost * 0.7),
        partsCost: Math.round(estimatedCost * 0.3),
        taxes: Math.round(estimatedCost * 0.18)
      }
    };

    res.json({ estimate });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error calculating estimate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/services/:id/updates - Get service request updates
router.get('/:id/updates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        updates: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    const canView = 
      req.user!.role === 'END_USER' && serviceRequest.customerId === req.user!.id ||
      req.user!.role === 'MECHANIC' ||
      req.user!.role === 'WORKSHOP_ADMIN';

    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ updates: serviceRequest.updates });
  } catch (error) {
    console.error('Error fetching service updates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/services/:id/updates - Add service update (mechanic only)
router.post('/:id/updates', authenticateToken, requireRole(['MECHANIC']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateSchema = z.object({
      message: z.string().min(1, 'Message is required'),
      images: z.array(z.string()).default([])
    });

    const { message, images } = updateSchema.parse(req.body);

    const mechanic = await prisma.mechanic.findUnique({
      where: { userId: req.user!.id }
    });

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic profile not found' });
    }

    const serviceRequest = await prisma.serviceRequest.findFirst({
      where: { id, mechanicId: mechanic.id }
    });

    if (!serviceRequest) {
      return res.status(404).json({ error: 'Service request not found or not assigned to you' });
    }

    const update = await prisma.serviceUpdate.create({
      data: {
        serviceRequestId: id,
        message,
        images
      }
    });

    res.status(201).json({ update });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating service update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;