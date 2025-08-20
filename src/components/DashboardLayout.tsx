
import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileHeader } from '@/components/MobileHeader';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        {/* Mobile header for smaller screens */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
          <MobileHeader />
        </div>
        <main className="flex-1 transition-all duration-300 ease-in-out lg:ml-[var(--sidebar-width)] p-2 sm:p-4 md:p-6 lg:p-8 xl:p-10 lg:pt-8 pt-16">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
