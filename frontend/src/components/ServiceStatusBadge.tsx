import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  User,
  Wrench,
  MapPin,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

type ServiceStatus = 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'REACHED' | 'COMPLETED' | 'CANCELLED';

interface ServiceStatusBadgeProps {
  status: ServiceStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ServiceStatusBadge: React.FC<ServiceStatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md'
}) => {
  const getStatusConfig = (status: ServiceStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          label: 'New Request'
        };
      case 'ASSIGNED':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <User className="h-3.5 w-3.5" />,
          label: 'Assigned'
        };
      case 'IN_PROGRESS':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <Wrench className="h-3.5 w-3.5" />,
          label: 'In Progress'
        };
      case 'REACHED':
        return {
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: <MapPin className="h-3.5 w-3.5" />,
          label: 'Mechanic Arrived'
        };
      case 'COMPLETED':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="h-3.5 w-3.5" />,
          label: 'Completed'
        };
      case 'CANCELLED':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <XCircle className="h-3.5 w-3.5" />,
          label: 'Cancelled'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <Clock className="h-3.5 w-3.5" />,
          label: 'Unknown'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'px-3 py-1'
  };

  return (
    <Badge
      className={`${config.color} font-medium ${sizeClasses[size]} border`}
      variant="outline"
    >
      {showIcon && (
        <span className="mr-1 flex items-center">
          {config.icon}
        </span>
      )}
      {config.label}
    </Badge>
  );
};

export default ServiceStatusBadge;
