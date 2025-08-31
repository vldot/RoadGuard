import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Star
} from 'lucide-react';

type ServiceStatus = 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'REACHED' | 'COMPLETED' | 'CANCELLED';

interface ServiceRequest {
  id: string;
  status: ServiceStatus;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  customerRating?: number;
}

interface MechanicStatsProps {
  serviceRequests: ServiceRequest[];
}

const MechanicStats: React.FC<MechanicStatsProps> = ({ serviceRequests }) => {
  // Calculate statistics
  const stats = {
    total: serviceRequests.length,
    completed: serviceRequests.filter(r => r.status === 'COMPLETED').length,
    inProgress: serviceRequests.filter(r => r.status === 'IN_PROGRESS').length,
    pending: serviceRequests.filter(r => r.status === 'ASSIGNED').length,
    highPriority: serviceRequests.filter(r => r.urgency === 'HIGH').length,
    avgRating: serviceRequests.filter(r => r.customerRating)
      .reduce((sum, r) => sum + (r.customerRating || 0), 0) / 
      serviceRequests.filter(r => r.customerRating).length || 0
  };

  // Calculate completion rate
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Get today's tasks
  const today = new Date().toDateString();
  const todayTasks = serviceRequests.filter(r => 
    new Date(r.createdAt).toDateString() === today
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            {todayTasks} assigned today
          </p>
        </CardContent>
      </Card>

      {/* In Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
          <p className="text-xs text-muted-foreground">
            {stats.pending} pending start
          </p>
        </CardContent>
      </Card>

      {/* Completed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 mr-1" />
            {completionRate}% completion rate
          </div>
        </CardContent>
      </Card>

      {/* Priority & Rating */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Priority & Rating</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">High Priority</span>
              <Badge variant="destructive" className="text-xs">
                {stats.highPriority}
              </Badge>
            </div>
            {stats.avgRating > 0 && (
              <div className="flex items-center">
                <Star className="h-3 w-3 text-yellow-500 mr-1" />
                <span className="text-sm font-medium">
                  {stats.avgRating.toFixed(1)}/5
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MechanicStats;