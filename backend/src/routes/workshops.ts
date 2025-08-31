// workshops.ts - Updated workshop routes
import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/workshops/mechanics - Get mechanics for workshop admin
router.get('/mechanics', authenticateToken, requireRole(['WORKSHOP_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const workshop = await prisma.workshop.findUnique({
      where: { adminId: req.user!.id },
      include: {
        mechanics: {
          include: {
            user: {
              select: { name: true, phone: true }
            }
          }
        }
      }
    });

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    res.json({ mechanics: workshop.mechanics });
  } catch (error) {
    console.error('Error fetching mechanics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workshops/nearby - Get nearby workshops for end users
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    const workshops = await prisma.workshop.findMany({
      where: { isOpen: true },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        latitude: true,
        longitude: true,
        phone: true,
        rating: true,
        reviewCount: true,
        isOpen: true
      },
      take: 50
    });

    // Calculate distance if user location provided
    const workshopsWithDistance = workshops.map(workshop => {
      let distance = null;
      if (latitude && longitude) {
        const lat1 = parseFloat(latitude as string);
        const lon1 = parseFloat(longitude as string);
        const lat2 = workshop.latitude;
        const lon2 = workshop.longitude;
        
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance = Math.round(R * c * 10) / 10; // Round to 1 decimal place
      }

      return {
        ...workshop,
        distance: distance ? `${distance}km away` : null
      };
    });

    // Filter by radius if specified and location provided
    const filteredWorkshops = workshopsWithDistance.filter(workshop => {
      if (!latitude || !longitude || !workshop.distance) return true;
      const dist = parseFloat(workshop.distance.replace('km away', ''));
      return dist <= parseFloat(radius as string);
    });

    // Sort by distance if location provided, otherwise by rating
    const sortedWorkshops = filteredWorkshops.sort((a, b) => {
      if (a.distance && b.distance) {
        const distA = parseFloat(a.distance.replace('km away', ''));
        const distB = parseFloat(b.distance.replace('km away', ''));
        return distA - distB;
      }
      return b.rating - a.rating;
    });

    res.json({ workshops: sortedWorkshops });
  } catch (error) {
    console.error('Error fetching workshops:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workshops/my-workshop - Get current user's workshop (MUST be before /:id route)
router.get('/my-workshop', authenticateToken, requireRole(['WORKSHOP_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const workshop = await prisma.workshop.findUnique({
      where: { adminId: req.user!.id },
      include: {
        admin: {
          select: { name: true, email: true, phone: true }
        },
        mechanics: {
          include: {
            user: {
              select: { name: true, phone: true }
            }
          }
        },
        _count: {
          select: {
            serviceRequests: true
          }
        }
      }
    });

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    // Get recent service requests count
    const recentServices = await prisma.serviceRequest.count({
      where: {
        workshopId: workshop.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Include service requests in the response
    const serviceRequests = await prisma.serviceRequest.findMany({
      where: { workshopId: workshop.id },
      select: {
        id: true,
        customerId: true,
        issueType: true, // Corrected field
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ 
      workshop: {
        ...workshop,
        recentServicesCount: recentServices,
        serviceRequests
      }
    });
  } catch (error) {
    console.error('Error fetching user workshop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workshops/:id - Get workshop details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const workshop = await prisma.workshop.findUnique({
      where: { id },
      include: {
        admin: {
          select: { name: true, email: true, phone: true }
        },
        mechanics: {
          where: { availability: 'AVAILABLE' },
          select: {
            id: true,
            specialties: true,
            experience: true,
            rating: true,
            user: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    // Get recent service requests count for this workshop
    const recentServices = await prisma.serviceRequest.count({
      where: {
        workshopId: id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    res.json({ 
      workshop: {
        ...workshop,
        recentServicesCount: recentServices
      }
    });
  } catch (error) {
    console.error('Error fetching workshop details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workshops/:id/services - Get workshop service offerings
router.get('/:id/services', async (req, res) => {
  try {
    const { id } = req.params;

    const workshop = await prisma.workshop.findUnique({
      where: { id },
      include: {
        mechanics: {
          select: {
            specialties: true
          }
        }
      }
    });

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    // Extract unique services from mechanics' specialties
    const allSpecialties = workshop.mechanics.flatMap(mechanic => mechanic.specialties);
    const uniqueServices = [...new Set(allSpecialties)];

    // Mock service details - in real app, you'd have a services table
    const serviceDetails = uniqueServices.map(service => ({
      id: service.toLowerCase().replace(/\s+/g, '-'),
      name: service,
      description: `Professional ${service.toLowerCase()} service`,
      estimatedTime: '30-60 minutes',
      priceRange: '₹500-2000'
    }));

    res.json({ services: serviceDetails });
  } catch (error) {
    console.error('Error fetching workshop services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validation schemas
const createWorkshopSchema = z.object({
  name: z.string().min(1, 'Workshop name is required'),
  description: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  latitude: z.number(),
  longitude: z.number(),
  phone: z.string().min(1, 'Phone is required')
});

// POST /api/workshops - Create workshop (Workshop Admin can create their own)
router.post('/', authenticateToken, requireRole(['WORKSHOP_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const validatedData = createWorkshopSchema.parse(req.body);

    // Check if user already has a workshop
    const existingWorkshop = await prisma.workshop.findUnique({
      where: { adminId: req.user!.id }
    });

    if (existingWorkshop) {
      return res.status(400).json({ error: 'You already manage a workshop' });
    }

    const workshop = await prisma.workshop.create({
      data: {
        ...validatedData,
        adminId: req.user!.id
      },
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

// PUT /api/workshops/:id - Update workshop (Workshop Admin can update their own)
router.put('/:id', authenticateToken, requireRole(['WORKSHOP_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check if user owns this workshop
    const existingWorkshop = await prisma.workshop.findFirst({
      where: { 
        id,
        adminId: req.user!.id 
      }
    });

    if (!existingWorkshop) {
      return res.status(404).json({ error: 'Workshop not found or you do not have permission to update it' });
    }

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


// DELETE /api/workshops/:id - Delete workshop (Workshop Admin can delete their own)
router.delete('/:id', authenticateToken, requireRole(['WORKSHOP_ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check if user owns this workshop
    const existingWorkshop = await prisma.workshop.findFirst({
      where: { 
        id,
        adminId: req.user!.id 
      }
    });

    if (!existingWorkshop) {
      return res.status(404).json({ error: 'Workshop not found or you do not have permission to delete it' });
    }

    await prisma.workshop.delete({
      where: { id }
    });

    res.json({ message: 'Workshop deleted successfully' });
  } catch (error) {
    console.error('Error deleting workshop:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// services.ts - Additional service endpoints
// Add these to your existing services.ts file

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

    // Mock estimate calculation - replace with actual logic
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

    // Check permission
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

    // Verify mechanic owns this service request
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