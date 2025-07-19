import { ArrowLeft, Menu, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfileManager } from '@/components/UserProfileManager';
import { MobileSidebar } from '@/components/MobileSidebar';
import { useState } from 'react';

export function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/trades/new':
        return 'New Trade';
      case '/trades':
        return 'Trade History';
      case '/calendar':
        return 'PNL Calendar';
      case '/accounts':
        return 'Trading Accounts';
      case '/strategies':
        return 'Strategies';
      case '/confluence':
        return 'Confluence';
      case '/notes':
        return 'Notes';
      default:
        return 'The Trade Zero';
    }
  };

  const showBackButton = location.pathname !== '/dashboard';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center gap-2 flex-1">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Menu className="h-4 w-4" />
              </Button>
            </MobileSidebar>
          )}
          
          <div className="flex items-center gap-2 flex-1">
            <div className="bg-primary text-primary-foreground rounded-lg p-1.5">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-semibold text-sm truncate">
                {getPageTitle(location.pathname)}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <UserProfileManager collapsed={true} />
        </div>
      </div>
    </header>
  );
}