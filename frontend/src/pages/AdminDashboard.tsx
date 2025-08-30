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
  Plus,
  BarChart3,
  Eye
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { ServiceStatusBadge } from '@/components/ServiceStatusBadge';
import WorkshopCreationModal from '@/components/WorkshopCreationModal';
import AddMechanicModal from '@/components/AddMechanicModal';

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
  const [showWorkshopCreation, setShowWorkshopCreation] = useState(false);
  const [showAddMechanic, setShowAddMechanic] = useState(false);
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Fetch service requests - only if workshop exists
  const { data: serviceRequestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['serviceRequests', statusFilter],
    queryFn: async () => {
      const response = await axios.get('/services', {
        params: { status: statusFilter }
      });
      return response.data;
    },
    refetchInterval: 10000,
    enabled: false // Will be enabled after workshop check
  });

  // Fetch available mechanics - only if workshop exists
  const { data: mechanicsData, refetch: refetchMechanics } = useQuery({
    queryKey: ['mechanics'],
    queryFn: async () => {
      const response = await axios.get('/workshops/mechanics');
      return response.data;
    },
    enabled: false // Will be enabled after workshop check
  });

  // Fetch user's workshop
  const { data: workshopData, isLoading: workshopLoading, refetch: refetchWorkshop } = useQuery({
    queryKey: ['workshop', 'my-workshop'],
    queryFn: async () => {
      const response = await axios.get('/workshops/my-workshop');
      return response.data;
    },
    retry: false // Don't retry on 404
  });

  // Create workshop mutation
  const createWorkshopMutation = useMutation({
    mutationFn: async (workshopData: any) => {
      const response = await axios.post('/workshops', workshopData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Workshop created successfully!');
      queryClient.invalidateQueries({ queryKey: ['workshop'] });
      setShowWorkshopCreation(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create workshop');
    }
  });

  // Assign mechanic mutation
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
  const hasWorkshop = !!workshop;

  // Enable queries after workshop check
  React.useEffect(() => {
    if (hasWorkshop) {
      queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
      queryClient.invalidateQueries({ queryKey: ['mechanics'] });
    }
  }, [hasWorkshop, queryClient]);

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

  if (workshopLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
              {hasWorkshop && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddMechanic(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Mechanic
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {/* Navigate to workshop details */}}
                  >
                    <Building className="h-4 w-4 mr-2" />
                    My Workshop
                  </Button>
                </>
              )}

              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {hasWorkshop && serviceRequests.filter((r: ServiceRequest) => r.status === 'SUBMITTED').length > 0 && (
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
        {/* No Workshop State */}
        {!hasWorkshop && (
          <div className="max-w-2xl mx-auto">
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Building className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Welcome to RoadGuard!</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    To start managing service requests and mechanics, you need to create your workshop profile first.
                  </p>
                  <Button onClick={() => setShowWorkshopCreation(true)} size="lg">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your Workshop
                  </Button>
                  
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">What you can do after creating your workshop:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 text-left max-w-sm mx-auto">
                      <li>• Receive and manage service requests</li>
                      <li>• Add and manage mechanics</li>
                      <li>• Track your workshop performance</li>
                      <li>• Assign jobs to your team</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Has Workshop - Regular Dashboard */}
        {hasWorkshop && (
          <>
            {/* Workshop Info Card */}
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
                      onClick={() => {/* Navigate to workshop details */}}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {/* Navigate to analytics */}}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {/* Quick Workshop Stats */}
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{workshop.mechanics?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Mechanics</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {workshop.mechanics?.filter((m: any) => m.availability === 'AVAILABLE').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{workshop.rating?.toFixed(1) || '0.0'}</div>
                    <div className="text-sm text-muted-foreground">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{workshop.recentServicesCount || 0}</div>
                    <div className="text-sm text-muted-foreground">Recent Services</div>
                  </div>
                </div>
              </CardContent>
            </Card>

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

            {/* Service Requests Management */}
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
                            <ServiceStatusBadge status={request.status} />
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
          </>
        )}
      </div>

      {/* Workshop Creation Modal */}
      <WorkshopCreationModal
        isOpen={showWorkshopCreation}
        onClose={() => setShowWorkshopCreation(false)}
        onSuccess={() => {
          refetchWorkshop();
          setShowWorkshopCreation(false);
        }}
      />

      {/* Add Mechanic Modal */}
      {hasWorkshop && (
        <AddMechanicModal
          isOpen={showAddMechanic}
          onClose={() => setShowAddMechanic(false)}
          workshopId={workshop.id}
          onSuccess={() => {
            refetchMechanics();
            setShowAddMechanic(false);
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;