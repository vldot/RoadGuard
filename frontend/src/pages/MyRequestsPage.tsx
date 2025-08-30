import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft,
  Clock,
  MapPin,
  User,
  Phone,
  Car,
  Eye,
  MessageCircle,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceStatusBadge } from '@/components/ServiceStatusBadge';
import { useAuth } from '../context/AuthContext';

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
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
  workshop?: {
    name: string;
    phone: string;
    address: string;
  };
  mechanic?: {
    user: {
      name: string;
      phone?: string;
    };
  };
  updates: Array<{
    id: string;
    message: string;
    timestamp: string;
  }>;
}

const MyRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Fetch user's service requests
  const { data: requestsData, isLoading, refetch } = useQuery({
    queryKey: ['serviceRequests', 'my-requests', statusFilter],
    queryFn: async () => {
      const response = await axios.get('/services/my-requests');
      return response.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const serviceRequests: ServiceRequest[] = requestsData?.serviceRequests || [];

  // Filter requests based on status
  const filteredRequests = statusFilter === 'ALL' 
    ? serviceRequests 
    : serviceRequests.filter(request => request.status === statusFilter);

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': 
        return <Badge variant="destructive">High Priority</Badge>;
      case 'MEDIUM': 
        return <Badge variant="outline">Medium</Badge>;
      case 'LOW': 
        return <Badge variant="secondary">Low</Badge>;
      default: 
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusCounts = () => {
    return {
      all: serviceRequests.length,
      active: serviceRequests.filter(r => ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'REACHED'].includes(r.status)).length,
      completed: serviceRequests.filter(r => r.status === 'COMPLETED').length,
      cancelled: serviceRequests.filter(r => r.status === 'CANCELLED').length
    };
  };

  const statusCounts = getStatusCounts();

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
                <h1 className="text-lg font-semibold">My Service Requests</h1>
                <p className="text-sm text-muted-foreground">Track your vehicle service history</p>
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
                onClick={() => navigate('/new-service')}
              >
                New Request
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{statusCounts.all}</div>
              <div className="text-sm text-muted-foreground">Total Requests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{statusCounts.active}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{statusCounts.cancelled}</div>
              <div className="text-sm text-muted-foreground">Cancelled</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filter Requests
              </CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Requests ({statusCounts.all})</SelectItem>
                  <SelectItem value="SUBMITTED">New Requests</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="REACHED">Mechanic Arrived</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {/* Requests List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-32">
                <Car className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  {statusFilter === 'ALL' ? 'No service requests found' : `No ${statusFilter.toLowerCase()} requests`}
                </p>
                <Button onClick={() => navigate('/new-service')}>
                  Create Your First Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <ServiceStatusBadge status={request.status} />
                      {getUrgencyBadge(request.urgency)}
                      <Badge variant="outline" className="text-xs">
                        #{request.id.slice(-6)}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(request.createdAt)}
                      </div>
                      {request.estimatedCost && (
                        <div className="text-sm font-medium">
                          ₹{request.estimatedCost.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Service Details */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {request.vehicleType} - {request.issueType}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground pl-6 line-clamp-2">
                        {request.description}
                      </p>
                      
                      <div className="flex items-center space-x-2 pl-6">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {request.pickupAddress}
                        </span>
                      </div>
                    </div>

                    {/* Assignment Details */}
                    <div className="space-y-3">
                      {request.workshop && (
                        <div>
                          <div className="text-sm font-medium mb-1">Workshop</div>
                          <div className="text-sm text-muted-foreground">
                            {request.workshop.name}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {request.workshop.phone}
                            </span>
                          </div>
                        </div>
                      )}

                      {request.mechanic && (
                        <div>
                          <div className="text-sm font-medium mb-1">Assigned Mechanic</div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{request.mechanic.user.name}</span>
                          </div>
                          {request.mechanic.user.phone && (
                            <div className="flex items-center space-x-2 mt-1 pl-6">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {request.mechanic.user.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {request.updates.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1">Latest Update</div>
                          <div className="text-xs text-muted-foreground">
                            {request.updates[0].message}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(request.updates[0].timestamp)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/track-service/${request.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Track Service
                    </Button>
                    
                    {request.mechanic && ['ASSIGNED', 'IN_PROGRESS', 'REACHED'].includes(request.status) && (
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4 mr-2" />
                        Call Mechanic
                      </Button>
                    )}
                    
                    <Button variant="outline" size="sm">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Support
                    </Button>

                    {request.status === 'COMPLETED' && (
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Book Again
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {filteredRequests.length > 10 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">Previous</Button>
              <Button size="sm">1</Button>
              <Button variant="outline" size="sm">2</Button>
              <Button variant="outline" size="sm">3</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRequestsPage;