import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Bell, 
  Settings, 
  LogOut, 
  Filter,
  MapPin,
  Clock,
  User,
  Phone,
  Car,
  Wrench,
  CheckCircle,
  AlertCircle,
  XCircle,
  Building,
  Plus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import AddWorkshopForm from '@/components/AddWorkshopForm';
import WorkshopDetailsModal from '@/components/WorkshopDetailsModal';
import { ServiceStatusBadge } from '@/components/ServiceStatusBadge';

interface ServiceRequest {
  id: string;
  vehicleType: string;
  vehicleMake?: string;
  vehicleModel?: string;
  issueType: string;
  description: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  pickupAddress: string;
  status: 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'REACHED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  mechanic?: {
    id: string;
    user: {
      name: string;
      phone?: string;
    };
  };
}

interface Mechanic {
  id: string;
  availability: 'AVAILABLE' | 'IN_SERVICE' | 'NOT_AVAILABLE';
  user: {
    name: string;
    phone?: string;
  };
}

const AdminDashboard: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [showAddWorkshop, setShowAddWorkshop] = useState(false);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Fetch service requests
  const { data: serviceRequestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['serviceRequests', statusFilter],
    queryFn: async () => {
      const response = await axios.get('/services', {
        params: { status: statusFilter }
      });
      return response.data;
    },
    refetchInterval: 10000
  });

  // Fetch available mechanics
  const { data: mechanicsData } = useQuery({
    queryKey: ['mechanics'],
    queryFn: async () => {
      const response = await axios.get('/workshops/mechanics');
      return response.data;
    }
  });

  // Fetch user's workshop
  const { data: workshopData } = useQuery({
    queryKey: ['workshop', 'my-workshop'],
    queryFn: async () => {
      const response = await axios.get('/workshops/my-workshop');
      return response.data;
    }
  });
  const assignMechanicMutation = useMutation({
    mutationFn: async ({ requestId, mechanicId }: { requestId: string; mechanicId: string }) => {
      const response = await axios.put(`/services/${requestId}/assign`, { mechanicId });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Mechanic assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to assign mechanic');
    }
  });

  const serviceRequests = serviceRequestsData?.serviceRequests || [];
  const mechanics = mechanicsData?.mechanics || [];
  const workshop = workshopData?.workshop;

  const getStatusBadge = (status: string) => {
    return <ServiceStatusBadge status={status as any} size="sm" />;
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': 
        return <Badge variant="destructive">High</Badge>;
      case 'MEDIUM': 
        return <Badge variant="outline">Medium</Badge>;
      case 'LOW': 
        return <Badge variant="secondary">Low</Badge>;
      default: 
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">RoadGuard Admin</h1>
                <p className="text-sm text-muted-foreground">Workshop Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {serviceRequests.filter((r: ServiceRequest) => r.status === 'SUBMITTED').length > 0 && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
                )}
              </Button>
              
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" onClick={logout} size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Show Add Workshop button if no workshop exists */}
        {!workshop && (
          <Card className="mb-6 border-dashed">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Workshop Found</h3>
                <p className="text-muted-foreground mb-4">Create your workshop to start managing service requests</p>
                <Button onClick={() => setShowAddWorkshop(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workshop
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workshop Info Card */}
        {workshop && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    {workshop.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {workshop.address} • {workshop.phone}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={workshop.isOpen ? "default" : "secondary"}>
                    {workshop.isOpen ? "Open" : "Closed"}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedWorkshopId(workshop.id)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Requests</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {serviceRequests.filter((r: ServiceRequest) => r.status === 'SUBMITTED').length}
              </div>
              <p className="text-xs text-muted-foreground">Pending assignment</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {serviceRequests.filter((r: ServiceRequest) => 
                  ['ASSIGNED', 'IN_PROGRESS', 'REACHED'].includes(r.status)
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {serviceRequests.filter((r: ServiceRequest) => r.status === 'COMPLETED').length}
              </div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Staff</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mechanics.filter((m: Mechanic) => m.availability === 'AVAILABLE').length}
              </div>
              <p className="text-xs text-muted-foreground">Ready for assignment</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Service Requests</CardTitle>
                <CardDescription>Manage and assign service requests to mechanics</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Requests</SelectItem>
                    <SelectItem value="SUBMITTED">New</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Service Requests List */}
        <div className="space-y-4">
          {requestsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : serviceRequests.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <XCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No service requests found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            serviceRequests.map((request: ServiceRequest) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-3">
                        {getStatusBadge(request.status)}
                        {getUrgencyBadge(request.urgency)}
                        <span className="text-sm text-muted-foreground">
                          {formatDate(request.createdAt)}
                        </span>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{request.vehicleType} - {request.issueType}</span>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">{request.description}</p>
                          <div className="flex items-center space-x-2 pl-6">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{request.pickupAddress}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{request.customer.name}</span>
                          </div>
                          {request.customer.phone && (
                            <div className="flex items-center space-x-2 pl-6">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{request.customer.phone}</span>
                            </div>
                          )}
                          {request.mechanic && (
                            <div className="flex items-center space-x-2 pl-6">
                              <Wrench className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">Assigned: {request.mechanic.user.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {request.status === 'SUBMITTED' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button onClick={() => setSelectedRequest(request)}>
                            Assign Mechanic
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign Mechanic</DialogTitle>
                            <DialogDescription>
                              Select an available mechanic for this service request
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-md">
                              <h4 className="font-medium text-sm mb-1">Request Details</h4>
                              <p className="text-sm">{request.issueType} - {request.vehicleType}</p>
                              <p className="text-xs text-muted-foreground">{request.pickupAddress}</p>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-sm mb-2">Available Mechanics</h4>
                              <div className="space-y-2">
                                {mechanics.filter((m: Mechanic) => m.availability === 'AVAILABLE').map((mechanic: Mechanic) => (
                                  <Button
                                    key={mechanic.id}
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => assignMechanicMutation.mutate({ 
                                      requestId: request.id, 
                                      mechanicId: mechanic.id 
                                    })}
                                    disabled={assignMechanicMutation.isPending}
                                  >
                                    <User className="h-4 w-4 mr-2" />
                                    {mechanic.user.name}
                                    {mechanic.user.phone && (
                                      <span className="ml-auto text-xs text-muted-foreground">
                                        {mechanic.user.phone}
                                      </span>
                                    )}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <AddWorkshopForm
        isOpen={showAddWorkshop}
        onClose={() => setShowAddWorkshop(false)}
        userRole={user?.role || ''}
      />

      {selectedWorkshopId && (
        <WorkshopDetailsModal
          isOpen={!!selectedWorkshopId}
          onClose={() => setSelectedWorkshopId(null)}
          workshopId={selectedWorkshopId}
        />
      )}
    </div>
  );
};

export default AdminDashboard;