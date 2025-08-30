import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft,
  Building,
  MapPin,
  Phone,
  Star,
  Users,
  Wrench,
  Calendar,
  TrendingUp,
  Edit,
  Settings,
  Plus,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '../context/AuthContext';

interface Workshop {
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
  updatedAt: string;
  admin: {
    name: string;
    email: string;
    phone?: string;
  };
  mechanics: Array<{
    id: string;
    specialties: string[];
    experience: number;
    availability: 'AVAILABLE' | 'IN_SERVICE' | 'NOT_AVAILABLE';
    rating: number;
    reviewCount: number;
    user: {
      name: string;
      phone?: string;
      email: string;
    };
  }>;
  _count: {
    serviceRequests: number;
  };
  recentServicesCount: number;
}

interface WorkshopStats {
  totalRequests: number;
  completedRequests: number;
  activeRequests: number;
  totalRevenue: number;
  averageRating: number;
  mechanicsAvailable: number;
}

const MyWorkshopPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingWorkshop, setEditingWorkshop] = useState(false);
  const [workshopFormData, setWorkshopFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    isOpen: true
  });

  // Fetch workshop details
  const { data: workshopData, isLoading, refetch } = useQuery({
    queryKey: ['workshop', 'my-workshop'],
    queryFn: async () => {
      const response = await axios.get('/workshops/my-workshop');
      return response.data;
    }
  });

  // Fetch workshop analytics/stats
  const { data: statsData } = useQuery({
    queryKey: ['workshop', 'stats'],
    queryFn: async () => {
      // Mock stats - replace with actual API call
      return {
        totalRequests: 45,
        completedRequests: 38,
        activeRequests: 7,
        totalRevenue: 125000,
        averageRating: 4.6,
        mechanicsAvailable: 3
      };
    },
    enabled: !!workshopData?.workshop
  });

  // Update workshop mutation
  const updateWorkshopMutation = useMutation({
    mutationFn: async (data: typeof workshopFormData) => {
      const response = await axios.put(`/workshops/${workshop.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Workshop updated successfully');
      queryClient.invalidateQueries({ queryKey: ['workshop'] });
      setEditingWorkshop(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update workshop');
    }
  });

  const workshop: Workshop = workshopData?.workshop;
  const stats: WorkshopStats = statsData || {
    totalRequests: 0,
    completedRequests: 0,
    activeRequests: 0,
    totalRevenue: 0,
    averageRating: 0,
    mechanicsAvailable: 0
  };

  const handleEditWorkshop = () => {
    if (workshop) {
      setWorkshopFormData({
        name: workshop.name,
        description: workshop.description || '',
        address: workshop.address,
        phone: workshop.phone,
        isOpen: workshop.isOpen
      });
      setEditingWorkshop(true);
    }
  };

  const handleSaveWorkshop = () => {
    updateWorkshopMutation.mutate(workshopFormData);
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')} 
                className="mr-3"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold">My Workshop</h1>
            </div>
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Workshop Found</h2>
              <p className="text-muted-foreground mb-6 text-center">
                You don't have a workshop associated with your account yet.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workshop
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')} 
                className="mr-3"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  {workshop.name}
                </h1>
                <p className="text-sm text-muted-foreground">Workshop Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleEditWorkshop}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.totalRequests}</div>
                  <div className="text-sm text-muted-foreground">Total Requests</div>
                </div>
                <Wrench className="h-8 w-8 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.completedRequests}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">{stats.activeRequests}</div>
                  <div className="text-sm text-muted-foreground">Active Jobs</div>
                </div>
                <Clock className="h-8 w-8 text-orange-600 opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">₹{stats.totalRevenue.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Revenue</div>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600 opacity-60" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mechanics">Mechanics</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Workshop Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Workshop Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {renderStars(workshop.rating)}
                      <span className="text-sm font-medium">
                        {workshop.rating.toFixed(1)} ({workshop.reviewCount} reviews)
                      </span>
                    </div>
                    <Badge variant={workshop.isOpen ? "default" : "secondary"}>
                      {workshop.isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>

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
                    Admin Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium">{workshop.admin.name}</h4>
                    <p className="text-sm text-muted-foreground">{workshop.admin.email}</p>
                    {workshop.admin.phone && (
                      <p className="text-sm text-muted-foreground">{workshop.admin.phone}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center pt-4 border-t">
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

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Service request completed</span>
                    </div>
                    <span className="text-xs text-muted-foreground">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">New mechanic assigned to job</span>
                    </div>
                    <span className="text-xs text-muted-foreground">5 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">New service request received</span>
                    </div>
                    <span className="text-xs text-muted-foreground">1 day ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mechanics" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Workshop Mechanics</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Mechanic
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workshop.mechanics.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No mechanics assigned to your workshop</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Mechanic
                  </Button>
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
                              {mechanic.rating.toFixed(1)} ({mechanic.reviewCount})
                            </span>
                          </div>
                        </div>
                        {getAvailabilityBadge(mechanic.availability)}
                      </div>

                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{mechanic.experience} years experience</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{mechanic.user.phone || 'No phone'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium mb-2 text-sm">Specialties:</h5>
                        <div className="flex flex-wrap gap-1">
                          {mechanic.specialties.map((specialty) => (
                            <Badge key={specialty} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex space-x-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completion Rate</span>
                      <span className="font-medium">{((stats.completedRequests / stats.totalRequests) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(stats.completedRequests / stats.totalRequests) * 100}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Rating</span>
                      <div className="flex items-center space-x-2">
                        {renderStars(workshop.rating)}
                        <span className="font-medium">{workshop.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Mechanics</span>
                      <span className="font-medium">
                        {workshop.mechanics.filter(m => m.availability === 'AVAILABLE').length}/{workshop.mechanics.length}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Monthly Revenue</span>
                      <span className="font-medium">₹{stats.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Chart Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted rounded flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>Revenue chart will be displayed here</p>
                      <p className="text-sm">Integration with chart library needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">12</div>
                    <div className="text-sm text-muted-foreground">Engine Repairs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">8</div>
                    <div className="text-sm text-muted-foreground">Oil Changes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">6</div>
                    <div className="text-sm text-muted-foreground">Brake Services</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workshop Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="workshop-status">Workshop Status</Label>
                    <div className="flex items-center space-x-3 mt-2">
                      <input
                        type="checkbox"
                        id="workshop-status"
                        checked={workshop.isOpen}
                        onChange={() => {}}
                        className="rounded"
                      />
                      <label htmlFor="workshop-status" className="text-sm">
                        Workshop is currently open
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="auto-assign">Auto-assign Jobs</Label>
                    <div className="flex items-center space-x-3 mt-2">
                      <input
                        type="checkbox"
                        id="auto-assign"
                        className="rounded"
                      />
                      <label htmlFor="auto-assign" className="text-sm">
                        Automatically assign jobs to available mechanics
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="working-hours">Working Hours</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Input type="time" defaultValue="09:00" />
                    <Input type="time" defaultValue="18:00" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="service-radius">Service Radius (km)</Label>
                  <Input 
                    type="number" 
                    defaultValue="15" 
                    className="mt-2"
                    placeholder="Enter service radius"
                  />
                </div>

                <div>
                  <Label htmlFor="notification-preferences">Notification Preferences</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" id="email-notifications" defaultChecked className="rounded" />
                      <label htmlFor="email-notifications" className="text-sm">Email notifications</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" id="sms-notifications" className="rounded" />
                      <label htmlFor="sms-notifications" className="text-sm">SMS notifications</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" id="push-notifications" defaultChecked className="rounded" />
                      <label htmlFor="push-notifications" className="text-sm">Push notifications</label>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 pt-4 border-t">
                  <Button>
                    Save Changes
                  </Button>
                  <Button variant="outline">
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Workshop Modal */}
      <Dialog open={editingWorkshop} onOpenChange={setEditingWorkshop}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workshop Details</DialogTitle>
            <DialogDescription>
              Update your workshop information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Workshop Name</Label>
              <Input
                id="edit-name"
                value={workshopFormData.name}
                onChange={(e) => setWorkshopFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={workshopFormData.description}
                onChange={(e) => setWorkshopFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={workshopFormData.address}
                onChange={(e) => setWorkshopFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={workshopFormData.phone}
                onChange={(e) => setWorkshopFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="edit-is-open"
                checked={workshopFormData.isOpen}
                onChange={(e) => setWorkshopFormData(prev => ({ ...prev, isOpen: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="edit-is-open" className="text-sm">Workshop is open</label>
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button 
              onClick={handleSaveWorkshop}
              disabled={updateWorkshopMutation.isPending}
            >
              {updateWorkshopMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setEditingWorkshop(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyWorkshopPage;