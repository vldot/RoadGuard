import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  User, 
  Phone, 
  Mail,
  Wrench,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  Plus,
  X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface AddMechanicModalProps {
  isOpen: boolean;
  onClose: () => void;
  workshopId: string;
  onSuccess: () => void;
}

const AVAILABLE_SPECIALTIES = [
  'Engine Repair',
  'Brake Service',
  'Oil Change',
  'Transmission',
  'AC Service',
  'Battery Service',
  'Tire Service',
  'Suspension',
  'Electrical',
  'Diagnostics'
];

const AddMechanicModal: React.FC<AddMechanicModalProps> = ({ 
  isOpen, 
  onClose, 
  workshopId,
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    experience: 0,
    specialties: [] as string[],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');

  // Create mechanic mutation
  const createMechanicMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post('/admin/mechanics', {
        ...data,
        workshopId,
        role: 'MECHANIC'
      });
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
      toast.error(error.response?.data?.error || 'Failed to create mechanic account');
    }
  });

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      experience: 0,
      specialties: [],
    });
    setStep('form');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.specialties.length === 0) {
      toast.error('Please select at least one specialty');
      return;
    }

    createMechanicMutation.mutate(formData);
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            {step === 'form' ? 'Add New Mechanic' : 'Mechanic Added!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form' 
              ? 'Create a new mechanic account for your workshop'
              : 'The mechanic account has been created successfully!'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter mechanic's full name"
                      required
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
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="mechanic@example.com"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Security */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Create a secure password"
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm the password"
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Wrench className="h-5 w-5 mr-2" />
                  Professional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={formData.experience}
                    onChange={(e) => setFormData(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    min="0"
                    max="50"
                  />
                </div>

                <div>
                  <Label>Specialties * (Select all that apply)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {AVAILABLE_SPECIALTIES.map((specialty) => (
                      <div
                        key={specialty}
                        onClick={() => toggleSpecialty(specialty)}
                        className={`p-2 border rounded-lg cursor-pointer transition-colors text-center text-sm ${
                          formData.specialties.includes(specialty)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                      >
                        {specialty}
                      </div>
                    ))}
                  </div>
                  
                  {formData.specialties.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-1">
                        {formData.specialties.map((specialty) => (
                          <Badge key={specialty} variant="secondary" className="text-xs">
                            {specialty}
                            <button
                              type="button"
                              onClick={() => toggleSpecialty(specialty)}
                              className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2 text-sm">Account Setup Instructions:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• The mechanic will receive login credentials via email</li>
                  <li>• They can access their dashboard to view assigned jobs</li>
                  <li>• Default availability will be set to "Available"</li>
                  <li>• You can modify their details later from the workshop management</li>
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
                disabled={createMechanicMutation.isPending}
                className="min-w-32"
              >
                {createMechanicMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Mechanic
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
              <h3 className="text-lg font-semibold">Mechanic Account Created!</h3>
              <p className="text-muted-foreground mt-1">
                {formData.name} has been added to your workshop team.
              </p>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Login credentials have been sent to:</p>
              <p className="font-medium">{formData.email}</p>
              <div className="mt-3">
                <p>Specialties: {formData.specialties.join(', ')}</p>
                <p>Experience: {formData.experience} years</p>
              </div>
            </div>
            
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddMechanicModal;