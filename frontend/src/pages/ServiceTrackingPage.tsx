import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Phone,
  MessageSquare,
  Download,
  Receipt,
  CheckCircle,
  AlertCircle,
  Wrench
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ServiceStatusBadge } from '@/components/ServiceStatusBadge';

interface ServiceUpdate {
  id: string;
  message: string;
  images: string[];
  timestamp: string;
}

interface ServiceRequest {
  id: string;
  vehicleType: string;
  vehicleMake?: string;
  vehicleModel?: string;
  issueType: string;
  description: string;
  urgency: string;
  pickupAddress: string;
  status: string;
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  assignedAt?: string;
  startedAt?: string;
  reachedAt?: string;
  completedAt?: string;
  customer: {
    name: string;
    phone?: string;
  };
  mechanic?: {
    user: {
      name: string;
      phone?: string;
    };
  };
  workshop?: {
    name: string;
    address: string;
    phone: string;
  };
  updates: ServiceUpdate[];
}

const ServiceTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch service request details
  const { data: serviceData, isLoading } = useQuery({
    queryKey: ['serviceRequest', id],
    queryFn: async () => {
      const response = await axios.get(`/services/${id}`);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!serviceData?.serviceRequest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Service Request Not Found</h2>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const service: ServiceRequest = serviceData.serviceRequest;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'ASSIGNED':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'IN_PROGRESS':
        return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'REACHED':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-yellow-100 text-yellow-800';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-800';
      case 'REACHED': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'SUBMITTED', label: 'Request Submitted', completed: true },
      { key: 'ASSIGNED', label: 'Mechanic Assigned', completed: !!service.assignedAt },
      { key: 'REACHED', label: 'Mechanic Reached', completed: !!service.reachedAt },
      { key: 'IN_PROGRESS', label: 'Service in Progress', completed: !!service.startedAt },
      { key: 'COMPLETED', label: 'Service Completed', completed: !!service.completedAt }
    ];

    return steps;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mr-3">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Track Service</h1>
                <p className="text-sm text-muted-foreground">Service ID: {service.id.slice(-8)}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Receipt className="h-4 w-4 mr-2" />
                Invoice
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Progress */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <span>Service Status</span>
                  </CardTitle>
                  <ServiceStatusBadge 
                    status={service.status as any}
                    size="md"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getStatusSteps().map((step, index) => (
                    <div key={step.key} className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        step.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className={`text-sm ${
                        step.completed ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Vehicle Information</h4>
                    <p className="text-sm text-muted-foreground">
                      {service.vehicleType} {service.vehicleMake} {service.vehicleModel}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Issue Type</h4>
                    <p className="text-sm text-muted-foreground">{service.issueType}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Urgency Level</h4>
                    <Badge variant={service.urgency === 'HIGH' ? 'destructive' : 'outline'}>
                      {service.urgency}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Service Time</h4>
                    <p className="text-sm text-muted-foreground">
                      {service.startedAt ? formatDate(service.startedAt) : 'Not started yet'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Pickup Location
                  </h4>
                  <p className="text-sm text-muted-foreground">{service.pickupAddress}</p>
                </div>
              </CardContent>
            </Card>

            {/* Service Updates */}
            {service.updates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Service Updates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {service.updates.map((update, index) => (
                      <div key={update.id} className="flex space-x-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm">{update.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(update.timestamp)}
                          </p>
                          {update.images.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                              {update.images.map((image, imgIndex) => (
                                <img
                                  key={imgIndex}
                                  src={image}
                                  alt={`Update ${imgIndex + 1}`}
                                  className="w-full h-20 object-cover rounded border"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            {service.mechanic && (
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Mechanic</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm font-medium">{service.mechanic.user.name}</span>
                    </div>
                    {service.mechanic.user.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{service.mechanic.user.phone}</span>
                      </div>
                    )}
                    <Button className="w-full" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Mechanic
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Workshop Information */}
            {service.workshop && (
              <Card>
                <CardHeader>
                  <CardTitle>Workshop</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-medium">{service.workshop.name}</h4>
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{service.workshop.address}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{service.workshop.phone}</span>
                    </div>
                    <Button variant="outline" className="w-full" size="sm">
                      <MapPin className="h-4 w-4 mr-2" />
                      Track Live Location
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Information */}
            {(service.estimatedCost || service.actualCost) && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {service.estimatedCost && (
                      <div className="flex justify-between">
                        <span className="text-sm">Estimated Cost:</span>
                        <span className="text-sm font-medium">₹{service.estimatedCost}</span>
                      </div>
                    )}
                    {service.actualCost && (
                      <div className="flex justify-between">
                        <span className="text-sm">Actual Cost:</span>
                        <span className="text-sm font-medium">₹{service.actualCost}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>₹{service.actualCost || service.estimatedCost || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  More Info
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceTrackingPage;