import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  Phone, 
  Building,
  Loader2,
  X,
  CheckCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WorkshopCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const WorkshopCreationModal: React.FC<WorkshopCreationModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    latitude: 0,
    longitude: 0,
    phone: ''
  });

  const [step, setStep] = useState<'form' | 'success'>('form');

  // Create workshop mutation
  const createWorkshopMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await axios.post('/workshops', data);
      return response.data;
    },
    onSuccess: () => {
      setStep('success');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create workshop');
    }
  });

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      latitude: 0,
      longitude: 0,
      phone: ''
    });
    setStep('form');
    onClose();
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

    createWorkshopMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            {step === 'form' ? 'Create Your Workshop' : 'Workshop Created!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form' 
              ? 'Set up your workshop profile to start receiving service requests'
              : 'Your workshop has been created successfully!'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Workshop Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Workshop Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Workshop Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., ABC Auto Service Center"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of your workshop services..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Contact Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Workshop Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Complete Address *</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter complete workshop address"
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
                    <p className="text-sm">Location preview</p>
                    {formData.latitude !== 0 && formData.longitude !== 0 && (
                      <p className="text-xs">
                        Lat: {formData.latitude.toFixed(4)}, Lng: {formData.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefits Info */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">What happens after creation:</h3>
                <ul className="text-sm space-y-2">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    Your workshop will be visible to nearby customers
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    You can start receiving service requests immediately
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    Add mechanics to your team and assign jobs
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    Track your workshop performance and analytics
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createWorkshopMutation.isPending}
                className="min-w-32"
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
        )}

        {step === 'success' && (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">Workshop Created Successfully!</h3>
              <p className="text-muted-foreground mt-1">
                Your workshop profile has been set up and is now active.
              </p>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>You can now:</p>
              <ul className="mt-2 space-y-1">
                <li>• Add mechanics to your workshop</li>
                <li>• Receive and manage service requests</li>
                <li>• Track your business performance</li>
              </ul>
            </div>
            
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WorkshopCreationModal;