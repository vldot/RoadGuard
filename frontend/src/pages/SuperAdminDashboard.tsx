import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Building, 
  Wrench,
  BarChart3,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Settings,
  LogOut,
  UserPlus,
  ShieldCheck
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useAuth } from '../context/AuthContext';
import AddWorkshopForm from '../components/AddWorkshopForm';
import WorkshopDetailsModal from '../components/WorkshopDetailsModal';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  verified: boolean;
  createdAt: string;
  workshop?: {
    id: string;
    name: string;
    isOpen: boolean;
  };
  mechanic?: {
    id: string;
    availability: string;
    rating: number;
  };
}

interface Workshop {
  id: string;
  name: string;
  address: string;
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
    availability: string;
    user: {
      name: string;
    };
  }>;
  _count: {
    serviceRequests: number;
  };
}

interface Stats {
  overview: {
    totalUsers: number;
    totalWorkshops: number;
    totalServiceRequests: number;
    totalMechanics: number;
    recentUsers: number;
    recentServiceRequests: number;
  };
  usersByRole: Record<string, number>;
  serviceRequestsByStatus: Record<string, number>;
}

const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddWorkshop, setShowAddWorkshop] = useState(false);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Fetch platform statistics
  const { data: statsData } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await axios.get('/admin/stats');
      return response.data;
    },
    refetchInterval: 30000
  });

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', roleFilter, searchQuery],
    queryFn: async () => {
      const response = await axios.get('/admin/users', {
        params: { role: roleFilter, search: searchQuery }
      });
      return response.data;
    },
    enabled: activeTab === 'users'
  });

  // Fetch workshops
  const { data: workshopsData, isLoading: workshopsLoading } = useQuery({
    queryKey: ['admin', 'workshops', statusFilter, searchQuery],
    queryFn: async () => {
      const response = await axios.get('/admin/workshops', {
        params: { status: statusFilter, search: searchQuery }
      });
      return response.data;
    },
    enabled: activeTab === 'workshops'
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.delete(`/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  });

  // Delete workshop mutation
  const deleteWorkshopMutation = useMutation({
    mutationFn: async (workshopId: string) => {
      await axios.delete(`/admin/workshops/${workshopId}`);
    },
    onSuccess: () => {
      toast.success('Workshop deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete workshop');
    }
  });

  const stats: Stats = statsData?.stats || {
    overview: {
      totalUsers: 0,
      totalWorkshops: 0,
      totalServiceRequests: 0,
      totalMechanics: 0,
      recentUsers: 0,
      recentServiceRequests: 0
    },
    usersByRole: {},
    serviceRequestsByStatus: {}
  };

  const users: User[] = usersData?.users || [];
  const workshops: Workshop[] = workshopsData?.workshops || [];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge className="bg-purple-100 text-purple-800">Super Admin</Badge>;
      case 'WORKSHOP_ADMIN':
        return <Badge className="bg-blue-100 text-blue-800">Workshop Admin</Badge>;
      case 'MECHANIC':
        return <Badge className="bg-green-100 text-green-800">Mechanic</Badge>;
      case 'END_USER':
        return <Badge variant="outline">End User</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.overview.recentUsers} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workshops</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalWorkshops}</div>
            <p className="text-xs text-muted-foreground">Active workshops</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Requests</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalServiceRequests}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.overview.recentServiceRequests} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mechanics</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalMechanics}</div>
            <p className="text-xs text-muted-foreground">Active mechanics</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts/Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.usersByRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm">{role.replace('_', ' ')}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Requests by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.serviceRequestsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm">{status.replace('_', ' ')}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const UsersTab = () => (
    <div className="space-y-4">
      {/* Users Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Users Management</h2>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Users Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="END_USER">End Users</SelectItem>
            <SelectItem value="WORKSHOP_ADMIN">Workshop Admins</SelectItem>
            <SelectItem value="MECHANIC">Mechanics</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Created</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </td>
                      <td className="p-4">{getRoleBadge(user.role)}</td>
                      <td className="p-4">
                        <Badge variant={user.verified ? "default" : "secondary"}>
                          {user.verified ? "Verified" : "Unverified"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteUserMutation.mutate(user.id)}
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const WorkshopsTab = () => (
    <div className="space-y-4">
      {/* Workshops Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workshops Management</h2>
        <Button onClick={() => setShowAddWorkshop(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Workshop
        </Button>
      </div>

      {/* Workshops Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search workshops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Workshops Grid */}
      {workshopsLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workshops.map((workshop) => (
            <Card key={workshop.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{workshop.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Managed by {workshop.admin.name}
                    </CardDescription>
                  </div>
                  <Badge variant={workshop.isOpen ? "default" : "secondary"}>
                    {workshop.isOpen ? "Open" : "Closed"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{workshop.address}</p>
                  <div className="flex items-center justify-between">
                    <span>Rating:</span>
                    <span>{workshop.rating.toFixed(1)} ({workshop.reviewCount} reviews)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mechanics:</span>
                    <span>{workshop.mechanics.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Services:</span>
                    <span>{workshop._count.serviceRequests}</span>
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedWorkshopId(workshop.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteWorkshopMutation.mutate(workshop.id)}
                    disabled={deleteWorkshopMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-md bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Super Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Platform Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="workshops" className="flex items-center">
              <Building className="h-4 w-4 mr-2" />
              Workshops
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview">
              <OverviewTab />
            </TabsContent>

            <TabsContent value="users">
              <UsersTab />
            </TabsContent>

            <TabsContent value="workshops">
              <WorkshopsTab />
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Analytics</CardTitle>
                  <CardDescription>
                    Detailed analytics and reporting features coming soon
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                      <p>Advanced analytics dashboard</p>
                      <p className="text-sm">Charts, reports, and insights</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

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
    </div>
  );
};

export default SuperAdminDashboard;