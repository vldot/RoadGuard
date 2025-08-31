import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import LiveLocationDisplay from '../components/LiveLocationDisplay';
import ProblemDiagnosisAgent from '../components/ProblemDiagnosisAgent';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft,
  Upload, 
  Camera,
  X,
  MapPin,
  Clock,
  Calendar,
  MessageCircle,
  CreditCard,
  Loader2,
  User,
  Phone,
  Wrench,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Bot
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { servicePresets, calculateServiceCost, ServicePreset, CostBreakdown, vehicleMultipliers } from '../components/ServiceCostPresets';
import ServiceQuotationDetails from '../components/ServiceQuotationDetails';
import { LocationData } from '../hooks/useLiveLocation';

interface ServiceRequestFormData {
  customerName: string;
  customerPhone: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  serviceType: 'instant' | 'prebook';
  serviceTimeFrom: string;
  serviceTimeTo: string;
  prebookDate: string;
  images: string[];
  issueDescription: string;
  pickupAddress: string;
  latitude: number;
  longitude: number;
  selectedServiceId: string;  // ID of the selected service preset
}

interface DiagnosisResult {
  category: string;
  confidence: number;
  suggestedService: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
}

const NewServiceRequestScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get workshop info from navigation state if available
  const selectedWorkshop = location.state?.workshop;
  
  // Current step of the booking process
  const [currentStep, setCurrentStep] = useState<'details' | 'service' | 'quotation'>('details');
  
  // Selected service and cost breakdown
  const [selectedService, setSelectedService] = useState<ServicePreset | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [formData, setFormData] = useState<ServiceRequestFormData>({
    customerName: user?.name || '',
    customerPhone: '',
    vehicleType: '',
    vehicleMake: '',
    vehicleModel: '',
    serviceType: 'instant',
    serviceTimeFrom: '',
    serviceTimeTo: '',
    prebookDate: '',
    images: [],
    issueDescription: '',
    pickupAddress: '',
    latitude: 0,
    longitude: 0,
    selectedServiceId: ''
  });
  
  const handleLocationChange = (location: LocationData | null) => {
    setUserLocation(location);
    setFormData(prev => ({
      ...prev,
      latitude: location?.latitude || 0,
      longitude: location?.longitude || 0
    }));
  };

  // Filter service presets based on selected vehicle type
  const filteredServicePresets = formData.vehicleType 
    ? servicePresets.filter(preset => preset.vehicleTypes.includes(formData.vehicleType))
    : [];

  // Update cost breakdown when vehicle type or service changes
  useEffect(() => {
    if (formData.vehicleType && formData.selectedServiceId) {
      const breakdown = calculateServiceCost(formData.vehicleType, formData.selectedServiceId);
      const selected = servicePresets.find(p => p.id === formData.selectedServiceId) || null;
      setCostBreakdown(breakdown);
      setSelectedService(selected);
    } else {
      setCostBreakdown(null);
      setSelectedService(null);
    }
  }, [formData.vehicleType, formData.selectedServiceId]);

  const [uploading, setUploading] = useState(false);
  const [showDiagnosisAgent, setShowDiagnosisAgent] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<DiagnosisResult | null>(null);

  // Create service request mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post('/services', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Service request submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
      navigate('/dashboard/track-service', { 
        state: { serviceId: data.serviceRequest.id }
      });
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
      toast.success(`${uploadedImages.length} image(s) uploaded successfully`);
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

  const handleDiagnosisComplete = (diagnosis: DiagnosisResult) => {
    setAiDiagnosis(diagnosis);
    setFormData(prev => ({
      ...prev,
      issueDescription: `${diagnosis.category}: ${diagnosis.description}`
    }));
    toast.success('AI diagnosis completed! Issue description has been updated.');
  };

  // Handle navigation between form steps
  const handleNextStep = () => {
    // Validate current step
    if (currentStep === 'details') {
      // Validate details form
      if (!formData.customerName || !formData.vehicleType || !formData.issueDescription || !formData.pickupAddress) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (formData.serviceType === 'prebook' && (!formData.prebookDate || !formData.serviceTimeFrom || !formData.serviceTimeTo)) {
        toast.error('Please select date and time for pre-booking');
        return;
      }

      // Move to service selection step
      setCurrentStep('service');
    } else if (currentStep === 'service') {
      // Validate service selection
      if (!formData.selectedServiceId) {
        toast.error('Please select a service');
        return;
      }

      // Move to quotation step
      setCurrentStep('quotation');
    }
  };

  // Go back to previous step
  const handlePreviousStep = () => {
    if (currentStep === 'service') {
      setCurrentStep('details');
    } else if (currentStep === 'quotation') {
      setCurrentStep('service');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation before submission
    if (!formData.customerName || !formData.vehicleType || !formData.issueDescription || !formData.selectedServiceId) {
      toast.error('Please complete all required information');
      return;
    }

    if (formData.serviceType === 'prebook' && (!formData.prebookDate || !formData.serviceTimeFrom || !formData.serviceTimeTo)) {
      toast.error('Please select date and time for pre-booking');
      return;
    }

    // Get scheduled time string if it's a pre-booked service
    const scheduledTimeStr = formData.serviceType === 'prebook' 
      ? `${formData.prebookDate} ${formData.serviceTimeFrom}-${formData.serviceTimeTo}` 
      : null;

    // Prepare submission data
    const submissionData = {
      vehicleType: formData.vehicleType,
      vehicleMake: formData.vehicleMake,
      vehicleModel: formData.vehicleModel,
      issueType: selectedService?.name || 'General Service',
      description: formData.issueDescription,
      urgency: 'MEDIUM',
      pickupAddress: formData.pickupAddress,
      latitude: formData.latitude,
      longitude: formData.longitude,
      images: formData.images,
      serviceType: formData.serviceType,
      scheduledTime: scheduledTimeStr,
      workshopId: selectedWorkshop?.id,
      servicePresetId: formData.selectedServiceId,
      costBreakdown: costBreakdown,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone
    };

    createServiceMutation.mutate(submissionData);
  };

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
                onClick={() => {
                  if (currentStep !== 'details') {
                    handlePreviousStep();
                  } else {
                    navigate(-1);
                  }
                }} 
                className="mr-3"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">New Service Request</h1>
                {selectedWorkshop && (
                  <p className="text-sm text-muted-foreground">{selectedWorkshop.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-2">
                <Badge variant={currentStep === 'details' ? 'default' : 'outline'} className="py-1.5">
                  1. Details
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant={currentStep === 'service' ? 'default' : 'outline'} className="py-1.5">
                  2. Services
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant={currentStep === 'quotation' ? 'default' : 'outline'} className="py-1.5">
                  3. Quotation
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDiagnosisAgent(true)}
                className="relative"
              >
                <Bot className="h-4 w-4 mr-2" />
                AI Diagnosis
                {aiDiagnosis && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <form onSubmit={
          currentStep === 'quotation' ? handleSubmit : (e) => {
            e.preventDefault();
            handleNextStep();
          }
        } className="space-y-6">
          
          {/* STEP 1: Service Request Details */}
          {currentStep === 'details' && (
            <>
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Your Name *</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone">Phone Number *</Label>
                      <Input
                        id="customerPhone"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                        placeholder="+91 XXXXX XXXXX"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wrench className="h-5 w-5 mr-2" />
                    Vehicle Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="vehicleType">Vehicle Type *</Label>
                      <Select 
                        value={formData.vehicleType} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleType: value, selectedServiceId: '' }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
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
                      <Label htmlFor="vehicleMake">Make</Label>
                      <Input
                        id="vehicleMake"
                        value={formData.vehicleMake}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicleMake: e.target.value }))}
                        placeholder="e.g., Honda"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vehicleModel">Model</Label>
                      <Input
                        id="vehicleModel"
                        value={formData.vehicleModel}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                        placeholder="e.g., City"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Service Type & Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Service Type & Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Service Type *</Label>
                    <RadioGroup 
                      value={formData.serviceType} 
                      onValueChange={(value: 'instant' | 'prebook') => 
                        setFormData(prev => ({ ...prev, serviceType: value }))
                      }
                      className="flex space-x-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="instant" id="instant" />
                        <Label htmlFor="instant" className="flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Instant Service
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="prebook" id="prebook" />
                        <Label htmlFor="prebook" className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Pre-book Slots
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.serviceType === 'prebook' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="prebookDate">Date</Label>
                        <Input
                          id="prebookDate"
                          type="date"
                          value={formData.prebookDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, prebookDate: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <Label htmlFor="serviceTimeFrom">From</Label>
                        <Input
                          id="serviceTimeFrom"
                          type="time"
                          value={formData.serviceTimeFrom}
                          onChange={(e) => setFormData(prev => ({ ...prev, serviceTimeFrom: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="serviceTimeTo">To</Label>
                        <Input
                          id="serviceTimeTo"
                          type="time"
                          value={formData.serviceTimeTo}
                          onChange={(e) => setFormData(prev => ({ ...prev, serviceTimeTo: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Location */}
              {/* <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Service Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pickupAddress">Pickup Address *</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="pickupAddress"
                        value={formData.pickupAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, pickupAddress: e.target.value }))}
                        placeholder="Enter complete address"
                        className="flex-1"
                        required
                      />
                      <Button type="button" variant="outline" onClick={getCurrentLocation}>
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Map Preview 
                  <div className="h-24 bg-muted rounded border flex items-center justify-center">
                    <div className="text-center text-muted-foreground text-sm">
                      <MapPin className="h-5 w-5 mx-auto mb-1" />
                      <p>Location preview</p>
                      {formData.latitude !== 0 && formData.longitude !== 0 && (
                        <p className="text-xs">
                          {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card> */}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Service Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LiveLocationDisplay 
                    onLocationChange={handleLocationChange}
                    showMap={true}
                    mapHeight="400px"
                    showAddress={true}
                    showAccuracy={true}
                  />
                  
                  {/* Optional manual address override */}
                  {userLocation && (
                    <div className="mt-4">
                      <Label htmlFor="addressOverride">Address Override (Optional)</Label>
                      <Input
                        id="addressOverride"
                        value={formData.pickupAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, pickupAddress: e.target.value }))}
                        placeholder="Override detected address if needed"
                        className="mt-1"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              {/* Upload Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Camera className="h-5 w-5 mr-2" />
                    Upload Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-muted rounded-lg p-4">
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload photos of the issue (optional)
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

                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Issue Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Describe Issue *
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowDiagnosisAgent(true)}
                    >
                      <Bot className="h-4 w-4 mr-1" />
                      Get AI Help
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiDiagnosis && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Bot className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-900 mb-1">AI Diagnosis Result</h4>
                          <p className="text-sm text-blue-800 mb-2"><strong>{aiDiagnosis.category}</strong></p>
                          <p className="text-sm text-blue-700 mb-2">{aiDiagnosis.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-blue-600">
                            <span>Confidence: {aiDiagnosis.confidence}%</span>
                            <span className={`px-2 py-1 rounded-full ${
                              aiDiagnosis.urgency === 'high' ? 'bg-red-100 text-red-800' :
                              aiDiagnosis.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {aiDiagnosis.urgency.toUpperCase()} URGENCY
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <Textarea
                    value={formData.issueDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
                    placeholder="Please describe the problem in detail... (or use AI Diagnosis for help)"
                    rows={4}
                    required
                  />
                </CardContent>
              </Card>

              {/* Next Step Button */}
              <Button 
                type="submit" 
                className="w-full"
                size="lg"
              >
                <ChevronRight className="h-4 w-4 mr-2" />
                Next: Select Services
              </Button>
            </>
          )}

          {/* STEP 2: Service Selection */}
          {currentStep === 'service' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wrench className="h-5 w-5 mr-2" />
                    Available Services for {formData.vehicleType}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredServicePresets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No service presets available for {formData.vehicleType}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <RadioGroup 
                        value={formData.selectedServiceId} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, selectedServiceId: value }))}
                      >
                        {filteredServicePresets.map((service) => (
                          <div key={service.id} className="flex items-start space-x-3 border rounded-lg p-4 hover:border-primary cursor-pointer">
                            <RadioGroupItem value={service.id} id={service.id} className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor={service.id} className="block font-medium cursor-pointer mb-1">
                                {service.name}
                              </Label>
                              <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                              <div className="flex justify-between text-sm">
                                <span>Estimated time: {service.estimatedTime}</span>
                                <span className="font-semibold">
                                  Starting from ₹{Math.round(service.basePrice * (vehicleMultipliers[formData.vehicleType as keyof typeof vehicleMultipliers] || 1))}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation Buttons */}
              <div className="flex space-x-4">
                <Button 
                  type="button" 
                  className="w-1/2"
                  variant="outline"
                  onClick={handlePreviousStep}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="w-1/2"
                  disabled={!formData.selectedServiceId}
                >
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Continue
                </Button>
              </div>
            </>
          )}

          {/* STEP 3: Quotation & Checkout */}
          {currentStep === 'quotation' && (
            <>
              <ServiceQuotationDetails 
                selectedService={selectedService}
                vehicleType={formData.vehicleType}
                costBreakdown={costBreakdown}
                customerDetails={{
                  name: formData.customerName,
                  phone: formData.customerPhone
                }}
                vehicleDetails={{
                  make: formData.vehicleMake,
                  model: formData.vehicleModel
                }}
                serviceType={formData.serviceType}
                scheduledTime={formData.serviceType === 'prebook' 
                  ? `${formData.prebookDate} ${formData.serviceTimeFrom}-${formData.serviceTimeTo}` 
                  : undefined}
                serviceAddress={formData.pickupAddress}
              />

              {/* Navigation & Submit Buttons */}
              <div className="flex space-x-4">
                <Button 
                  type="button" 
                  className="w-1/2"
                  variant="outline"
                  onClick={handlePreviousStep}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="w-1/2"
                  disabled={createServiceMutation.isPending}
                >
                  {createServiceMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirm & Book
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>

      {/* AI Diagnosis Agent Modal */}
      <ProblemDiagnosisAgent
        isOpen={showDiagnosisAgent}
        onClose={() => setShowDiagnosisAgent(false)}
        onDiagnosisComplete={handleDiagnosisComplete}
        vehicleType={formData.vehicleType || 'Car'}
      />
    </div>
  );
};

export default NewServiceRequestScreen;