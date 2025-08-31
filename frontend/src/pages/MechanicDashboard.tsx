import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  Clock,
  MapPin,
  Phone,
  User,
  Car,
  Wrench,
  MessageSquare,
  Camera,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Edit3,
  Send
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ServiceStatusBadge } from '@/components/ServiceStatusBadge';
import MechanicStats from '@/components/MechanicStats';
import { useAuth } from '../context/AuthContext';

type ServiceStatus = 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'REACHED' | 'COMPLETED' | 'CANCELLED';

interface ServiceRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  vehicleType: string;
  vehicleMake?: string;
  vehicleModel?: string;
  issueType: string;
  description: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  status: ServiceStatus;
  pickupAddress: string;
  latitude: number;
  longitude: number;
  images?: string[];
  createdAt: string;
  updatedAt: string;
  scheduledTime?: string;
  estimatedCost?: number;
  actualCost?: number;
  mechanicNotes?: string;
  customerRating?: number;
  assignedMechanicId?: string;
  workshopId?: string;
  mechanic?: {
    id: string;
    user?: {
      id: string;
      name: string;
      phone?: string;
    };
    userId?: string;
  };
}

interface Comment {
  id: string;
  serviceRequestId: string;
  userId: string;
  userName: string;
  userRole: 'CUSTOMER' | 'MECHANIC' | 'ADMIN';
  message: string;
  timestamp: string;
  isInternal: boolean;
}

const MechanicDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [newComment, setNewComment] = useState('');
  const [mechanicNotes, setMechanicNotes] = useState('');

  // Fetch assigned service requests
  const { data: serviceRequestsData, isLoading, refetch, error: requestsError } = useQuery({
    queryKey: ['mechanic-service-requests', user?.id],
    queryFn: async () => {
      console.log('Mechanic Dashboard - User Info:', {
        id: user?.id,
        role: user?.role,
        hasMechanicEntity: !!user?.mechanic,
        mechanicId: user?.mechanic?.id,
        workshopId: user?.workshop?.id
      });
      
      try {
        // Try the specific mechanic endpoint first
        const response = await axios.get(`/services/mechanic/${user?.id}`);
        console.log('Mechanic service requests response:', response.data);
        return response.data;
      } catch (error: any) {
        console.log('Primary endpoint failed:', error.response?.status, error.response?.data);
        
        // If insufficient permissions, try using mechanic ID instead of user ID
        if (error.response?.status === 403 && user?.mechanic?.id) {
          try {
            console.log('Trying with mechanic ID:', user.mechanic.id);
            const response = await axios.get(`/services/mechanic/${user.mechanic.id}`);
            console.log('Mechanic ID service requests response:', response.data);
            return response.data;
          } catch (mechanicIdError) {
            console.log('Mechanic ID endpoint also failed:', mechanicIdError);
          }
        }
        
        if (error.response?.status === 404 || error.response?.status === 403) {
          // Fallback to general services endpoint with different filters
          try {
            console.log('Trying fallback endpoint with assignedMechanicId:', user?.id);
            let response = await axios.get('/services', {
              params: { assignedMechanicId: user?.id }
            });
            console.log('Fallback service requests response:', response.data);
            return response.data;
          } catch (fallbackError) {
            // Try another pattern - sometimes mechanic assignments are by userId
            try {
              console.log('Trying second fallback with mechanic.userId:', user?.id);
              const response = await axios.get('/services', {
                params: { mechanicUserId: user?.id }
              });
              console.log('Second fallback response:', response.data);
              return response.data;
            } catch (secondFallbackError) {
              // Final attempt - get all services and filter client-side
              try {
                console.log('Trying final fallback - get all services and filter');
                const response = await axios.get('/services');
                const allServices = response.data?.serviceRequests || response.data || [];
                console.log('All services:', allServices.length, 'services loaded');
                
                // Filter for services assigned to this user (try multiple assignment patterns)
                const assignedServices = allServices.filter((service: ServiceRequest) => {
                  return service.assignedMechanicId === user?.id || 
                         service.mechanic?.user?.id === user?.id ||
                         service.mechanic?.userId === user?.id ||
                         service.mechanic?.id === user?.id;
                });
                
                console.log('Assigned services found:', assignedServices.length);
                return { serviceRequests: assignedServices };
              } catch (finalError) {
                console.error('All mechanic service endpoints failed:', error, fallbackError, secondFallbackError, finalError);
                throw error;
              }
            }
          }
        }
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 1
  });

  // Extract service requests from response (handle different response formats)
  const serviceRequests = serviceRequestsData?.serviceRequests || serviceRequestsData || [];

  // Fetch comments for selected request
  const { data: comments } = useQuery({
    queryKey: ['service-comments', selectedRequest?.id],
    queryFn: async () => {
      if (!selectedRequest?.id) return [];
      const response = await axios.get(`/services/${selectedRequest.id}/comments`);
      return response.data as Comment[];
    },
    enabled: !!selectedRequest?.id
  });

  // Update service status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ serviceId, status, notes }: { serviceId: string; status: ServiceStatus; notes?: string }) => {
      const response = await axios.put(`/services/${serviceId}/status`, {
        status,
        mechanicNotes: notes
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Service status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['mechanic-service-requests'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ serviceId, message, isInternal }: { serviceId: string; message: string; isInternal: boolean }) => {
      const response = await axios.post(`/services/${serviceId}/comments`, {
        message,
        isInternal
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Comment added successfully');
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['service-comments'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add comment');
    }
  });

  // Filter and search functionality
  const filteredRequests = serviceRequests?.filter((request: ServiceRequest) => {
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    const matchesSearch = searchTerm === '' || 
      request.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.issueType.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  }) || [];

  // Handle status update
  const handleStatusUpdate = (serviceId: string, newStatus: ServiceStatus) => {
    updateStatusMutation.mutate({ 
      serviceId, 
      status: newStatus, 
      notes: mechanicNotes 
    });
  };

  // Handle comment submission
  const handleAddComment = (isInternal: boolean = false) => {
    if (!newComment.trim() || !selectedRequest) return;
    
    addCommentMutation.mutate({
      serviceId: selectedRequest.id,
      message: newComment.trim(),
      isInternal
    });
  };

  // Get next possible statuses based on current status
  const getNextStatuses = (currentStatus: ServiceStatus): ServiceStatus[] => {
    switch (currentStatus) {
      case 'ASSIGNED':
        return ['IN_PROGRESS', 'CANCELLED'];
      case 'IN_PROGRESS':
        return ['REACHED', 'CANCELLED'];
      case 'REACHED':
        return ['COMPLETED', 'CANCELLED'];
      default:
        return [];
    }
  };

  // Get priority color
  const getPriorityColor = (urgency: string) => {
    switch (urgency) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading your assigned tasks...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (requestsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to Load Service Requests</h3>
          
          {(requestsError as any)?.response?.data?.error === 'Insufficient permissions' ? (
            <div className="space-y-3 mb-4">
              <p className="text-muted-foreground">
                You don't have permission to access mechanic service requests.
              </p>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                <h4 className="font-medium text-yellow-800 mb-2">Possible Issues:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Your account role: <strong>{user?.role || 'Unknown'}</strong></li>
                  <li>• Mechanic entity: <strong>{user?.mechanic?.id ? 'Linked' : 'Not Linked'}</strong></li>
                  <li>• Workshop association: <strong>{user?.workshop?.id ? 'Yes' : 'No'}</strong></li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                Contact your workshop admin to ensure you're properly set up as a mechanic.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground mb-4">
              {(requestsError as any)?.response?.data?.error || (requestsError as any)?.message || 'Failed to load your assigned service requests'}
            </p>
          )}
          
          <div className="space-y-2">
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <p className="text-xs text-muted-foreground">
              User ID: {user?.id} • API: /services/mechanic/{user?.id}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Mechanic Dashboard</h1>
              <p className="text-muted-foreground">Manage your assigned service requests</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Badge variant="secondary">
                {filteredRequests.length} Tasks
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Statistics */}
        {serviceRequests && serviceRequests.length > 0 && (
          <MechanicStats serviceRequests={serviceRequests} />
        )}

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer, vehicle, or issue type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="REACHED">Reached</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Service Requests List */}
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Service Requests</h3>
              <p className="text-muted-foreground mb-3">
                {serviceRequests?.length === 0 
                  ? "You don't have any assigned service requests yet."
                  : "No requests match your current filters."
                }
              </p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Total requests loaded: {serviceRequests?.length || 0}</p>
                  <p>Current filter: {selectedStatus}</p>
                  <p>User ID: {user?.id}</p>
                  <p>Role: {user?.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((request: ServiceRequest) => (
              <ServiceRequestCard
                key={request.id}
                request={request}
                onViewDetails={() => setSelectedRequest(request)}
                onStatusUpdate={handleStatusUpdate}
                getNextStatuses={getNextStatuses}
                getPriorityColor={getPriorityColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Service Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Service Request Details
              {selectedRequest && (
                <ServiceStatusBadge status={selectedRequest.status} />
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <ServiceRequestDetailsContent
              request={selectedRequest}
              comments={comments || []}
              newComment={newComment}
              setNewComment={setNewComment}
              mechanicNotes={mechanicNotes}
              setMechanicNotes={setMechanicNotes}
              onAddComment={handleAddComment}
              onStatusUpdate={handleStatusUpdate}
              getNextStatuses={getNextStatuses}
              getPriorityColor={getPriorityColor}
              isUpdating={updateStatusMutation.isPending || addCommentMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Service Request Card Component
interface ServiceRequestCardProps {
  request: ServiceRequest;
  onViewDetails: () => void;
  onStatusUpdate: (serviceId: string, status: ServiceStatus) => void;
  getNextStatuses: (status: ServiceStatus) => ServiceStatus[];
  getPriorityColor: (urgency: string) => string;
}

const ServiceRequestCard: React.FC<ServiceRequestCardProps> = ({
  request,
  onViewDetails,
  onStatusUpdate,
  getNextStatuses,
  getPriorityColor
}) => {
  const nextStatuses = getNextStatuses(request.status);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{request.customerName}</h3>
              <Badge className={getPriorityColor(request.urgency)}>
                {request.urgency}
              </Badge>
              <ServiceStatusBadge status={request.status} size="sm" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">
              {request.vehicleType} {request.vehicleMake && `- ${request.vehicleMake}`} {request.vehicleModel}
            </p>
            <p className="text-sm font-medium">{request.issueType}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{new Date(request.createdAt).toLocaleDateString()}</p>
            <p>{new Date(request.createdAt).toLocaleTimeString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="truncate max-w-48">{request.pickupAddress}</span>
          </div>
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-1" />
            <span>{request.customerPhone}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          
          <div className="flex gap-2">
            {nextStatuses.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={status === 'COMPLETED' ? 'default' : 'outline'}
                onClick={() => onStatusUpdate(request.id, status)}
              >
                {status === 'IN_PROGRESS' && <Wrench className="h-4 w-4 mr-1" />}
                {status === 'REACHED' && <MapPin className="h-4 w-4 mr-1" />}
                {status === 'COMPLETED' && <CheckCircle2 className="h-4 w-4 mr-1" />}
                {status === 'CANCELLED' && <AlertCircle className="h-4 w-4 mr-1" />}
                {status.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Service Request Details Component
interface ServiceRequestDetailsContentProps {
  request: ServiceRequest;
  comments: Comment[];
  newComment: string;
  setNewComment: (value: string) => void;
  mechanicNotes: string;
  setMechanicNotes: (value: string) => void;
  onAddComment: (isInternal: boolean) => void;
  onStatusUpdate: (serviceId: string, status: ServiceStatus) => void;
  getNextStatuses: (status: ServiceStatus) => ServiceStatus[];
  getPriorityColor: (urgency: string) => string;
  isUpdating: boolean;
}

const ServiceRequestDetailsContent: React.FC<ServiceRequestDetailsContentProps> = ({
  request,
  comments,
  newComment,
  setNewComment,
  mechanicNotes,
  setMechanicNotes,
  onAddComment,
  onStatusUpdate,
  getNextStatuses,
  getPriorityColor,
  isUpdating
}) => {
  const nextStatuses = getNextStatuses(request.status);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle Info</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="font-medium">{request.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="font-medium">{request.customerPhone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p className="font-medium">{request.pickupAddress}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Customer
                </Button>
              </CardContent>
            </Card>

            {/* Service Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wrench className="h-5 w-5 mr-2" />
                  Service Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Issue Type</label>
                  <p className="font-medium">{request.issueType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Priority</label>
                  <Badge className={getPriorityColor(request.urgency)}>
                    {request.urgency}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm">{request.description}</p>
                </div>
                {request.scheduledTime && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scheduled Time</label>
                    <p className="font-medium">{request.scheduledTime}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Update Section */}
          <Card>
            <CardHeader>
              <CardTitle>Update Service Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Mechanic Notes</label>
                <Textarea
                  placeholder="Add notes about the service progress..."
                  value={mechanicNotes}
                  onChange={(e) => setMechanicNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                {nextStatuses.map((status) => (
                  <Button
                    key={status}
                    variant={status === 'COMPLETED' ? 'default' : 'outline'}
                    onClick={() => onStatusUpdate(request.id, status)}
                    disabled={isUpdating}
                  >
                    {status === 'IN_PROGRESS' && <Wrench className="h-4 w-4 mr-1" />}
                    {status === 'REACHED' && <MapPin className="h-4 w-4 mr-1" />}
                    {status === 'COMPLETED' && <CheckCircle2 className="h-4 w-4 mr-1" />}
                    {status === 'CANCELLED' && <AlertCircle className="h-4 w-4 mr-1" />}
                    Mark as {status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Car className="h-5 w-5 mr-2" />
                Vehicle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="font-medium">{request.vehicleType}</p>
                </div>
                {request.vehicleMake && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Make</label>
                    <p className="font-medium">{request.vehicleMake}</p>
                  </div>
                )}
                {request.vehicleModel && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Model</label>
                    <p className="font-medium">{request.vehicleModel}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Issue Description</label>
                <p className="mt-1 p-3 bg-muted rounded-md">{request.description}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Service Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.images && request.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {request.images.map((image, index) => (
                    <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <img
                        src={image}
                        alt={`Service image ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => window.open(image, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No images uploaded for this service request.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Comments & Communication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comments List */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className={`p-3 rounded-lg ${
                      comment.isInternal ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
                    } border`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.userName}</span>
                          <Badge variant="outline" className="text-xs">
                            {comment.userRole}
                          </Badge>
                          {comment.isInternal && (
                            <Badge variant="secondary" className="text-xs">
                              Internal
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No comments yet.</p>
                )}
              </div>

              {/* Add Comment */}
              <div className="space-y-3 border-t pt-4">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => onAddComment(false)}
                    disabled={!newComment.trim() || isUpdating}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send to Customer
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onAddComment(true)}
                    disabled={!newComment.trim() || isUpdating}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Internal Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MechanicDashboard;
