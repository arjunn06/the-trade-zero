import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileHeader } from '@/components/MobileHeader';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        // First check localStorage for immediate response
        const localStorageCompleted = localStorage.getItem('welcome-completed') === 'true';
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('has_completed_onboarding')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          // If no profile exists but localStorage says completed, trust it
          setHasCompletedOnboarding(localStorageCompleted);
        } else {
          const dbCompleted = profile?.has_completed_onboarding || false;
          // Use either database value OR localStorage value (whichever is true)
          setHasCompletedOnboarding(dbCompleted || localStorageCompleted);
          
          // If localStorage says completed but DB doesn't, update DB
          if (localStorageCompleted && !dbCompleted) {
            await supabase
              .from('profiles')
              .update({ has_completed_onboarding: true })
              .eq('user_id', user.id);
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Fallback to localStorage
        setHasCompletedOnboarding(localStorage.getItem('welcome-completed') === 'true');
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  if (loading || checkingOnboarding) {
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
  const isOnWelcomePage = location.pathname === '/welcome';
  
  // Redirect new users to welcome screen (unless they're already there)
  if (!hasCompletedOnboarding && !isOnWelcomePage) {
    return <Navigate to="/welcome" replace />;
  }

  // If on welcome page, render without sidebar
  if (isOnWelcomePage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        {/* Desktop Sidebar */}
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <MobileHeader />
          
          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}