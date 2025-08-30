// Standard service costs and presets for different vehicle types and service categories

export interface ServicePreset {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  estimatedTime: string;
  vehicleTypes: string[];
}

export interface CostBreakdown {
  serviceCost: number;
  partsCost: number;
  taxes: number;
  totalCost: number;
}

// Service type presets
export const servicePresets: ServicePreset[] = [
  {
    id: 'engine-tune-up',
    name: 'Engine Tune-up',
    description: 'Complete engine tune-up including spark plug replacement and engine optimization',
    basePrice: 2000,
    estimatedTime: '1-2 hours',
    vehicleTypes: ['Car', 'Truck']
  },
  {
    id: 'oil-change',
    name: 'Oil Change',
    description: 'Standard oil change with filter replacement',
    basePrice: 800,
    estimatedTime: '30-45 minutes',
    vehicleTypes: ['Car', 'Motorcycle', 'Truck', 'Bus', 'Auto Rickshaw']
  },
  {
    id: 'brake-service',
    name: 'Brake Service',
    description: 'Brake pad replacement and brake system check',
    basePrice: 1500,
    estimatedTime: '1-2 hours',
    vehicleTypes: ['Car', 'Motorcycle', 'Truck', 'Bus']
  },
  {
    id: 'flat-tire',
    name: 'Flat Tire Repair',
    description: 'Tire repair or replacement for flat or damaged tires',
    basePrice: 300,
    estimatedTime: '30 minutes',
    vehicleTypes: ['Car', 'Motorcycle', 'Truck', 'Bus', 'Auto Rickshaw']
  },
  {
    id: 'battery-service',
    name: 'Battery Service',
    description: 'Battery check, charging or replacement',
    basePrice: 500,
    estimatedTime: '30 minutes',
    vehicleTypes: ['Car', 'Motorcycle', 'Truck', 'Bus', 'Auto Rickshaw']
  },
  {
    id: 'ac-service',
    name: 'AC Service',
    description: 'Air conditioning system check and recharge',
    basePrice: 1200,
    estimatedTime: '1-2 hours',
    vehicleTypes: ['Car', 'Truck', 'Bus']
  },
  {
    id: 'general-checkup',
    name: 'General Vehicle Checkup',
    description: 'Complete vehicle inspection and diagnostic report',
    basePrice: 1000,
    estimatedTime: '1 hour',
    vehicleTypes: ['Car', 'Motorcycle', 'Truck', 'Bus', 'Auto Rickshaw']
  }
];

// Vehicle type multipliers for cost adjustments
export const vehicleMultipliers: Record<string, number> = {
  'Car': 1.0,
  'Motorcycle': 0.6,
  'Truck': 1.5,
  'Bus': 2.0,
  'Auto Rickshaw': 0.8
};

// Calculate service cost based on vehicle type and service preset
export const calculateServiceCost = (
  vehicleType: string, 
  servicePresetId: string
): CostBreakdown | null => {
  const preset = servicePresets.find(p => p.id === servicePresetId);
  
  if (!preset || !preset.vehicleTypes.includes(vehicleType)) {
    return null;
  }

  const multiplier = vehicleMultipliers[vehicleType] || 1.0;
  const adjustedBasePrice = Math.round(preset.basePrice * multiplier);
  
  // Calculate breakdown
  const serviceCost = Math.round(adjustedBasePrice * 0.7);  // 70% of cost is service
  const partsCost = Math.round(adjustedBasePrice * 0.3);   // 30% of cost is parts
  const taxes = Math.round(adjustedBasePrice * 0.18);      // 18% tax
  const totalCost = adjustedBasePrice + taxes;
  
  return {
    serviceCost,
    partsCost,
    taxes,
    totalCost
  };
};
