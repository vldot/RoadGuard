import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  Phone, 
  Building,
  User,
  Loader2,
  X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AddWorkshopFormProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const AddWorkshopForm: React.FC<AddWorkshopFormProps> = ({ isOpen, onClose, userRole }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    latitude: 0,
    longitude: 0,
    phone: '',
    adminId: ''
  });

  const queryClient = useQueryClient();

  // Fetch available workshop admins (only for super admin)
  const { data: adminsData } = useQuery({
    queryKey: ['admin', 'workshop-admins'],
    queryFn: async () => {
      const response = await axios.get('/admin/users', {
        params: { role: 'WORKSHOP_ADMIN' }
      });
      return response.data;
    },
    enabled: userRole === 'SUPER_ADMIN' && isOpen
  });

  // Create workshop mutation
  const createWorkshopMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const endpoint = userRole === 'SUPER_ADMIN' ? '/admin/workshops' : '/workshops';
      const response = await axios.post(endpoint, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Workshop created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'workshops'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create workshop');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      latitude: 0,
      longitude: 0,
      phone: '',
      adminId: ''
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
          toast.success('Location updated');
        },
        (error) => {
          toast.error('Failed to get location');
        }
      );
    } else {
      toast.error('Geolocation not supported by browser');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.address || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (userRole === 'SUPER_ADMIN' && !formData.adminId) {
      toast.error('Please select a workshop admin');
      return;
    }

    createWorkshopMutation.mutate(formData);
  };

  const availableAdmins: User[] = adminsData?.users?.filter((user: User) => 
    // Filter out admins who already have workshops
    !adminsData.users.some((u: any) => u.workshop && u.id === user.id)
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Add New Workshop
          </DialogTitle>
          <DialogDescription>
            Create a new workshop and assign it to a workshop admin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workshop Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Workshop Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter workshop name"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the workshop"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 XXXXX XXXXX"
                required
              />
            </div>

            {userRole === 'SUPER_ADMIN' && (
              <div>
                <Label htmlFor="adminId">Workshop Admin *</Label>
                <Select 
                  value={formData.adminId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, adminId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select workshop admin" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAdmins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          <div>
                            <div className="font-medium">{admin.name}</div>
                            <div className="text-xs text-muted-foreground">{admin.email}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Location Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Full Address *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter complete address"
                    className="flex-1"
                    required
                  />
                  <Button type="button" variant="outline" onClick={getCurrentLocation}>
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.0000"
                  />
                </div>
              </div>

              {/* Map Preview */}
              <div className="h-32 bg-muted rounded border flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-sm">Map preview will appear here</p>
                  {formData.latitude !== 0 && formData.longitude !== 0 && (
                    <p className="text-xs">
                      Lat: {formData.latitude.toFixed(4)}, Lng: {formData.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createWorkshopMutation.isPending}
            >
              {createWorkshopMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Building className="h-4 w-4 mr-2" />
                  Create Workshop
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorkshopForm;