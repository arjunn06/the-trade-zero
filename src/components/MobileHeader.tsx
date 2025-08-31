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
  return <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      
    </header>;
}