import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Page components
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import MechanicDashboard from './pages/MechanicDashboard';
import EndUserDashboard from './pages/EndUserDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import NewServiceRequestScreen from './pages/NewServiceRequestScreen';
import MyRequestsPage from './pages/MyRequestsPage';
import MyWorkshopPage from './pages/MyWorkshopPage';
import ServiceTrackingPage from './pages/ServiceTrackingPage';
import LoadingSpinner from './components/ui/loading-spinner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: string[] 
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Role-based Dashboard Router
const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'WORKSHOP_ADMIN':
      return <AdminDashboard />;
    case 'MECHANIC':
      return <MechanicDashboard />;
    case 'END_USER':
      return <EndUserDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Toaster />
            <Routes>
              {/* Redirect root to login or dashboard */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardRouter />
                  </ProtectedRoute>
                }
              />
              
              {/* Service Request Routes */}
              <Route 
                path="/new-service" 
                element={
                  <ProtectedRoute allowedRoles={['END_USER']}>
                    <NewServiceRequestScreen />
                  </ProtectedRoute>
                }
              />

              {/* My Requests Route - End Users Only */}
              <Route 
                path="/my-requests" 
                element={
                  <ProtectedRoute allowedRoles={['END_USER']}>
                    <MyRequestsPage />
                  </ProtectedRoute>
                }
              />

              {/* Service Tracking Route */}
              <Route 
                path="/track-service/:id" 
                element={
                  <ProtectedRoute>
                    <ServiceTrackingPage />
                  </ProtectedRoute>
                }
              />

              {/* My Workshop Route - Workshop Admins Only */}
              <Route 
                path="/my-workshop" 
                element={
                  <ProtectedRoute allowedRoles={['WORKSHOP_ADMIN']}>
                    <MyWorkshopPage />
                  </ProtectedRoute>
                }
              />

              {/* Super Admin Only Routes */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Mechanic Routes */}
              <Route 
                path="/mechanic" 
                element={
                  <ProtectedRoute allowedRoles={['MECHANIC']}>
                    <MechanicDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Unauthorized page */}
              <Route 
                path="/unauthorized" 
                element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
                      <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
                      <button 
                        onClick={() => window.history.back()}
                        className="text-primary hover:underline"
                      >
                        Go back
                      </button>
                    </div>
                  </div>
                }
              />

              {/* Catch-all for 404 */}
              <Route 
                path="*" 
                element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-2xl font-bold mb-4">404 - Page Not Found</h1>
                      <p className="text-muted-foreground mb-4">The page you're looking for doesn't exist.</p>
                      <Navigate to="/dashboard" replace />
                    </div>
                  </div>
                }
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;