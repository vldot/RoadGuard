import express from 'express';
import { findNearbyMechanics, findNearbyAutoServices } from '../services/serpApi';

const router = express.Router();

// GET /api/mechanics/nearby - Find nearby mechanics
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, query, serviceTypes, maxResults } = req.query;

    // Validation
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required',
        example: '/api/mechanics/nearby?latitude=30.7333&longitude=76.7794'
      });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ 
        error: 'Invalid latitude or longitude values' 
      });
    }

    let mechanics;
    const maxRes = parseInt(maxResults as string) || 20;
    
    if (serviceTypes) {
      // Multiple service types search
      const types = (serviceTypes as string).split(',').map(t => t.trim());
      mechanics = await findNearbyAutoServices(lat, lng, types);
    } else {
      // Single query search
      const searchQuery = (query as string) || 'Mechanic';
      mechanics = await findNearbyMechanics(lat, lng, searchQuery, maxRes);
    }

    console.log(`Returning ${mechanics.length} mechanics for location: ${lat}, ${lng}`);

    res.json({ 
      success: true,
      mechanics,
      total: mechanics.length,
      userLocation: { latitude: lat, longitude: lng },
      searchParams: {
        query: query || 'Mechanic',
        serviceTypes: serviceTypes || null,
        maxResults: maxRes
      }
    });

  } catch (error) {
    console.error('Error in nearby mechanics route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch nearby mechanics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/mechanics/search - Advanced search with filters
router.get('/search', async (req, res) => {
  try {
    const { 
      latitude, 
      longitude, 
      query = 'Mechanic',
      minRating,
      maxDistance,
      priceRange,
      sortBy = 'distance'
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);

    let mechanics = await findNearbyMechanics(lat, lng, query as string);

    // Apply filters
    if (minRating) {
      const minRat = parseFloat(minRating as string);
      mechanics = mechanics.filter(m => (m.rating || 0) >= minRat);
    }

    if (maxDistance) {
      const maxDist = parseFloat(maxDistance as string);
      mechanics = mechanics.filter(m => (m.distance || 0) <= maxDist);
    }

    if (priceRange) {
      mechanics = mechanics.filter(m => m.price === priceRange);
    }

    // Apply sorting
    if (sortBy === 'rating') {
      mechanics.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'reviews') {
      mechanics.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
    }
    // Default sort by distance is already applied

    res.json({
      success: true,
      mechanics,
      total: mechanics.length,
      filters: { minRating, maxDistance, priceRange, sortBy }
    });

  } catch (error) {
    console.error('Error in mechanic search:', error);
    res.status(500).json({ 
      success: false,
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;