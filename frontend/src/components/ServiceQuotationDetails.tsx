import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CostBreakdown, ServicePreset } from './ServiceCostPresets';

interface ServiceQuotationDetailsProps {
  selectedService: ServicePreset | null;
  vehicleType: string;
  costBreakdown: CostBreakdown | null;
  customerDetails: {
    name: string;
    phone: string;
  };
  vehicleDetails: {
    make: string;
    model: string;
  };
  serviceType: 'instant' | 'prebook';
  scheduledTime?: string;
  serviceAddress: string;
}

const ServiceQuotationDetails: React.FC<ServiceQuotationDetailsProps> = ({
  selectedService,
  vehicleType,
  costBreakdown,
  customerDetails,
  vehicleDetails,
  serviceType,
  scheduledTime,
  serviceAddress,
}) => {
  if (!selectedService || !costBreakdown) {
    return null;
  }

  return (
    <Card className="border-2 border-primary">
      <CardHeader className="bg-primary/10">
        <CardTitle className="text-primary text-center">Service Quotation</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Service Details */}
        <div className="space-y-1 mb-4">
          <h3 className="font-semibold text-lg">{selectedService.name}</h3>
          <p className="text-sm text-muted-foreground">{selectedService.description}</p>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-muted-foreground">Estimated Time:</span>
            <span className="font-medium">{selectedService.estimatedTime}</span>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Vehicle & Customer Details */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <h4 className="font-medium mb-1">Vehicle Details</h4>
            <p className="text-muted-foreground">{vehicleType}</p>
            {(vehicleDetails.make || vehicleDetails.model) && (
              <p className="text-muted-foreground">
                {vehicleDetails.make} {vehicleDetails.model}
              </p>
            )}
          </div>
          <div>
            <h4 className="font-medium mb-1">Customer</h4>
            <p className="text-muted-foreground">{customerDetails.name}</p>
            <p className="text-muted-foreground">{customerDetails.phone}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <h4 className="font-medium mb-1">Service Type</h4>
            <p className="text-muted-foreground capitalize">{serviceType}</p>
            {scheduledTime && (
              <p className="text-muted-foreground">{scheduledTime}</p>
            )}
          </div>
          <div>
            <h4 className="font-medium mb-1">Address</h4>
            <p className="text-muted-foreground">{serviceAddress}</p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Cost Breakdown */}
        <h4 className="font-medium mb-3">Cost Breakdown</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service Charges</span>
            <span>₹{costBreakdown.serviceCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Spare Parts</span>
            <span>₹{costBreakdown.partsCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxes (18%)</span>
            <span>₹{costBreakdown.taxes.toLocaleString()}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span className="text-primary">₹{costBreakdown.totalCost.toLocaleString()}</span>
          </div>
        </div>

        {/* Fine Print */}
        <div className="mt-6 text-xs text-muted-foreground">
          <p>* Final charges may vary based on actual service requirements.</p>
          <p>* Additional parts or services will be confirmed before proceeding.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceQuotationDetails;
