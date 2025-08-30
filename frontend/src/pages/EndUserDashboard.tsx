// EndUserDashboard.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  MapPin, 
  Star, 
  Filter,
  Grid3X3,
  List,
  Map,
  User,
  Plus,
  Clock,
  Phone
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../context/AuthContext';

interface Workshop {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  distance?: string;
}

const EndUserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [distanceFilter, setDistanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('distance');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>('list');
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  const { user, logout } = useAuth();

  // Fetch nearby workshops
  const { data: workshopsData, isLoading } = useQuery({
    queryKey: ['workshops', 'nearby'],
    queryFn: async () => {
      const response = await axios.get('/workshops/nearby');
      return response.data;
    }
  });

  // Fetch user's service requests
  const { data: userRequestsData } = useQuery({
    queryKey: ['serviceRequests', 'user'],
    queryFn: async () => {
      const response = await axios.get('/services/my-requests');
      return response.data;
    }
  });

  const workshops = workshopsData?.workshops || [];
  const userRequests = userRequestsData?.serviceRequests || [];

  const filteredWorkshops = workshops.filter((workshop: Workshop) => {
    const matchesSearch = workshop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workshop.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOpenFilter = !showOpenOnly || workshop.isOpen;
    return matchesSearch && matchesOpenFilter;
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  const WorkshopCard = ({ workshop }: { workshop: Workshop }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{workshop.name}</h3>
            <div className="flex items-center space-x-1 mt-1">
              {renderStars(workshop.rating)}
              <span className="text-sm text-muted-foreground ml-1">
                ({workshop.reviewCount})
              </span>
            </div>
          </div>
          <div className="text-right">
            <Badge variant={workshop.isOpen ? "default" : "secondary"}>
              {workshop.isOpen ? "Open" : "Closed"}
            </Badge>
            {workshop.distance && (
              <p className="text-sm text-muted-foreground mt-1">{workshop.distance}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4 mr-1" />
          {workshop.address}
        </div>

        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <Phone className="h-4 w-4 mr-1" />
          {workshop.phone}
        </div>

        <Button 
          className="w-full" 
          size="sm"
          onClick={() => navigate('/new-service', { state: { workshop } })}
          disabled={!workshop.isOpen}
        >
          Book Service
        </Button>
      </CardContent>
    </Card>
  );

  if (viewMode === 'map') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Find Workshops</h1>
              <Button variant="outline" onClick={logout} size="sm">
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showOpenOnly"
                  checked={showOpenOnly}
                  onChange={(e) => setShowOpenOnly(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showOpenOnly" className="text-sm">Show open only</label>
              </div>

              <div className="flex items-center space-x-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={distanceFilter} onValueChange={setDistanceFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Distance</SelectItem>
                    <SelectItem value="5km">Within 5km</SelectItem>
                    <SelectItem value="10km">Within 10km</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Near by</SelectItem>
                    <SelectItem value="rating">Most Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search Workshop"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Map View */}
          <Card>
            <CardContent className="p-0">
              <div className="h-96 bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Map integration will be implemented here</p>
              </div>
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
            <div>
              <h1 className="text-xl font-semibold">Find Workshops</h1>
              <p className="text-sm text-muted-foreground">End User/Public</p>
            </div>
            <Button variant="outline" onClick={logout} size="sm">
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showOpenOnly"
                checked={showOpenOnly}
                onChange={(e) => setShowOpenOnly(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showOpenOnly" className="text-sm">Show open only</label>
            </div>

            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>

              <Select value={distanceFilter} onValueChange={setDistanceFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Distance</SelectItem>
                  <SelectItem value="5km">Within 5km</SelectItem>
                  <SelectItem value="10km">Within 10km</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Near by</SelectItem>
                  <SelectItem value="rating">Most Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search Workshop"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex space-x-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('map')}
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Workshops List/Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {filteredWorkshops.map((workshop: Workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-center mt-8">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">&lt;</Button>
            <Button size="sm">1</Button>
            <Button variant="outline" size="sm">2</Button>
            <Button variant="outline" size="sm">3</Button>
            <Button variant="outline" size="sm">4</Button>
            <Button variant="outline" size="sm">5</Button>
            <Button variant="outline" size="sm">&gt;</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndUserDashboard;