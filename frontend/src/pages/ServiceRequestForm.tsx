import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  Upload, 
  Calendar,
  Clock,
  ArrowLeft,
  Loader2,
  Camera,
  X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ServiceRequestFormProps {
  workshopId?: string;
  onBack: () => void;
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({ workshopId, onBack }) => {
  const [formData, setFormData] = useState({
    vehicleType: '',
    vehicleMake: '',
    vehicleModel: '',
    issueType: '',
    description: '',
    urgency: 'MEDIUM',
    pickupAddress: '',
    latitude: 0,
    longitude: 0,
    images: [] as string[],
    serviceTime: '',
    contactName: '',
    contactPhone: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Create service request mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await axios.post('/services', {
        vehicleType: data.vehicleType,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        issueType: data.issueType,
        description: data.description,
        urgency: data.urgency,
        pickupAddress: data.pickupAddress,
        latitude: data.latitude,
        longitude: data.longitude,
        images: data.images
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Service request submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
      navigate('/dashboard/track-service', { state: { serviceId: data.serviceRequest.id } });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit service request');
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Mock upload - replace with actual image upload service
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      const uploadedImages = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages]
      }));
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createServiceMutation.mutate(formData);
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
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-6">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step <= currentStep 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {step}
          </div>
          {step < 3 && <div className="w-12 h-0.5 bg-muted mx-2" />}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="vehicleType">Vehicle Type *</Label>
          <Select value={formData.vehicleType} onValueChange={(value) => 
            setFormData(prev => ({ ...prev, vehicleType: value }))
          }>
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Car">Car</SelectItem>
              <SelectItem value="Motorcycle">Motorcycle</SelectItem>
              <SelectItem value="Truck">Truck</SelectItem>
              <SelectItem value="Bus">Bus</SelectItem>
              <SelectItem value="Auto Rickshaw">Auto Rickshaw</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="vehicleMake">Vehicle Make</Label>
          <Input
            id="vehicleMake"
            value={formData.vehicleMake}
            onChange={(e) => setFormData(prev => ({ ...prev, vehicleMake: e.target.value }))}
            placeholder="e.g., Honda, Toyota"
          />
        </div>

        <div>
          <Label htmlFor="vehicleModel">Vehicle Model</Label>
          <Input
            id="vehicleModel"
            value={formData.vehicleModel}
            onChange={(e) => setFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
            placeholder="e.g., City, Camry"
          />
        </div>

        <div>
          <Label htmlFor="issueType">Issue Type *</Label>
          <Select value={formData.issueType} onValueChange={(value) => 
            setFormData(prev => ({ ...prev, issueType: value }))
          }>
            <SelectTrigger>
              <SelectValue placeholder="Select issue type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Engine Problem">Engine Problem</SelectItem>
              <SelectItem value="Flat Tire">Flat Tire</SelectItem>
              <SelectItem value="Battery Issue">Battery Issue</SelectItem>
              <SelectItem value="Brake Problem">Brake Problem</SelectItem>
              <SelectItem value="AC Issue">AC Issue</SelectItem>
              <SelectItem value="Oil Change">Oil Change</SelectItem>
              <SelectItem value="General Service">General Service</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Describe the Issue *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Please describe the problem in detail..."
          rows={4}
        />
      </div>

      <div>
        <Label>Urgency Level</Label>
        <RadioGroup 
          value={formData.urgency} 
          onValueChange={(value: string) => setFormData(prev => ({ ...prev, urgency: value }))}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="LOW" id="low" />
            <Label htmlFor="low">Low</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="MEDIUM" id="medium" />
            <Label htmlFor="medium">Medium</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="HIGH" id="high" />
            <Label htmlFor="high">High</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="contactName">Your Name *</Label>
        <Input
          id="contactName"
          value={formData.contactName}
          onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <Label htmlFor="contactPhone">Phone Number *</Label>
        <Input
          id="contactPhone"
          value={formData.contactPhone}
          onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
          placeholder="Enter your phone number"
        />
      </div>

      <div>
        <Label htmlFor="pickupAddress">Pickup Address *</Label>
        <div className="flex space-x-2">
          <Input
            id="pickupAddress"
            value={formData.pickupAddress}
            onChange={(e) => setFormData(prev => ({ ...prev, pickupAddress: e.target.value }))}
            placeholder="Enter pickup location"
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={getCurrentLocation}>
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="serviceTime">Preferred Service Time</Label>
        <Select value={formData.serviceTime} onValueChange={(value) => 
          setFormData(prev => ({ ...prev, serviceTime: value }))
        }>
          <SelectTrigger>
            <SelectValue placeholder="Select preferred time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="instant">Instant Service</SelectItem>
            <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
            <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
            <SelectItem value="evening">Evening (5 PM - 8 PM)</SelectItem>
            <SelectItem value="scheduled">Schedule for Later</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-muted p-4 rounded-md">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Location</h4>
          <Button variant="outline" size="sm">
            Choose location to provide service
          </Button>
        </div>
        <div className="h-32 bg-background rounded border flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Map will show here</p>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <Label>Upload Images (Optional)</Label>
        <div className="border-2 border-dashed border-muted rounded-lg p-6">
          <div className="text-center">
            <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Upload photos of the issue to help mechanics understand better
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('image-upload')?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Images
            </Button>
          </div>
        </div>
      </div>

      {formData.images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {formData.images.map((image, index) => (
            <div key={index} className="relative">
              <img
                src={image}
                alt={`Upload ${index + 1}`}
                className="w-full h-24 object-cover rounded border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-muted p-4 rounded-md">
        <h4 className="font-medium mb-2">Request Summary</h4>
        <div className="space-y-1 text-sm">
          <p><span className="font-medium">Vehicle:</span> {formData.vehicleType} {formData.vehicleMake} {formData.vehicleModel}</p>
          <p><span className="font-medium">Issue:</span> {formData.issueType}</p>
          <p><span className="font-medium">Urgency:</span> {formData.urgency}</p>
          <p><span className="font-medium">Location:</span> {formData.pickupAddress}</p>
          <p><span className="font-medium">Service Time:</span> {formData.serviceTime || 'Not specified'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={onBack} className="mr-3">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">New Service Request</h1>
              <p className="text-sm text-muted-foreground">Step {currentStep} of 3</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {renderStepIndicator()}

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && 'Vehicle & Issue Details'}
              {currentStep === 2 && 'Contact & Location'}
              {currentStep === 3 && 'Images & Review'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              <div className="flex justify-between mt-6">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                  >
                    Previous
                  </Button>
                )}
                
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="ml-auto"
                    disabled={
                      (currentStep === 1 && (!formData.vehicleType || !formData.issueType || !formData.description)) ||
                      (currentStep === 2 && (!formData.contactName || !formData.contactPhone || !formData.pickupAddress))
                    }
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="ml-auto"
                    disabled={createServiceMutation.isPending}
                  >
                    {createServiceMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServiceRequestForm;