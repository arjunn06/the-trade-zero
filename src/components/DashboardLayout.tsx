
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
        <main className="flex-1 ml-0 md:ml-[var(--sidebar-width)] p-2 sm:p-4 md:p-6 lg:p-8 xl:p-10 transition-[margin] duration-200 ease-linear">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
