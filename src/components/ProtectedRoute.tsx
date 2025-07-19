import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingWelcome, setCheckingWelcome] = useState(true);

  useEffect(() => {
    // Small delay to let auth state settle
    const timer = setTimeout(() => {
      setCheckingWelcome(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (loading || checkingWelcome) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user should see welcome screen
  const hasCompletedWelcome = localStorage.getItem('welcome-completed') === 'true';
  const isOnWelcomePage = location.pathname === '/welcome';
  
  // Redirect new users to welcome screen (unless they're already there)
  if (!hasCompletedWelcome && !isOnWelcomePage) {
    return <Navigate to="/welcome" replace />;
  }

  // If on welcome page, render without sidebar
  if (isOnWelcomePage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}