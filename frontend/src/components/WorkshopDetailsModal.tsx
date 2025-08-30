import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  MapPin, 
  Phone, 
  Building,
  User,
  Star,
  Clock,
  Wrench,
  Users,
  Calendar,
  Mail,
  X,
  FileText
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Utility function to calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

interface UserLocation {
  lat: number;
  lng: number;
}

interface WorkshopDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workshopId: string;
}

interface WorkshopDetails {
  id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  isOpen: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  admin: {
    name: string;
    email: string;
    phone?: string;
  };
  mechanics: Array<{
    id: string;
    specialties: string[];
    experience: number;
    availability: string;
    rating: number;
    user: {
      name: string;
    };
  }>;
  recentServicesCount: number;
}

const WorkshopDetailsModal: React.FC<WorkshopDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  workshopId 
}) => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  
  // Get user's location for directions
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.log('Location error:', error)
      );
    }
  }, []);
  
  // Fetch workshop details
  const { data: workshopData, isLoading } = useQuery({
    queryKey: ['workshop', workshopId],
    queryFn: async () => {
      const response = await axios.get(`/workshops/${workshopId}`);
      return response.data;
    },
    enabled: isOpen && !!workshopId
  });

  // Fetch workshop services
  const { data: servicesData } = useQuery({
    queryKey: ['workshop', workshopId, 'services'],
    queryFn: async () => {
      const response = await axios.get(`/workshops/${workshopId}/services`);
      return response.data;
    },
    enabled: isOpen && !!workshopId
  });

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const workshop: WorkshopDetails = workshopData?.workshop;
  const services = servicesData?.services || [];

  if (!workshop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">
            <p>Workshop not found</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`} 
      />
    ));
  };

  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case 'AVAILABLE':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'IN_SERVICE':
        return <Badge className="bg-orange-100 text-orange-800">In Service</Badge>;
      case 'NOT_AVAILABLE':
        return <Badge className="bg-red-100 text-red-800">Not Available</Badge>;
      default:
        return <Badge variant="outline">{availability}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="flex items-center text-xl">
              <Building className="h-6 w-6 mr-2" />
              {workshop.name}
            </DialogTitle>
            
            <Button
              onClick={() => {
                navigate('/new-service', { state: { workshop } });
                onClose();
              }}
              className="bg-primary hover:bg-primary/90"
            >
              <FileText className="h-4 w-4 mr-2" />
              Book Service
            </Button>
          </div>
          
          <DialogDescription className="flex items-center space-x-4">
            <div className="flex items-center">
              {renderStars(workshop.rating)}
              <span className="ml-2 text-sm">
                {workshop.rating.toFixed(1)} ({workshop.reviewCount} reviews)
              </span>
            </div>
            <Badge variant={workshop.isOpen ? "default" : "secondary"}>
              {workshop.isOpen ? "Open" : "Closed"}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mechanics">Mechanics</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Workshop Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workshop.description && (
                    <div>
                      <h4 className="font-medium mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground">{workshop.description}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{workshop.phone}</span>
                  </div>

                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{workshop.address}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Established {formatDate(workshop.createdAt)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{workshop.recentServicesCount} services in last 30 days</span>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Workshop Admin
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">{workshop.admin.name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{workshop.admin.email}</span>
                    </div>
                    {workshop.admin.phone && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                        <Phone className="h-4 w-4" />
                        <span>{workshop.admin.phone}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{workshop.mechanics.length}</div>
                      <div className="text-xs text-muted-foreground">Total Mechanics</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {workshop.mechanics.filter(m => m.availability === 'AVAILABLE').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Available Now</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mechanics" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workshop.mechanics.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>No mechanics assigned to this workshop</p>
                </div>
              ) : (
                workshop.mechanics.map((mechanic) => (
                  <Card key={mechanic.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{mechanic.user.name}</h4>
                          <div className="flex items-center mt-1">
                            {renderStars(mechanic.rating)}
                            <span className="ml-2 text-sm text-muted-foreground">
                              {mechanic.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        {getAvailabilityBadge(mechanic.availability)}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{mechanic.experience} years experience</span>
                        </div>
                        
                        <div>
                          <h5 className="font-medium mb-1">Specialties:</h5>
                          <div className="flex flex-wrap gap-1">
                            {mechanic.specialties.map((specialty) => (
                              <Badge key={specialty} variant="outline" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4" />
                  <p>No services information available</p>
                </div>
              ) : (
                services.map((service: any) => (
                  <Card key={service.id}>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">{service.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span>{service.estimatedTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price Range:</span>
                          <span className="font-medium">{service.priceRange}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="location" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Workshop Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Address</h4>
                    <p className="text-sm text-muted-foreground">{workshop.address}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-1">Coordinates</h4>
                      <p className="text-sm text-muted-foreground">
                        Lat: {workshop.latitude.toFixed(6)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Lng: {workshop.longitude.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Contact</h4>
                      <p className="text-sm text-muted-foreground">{workshop.phone}</p>
                    </div>
                  </div>

                  <div className="h-64 bg-gradient-to-br from-blue-100 to-green-100 rounded border flex items-center justify-center relative">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-red-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <p className="font-medium text-gray-700">{workshop.name}</p>
                      <p className="text-sm text-gray-600">{workshop.address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {workshop.latitude.toFixed(4)}, {workshop.longitude.toFixed(4)}
                      </p>
                      {userLocation && (
                        <p className="text-xs text-blue-600 mt-1">
                          {calculateDistance(
                            userLocation.lat, 
                            userLocation.lng, 
                            workshop.latitude, 
                            workshop.longitude
                          ).toFixed(1)} km away
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" className="flex-1">
                      Get Directions
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Share Location
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default WorkshopDetailsModal;