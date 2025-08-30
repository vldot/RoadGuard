// src/pages/RegisterPage.tsx - Enhanced registration with OTP verification
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Wrench, 
  Eye, 
  EyeOff, 
  Loader2, 
  Mail, 
  Shield,
  User,
  Building,
  ArrowLeft,
  CheckCircle,
  Clock
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '../context/AuthContext';

type RegistrationStep = 'details' | 'otp' | 'profile' | 'complete';

interface RegistrationData {
  // Basic details
  email: string;
  password: string;
  confirmPassword: string;
  role: 'END_USER' | 'WORKSHOP_ADMIN';
  
  // Profile details
  name: string;
  phone: string;
  currentEmployer: string;
  profileImage: string;
  language: string;
  
  // OTP
  otp: string;
  otpToken: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('details');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  
  const [formData, setFormData] = useState<RegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'END_USER',
    name: '',
    phone: '',
    currentEmployer: '',
    profileImage: '',
    language: 'en',
    otp: '',
    otpToken: ''
  });

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await axios.post('/auth/send-otp', { email });
      return response.data;
    },
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, otpToken: data.token }));
      setCurrentStep('otp');
      setOtpTimer(60); // Start 60 second timer
      toast.success('OTP sent to your email!');
      
      // Start countdown timer
      const timer = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    }
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, otp, token }: { email: string; otp: string; token: string }) => {
      const response = await axios.post('/auth/verify-otp', { email, otp, token });
      return response.data;
    },
    onSuccess: () => {
      setCurrentStep('profile');
      toast.success('Email verified successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Invalid OTP');
    }
  });

  // Complete registration mutation
  const completeRegistrationMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      const registrationPayload = {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: data.role,
        currentEmployer: data.currentEmployer,
        profileImage: data.profileImage,
        language: data.language,
        otpToken: data.otpToken
      };

      await register(registrationPayload);
    },
    onSuccess: () => {
      setCurrentStep('complete');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Registration failed');
    }
  });

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep === 'details') {
      // Validate basic details
      if (!formData.email || !formData.password || !formData.confirmPassword) {
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
      
      // Send OTP
      sendOtpMutation.mutate(formData.email);
      
    } else if (currentStep === 'otp') {
      // Verify OTP
      if (!formData.otp || formData.otp.length !== 6) {
        toast.error('Please enter a valid 6-digit OTP');
        return;
      }
      
      verifyOtpMutation.mutate({
        email: formData.email,
        otp: formData.otp,
        token: formData.otpToken
      });
      
    } else if (currentStep === 'profile') {
      // Complete registration
      if (!formData.name || !formData.phone) {
        toast.error('Please fill in all required profile fields');
        return;
      }
      
      completeRegistrationMutation.mutate(formData);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mock image upload - replace with actual implementation
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-6">
      {['details', 'otp', 'profile', 'complete'].map((step, index) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === step 
              ? 'bg-primary text-primary-foreground' 
              : index < ['details', 'otp', 'profile', 'complete'].indexOf(currentStep)
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground'
          }`}>
            {index < ['details', 'otp', 'profile', 'complete'].indexOf(currentStep) ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < 3 && <div className="w-12 h-0.5 bg-muted mx-2" />}
        </div>
      ))}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Password *</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
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
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
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

      <div>
        <Label>Account Type *</Label>
        <RadioGroup 
          value={formData.role} 
          onValueChange={(value: 'END_USER' | 'WORKSHOP_ADMIN') => 
            setFormData(prev => ({ ...prev, role: value }))
          }
          className="mt-2"
        >
          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <RadioGroupItem value="END_USER" id="end-user" />
            <Label htmlFor="end-user" className="flex items-center cursor-pointer">
              <User className="h-4 w-4 mr-2" />
              <div>
                <div className="font-medium">End User</div>
                <div className="text-sm text-muted-foreground">Book vehicle services</div>
              </div>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <RadioGroupItem value="WORKSHOP_ADMIN" id="workshop-admin" />
            <Label htmlFor="workshop-admin" className="flex items-center cursor-pointer">
              <Building className="h-4 w-4 mr-2" />
              <div>
                <div className="font-medium">Workshop Admin</div>
                <div className="text-sm text-muted-foreground">Manage workshop and mechanics</div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderOtpStep = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold">Verify Your Email</h3>
        <p className="text-muted-foreground mt-1">
          We've sent a 6-digit code to <strong>{formData.email}</strong>
        </p>
      </div>

      <div>
        <Label htmlFor="otp">Enter OTP *</Label>
        <Input
          id="otp"
          type="text"
          placeholder="000000"
          value={formData.otp}
          onChange={(e) => setFormData(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
          className="text-center text-lg tracking-widest"
          maxLength={6}
        />
      </div>

      <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
        {otpTimer > 0 ? (
          <>
            <Clock className="h-4 w-4" />
            <span>Resend OTP in {otpTimer}s</span>
          </>
        ) : (
          <Button 
            variant="link" 
            size="sm" 
            onClick={() => sendOtpMutation.mutate(formData.email)}
            disabled={sendOtpMutation.isPending}
          >
            Resend OTP
          </Button>
        )}
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Complete Your Profile</h3>
        <p className="text-muted-foreground">Tell us a bit more about yourself</p>
      </div>

      {/* Profile Image */}
      <div className="text-center">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-3">
          {formData.profileImage ? (
            <img 
              src={formData.profileImage} 
              alt="Profile" 
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <User className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <input
          type="file"
          id="profile-image"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('profile-image')?.click()}
        >
          Upload Photo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter your full name"
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
        <Label htmlFor="current-employer">Current Employer</Label>
        <Input
          id="current-employer"
          value={formData.currentEmployer}
          onChange={(e) => setFormData(prev => ({ ...prev, currentEmployer: e.target.value }))}
          placeholder="Company or organization name"
        />
      </div>

      <div>
        <Label htmlFor="language">Preferred Language</Label>
        <Select value={formData.language} onValueChange={(value) => 
          setFormData(prev => ({ ...prev, language: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
            <SelectItem value="pa">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
            <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
            <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
            <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold">Registration Complete!</h3>
        <p className="text-muted-foreground mt-1">
          Welcome to RoadGuard, {formData.name}! 
        </p>
        <p className="text-muted-foreground">
          Redirecting you to your dashboard...
        </p>
      </div>
      
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Wrench className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Join RoadGuard</h1>
          <p className="text-muted-foreground">Create your account to get started</p>
        </div>

        {/* Back button */}
        {currentStep !== 'complete' && (
          <div className="flex justify-start">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                if (currentStep === 'otp') setCurrentStep('details');
                else if (currentStep === 'profile') setCurrentStep('otp');
                else navigate('/login');
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        )}

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 'details' && 'Account Details'}
              {currentStep === 'otp' && 'Email Verification'}
              {currentStep === 'profile' && 'Profile Setup'}
              {currentStep === 'complete' && 'Welcome!'}
            </CardTitle>
            <CardDescription>
              {currentStep === 'details' && 'Enter your basic account information'}
              {currentStep === 'otp' && 'Verify your email address to continue'}
              {currentStep === 'profile' && 'Complete your profile information'}
              {currentStep === 'complete' && 'Your account has been created successfully'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleStepSubmit} className="space-y-4">
              {currentStep === 'details' && renderDetailsStep()}
              {currentStep === 'otp' && renderOtpStep()}
              {currentStep === 'profile' && renderProfileStep()}
              {currentStep === 'complete' && renderCompleteStep()}

              {currentStep !== 'complete' && (
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={
                    sendOtpMutation.isPending || 
                    verifyOtpMutation.isPending || 
                    completeRegistrationMutation.isPending
                  }
                >
                  {sendOtpMutation.isPending && (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  )}
                  {verifyOtpMutation.isPending && (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  )}
                  {completeRegistrationMutation.isPending && (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  )}
                  {!sendOtpMutation.isPending && !verifyOtpMutation.isPending && !completeRegistrationMutation.isPending && (
                    <>
                      {currentStep === 'details' && 'Send OTP'}
                      {currentStep === 'otp' && 'Verify Email'}
                      {currentStep === 'profile' && 'Create Account'}
                    </>
                  )}
                </Button>
              )}
            </form>

            {currentStep === 'details' && (
              <div className="text-center text-sm mt-4">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link 
                  to="/login" 
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;