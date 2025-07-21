
import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">Trading Journal</h1>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 xl:p-10">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
