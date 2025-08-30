// src/routes/auth.ts - Enhanced with OTP verification
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();
const sendAccountVerificationEmail = require('../utils/sendAccountVerificationEmail');

// Validation schemas
const sendOtpSchema = z.object({
  email: z.string().email('Invalid email format')
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  token: z.string().min(1, 'Token is required')
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['END_USER', 'WORKSHOP_ADMIN']),
  currentEmployer: z.string().optional(),
  profileImage: z.string().optional(),
  language: z.string().default('en'),
  otpToken: z.string().min(1, 'OTP token is required'),
  // Workshop data for admin registration
  workshopData: z.object({
    name: z.string(),
    description: z.string().optional(),
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    phone: z.string()
  }).optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// In-memory OTP storage (use Redis in production)
const otpStore: Map<string, { otp: string; email: string; expires: Date; verified: boolean }> = new Map();

// Generate JWT token
const generateToken = (userId: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn']
  };
  return jwt.sign({ userId }, secret, options);
};

// Generate OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP endpoint
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = sendOtpSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Generate OTP and token
    const otp = generateOTP();
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    otpStore.set(token, { otp, email, expires, verified: false });

    // Send email
    await sendAccountVerificationEmail(email, otp);
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@roadguard.com',
      to: email,
      subject: 'RoadGuard - Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1>RoadGuard</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for signing up with RoadGuard! Please use the following OTP to verify your email address:</p>
            <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #6b7280;">This OTP will expire in 10 minutes.</p>
            <p style="color: #6b7280;">If you didn't request this, please ignore this email.</p>
          </div>
          <div style="background: #374151; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            <p>© 2024 RoadGuard. All rights reserved.</p>
          </div>
        </div>
      `
    };

    res.json({ 
      message: 'OTP sent successfully',
      token,
      // In development, include OTP in response
      ...(process.env.NODE_ENV === 'development' && { otp })
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, token } = verifyOtpSchema.parse(req.body);

    // Check if token exists
    const storedData = otpStore.get(token);
    if (!storedData) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Check if expired
    if (new Date() > storedData.expires) {
      otpStore.delete(token);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Check if email matches
    if (storedData.email !== email) {
      return res.status(400).json({ error: 'Email mismatch' });
    }

    // Check if OTP matches
    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark as verified
    otpStore.set(token, { ...storedData, verified: true });

    res.json({ message: 'OTP verified successfully' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { name, email, password, phone, role, currentEmployer, profileImage, language, otpToken, workshopData } = validatedData;

    // Verify OTP token
    const storedData = otpStore.get(otpToken);
    if (!storedData || !storedData.verified || storedData.email !== email) {
      return res.status(400).json({ error: 'Invalid or unverified OTP token' });
    }

    // Check if expired
    if (new Date() > storedData.expires) {
      otpStore.delete(otpToken);
      return res.status(400).json({ error: 'OTP token has expired' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with transaction (for workshop admin)
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role,
          verified: true, // Already verified via OTP
          // Store additional profile data in a separate profile table
          currentEmployer,
          profileImage,
          language
        }
      });

      // If workshop admin, create workshop if provided
      if (role === 'WORKSHOP_ADMIN' && workshopData) {
        await tx.workshop.create({
          data: {
            ...workshopData,
            adminId: newUser.id
          }
        });
      }

      return newUser;
    });

    // Clean up OTP token
    otpStore.delete(otpToken);

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        currentEmployer: user.currentEmployer,
        profileImage: user.profileImage,
        language: user.language
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        workshop: true,
        mechanic: {
          include: {
            workshop: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        currentEmployer: user.currentEmployer,
        profileImage: user.profileImage,
        language: user.language,
        workshop: user.workshop,
        mechanic: user.mechanic
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        workshop: true,
        mechanic: {
          include: {
            workshop: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        currentEmployer: user.currentEmployer,
        profileImage: user.profileImage,
        language: user.language,
        workshop: user.workshop,
        mechanic: user.mechanic
      }
    });

  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
});

export default router;