
import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 ml-0 md:ml-[var(--sidebar-width)] p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 transition-[margin] duration-200 ease-linear">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
