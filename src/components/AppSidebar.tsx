
import { 
  LayoutDashboard, 
  PlusCircle, 
  Calendar, 
  Settings,
  BookOpen,
  StickyNote,
  Building2,
  Target,
  TrendingUp,
  LogOut,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { UserProfileManager } from '@/components/UserProfileManager';
import { useSubscription } from '@/hooks/useSubscription';

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'New Trade', url: '/trades/new', icon: PlusCircle },
  { title: 'Trade History', url: '/trades', icon: TrendingUp },
  { title: 'PNL Calendar', url: '/calendar', icon: Calendar },
];

const systemItems = [
  { title: 'Trading Accounts', url: '/accounts', icon: Building2 },
  { title: 'Strategies', url: '/strategies', icon: Target },
  { title: 'Confluence', url: '/confluence', icon: BookOpen },
  { title: 'Notes', url: '/notes', icon: StickyNote },
  { title: 'Upgrade', url: '/upgrade', icon: Crown },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';
  const { isPremium } = useSubscription();

  const isActive = (path: string) => currentPath === path;
  const getNavCls = (isActive: boolean) =>
    isActive ? 
      "bg-primary text-primary-foreground font-medium shadow-sm w-full justify-start rounded-md" : 
      "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full justify-start rounded-md";


  return (
    <Sidebar 
      className="hidden lg:flex"
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground rounded-lg p-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-sidebar-foreground">The Trade Zero</span>
              <p className="text-xs text-sidebar-foreground/60">Trading Journal</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="bg-primary text-primary-foreground rounded-lg p-2 mx-auto">
            <TrendingUp className="h-5 w-5" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2">
            Trading
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1">
              {menuItems.map((item) => (
                <Button
                  key={item.title}
                  variant="ghost"
                  asChild
                  className={getNavCls(currentPath === item.url)}
                >
                  <NavLink to={item.url} end>
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span className="ml-3">{item.title}</span>}
                  </NavLink>
                </Button>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1">
              {systemItems.map((item) => {
                // Hide upgrade button for premium users
                if (item.title === 'Upgrade' && isPremium) {
                  return null;
                }
                
                return (
                  <Button
                    key={item.title}
                    variant="ghost"
                    asChild
                    className={getNavCls(currentPath === item.url)}
                  >
                    <NavLink to={item.url} end>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </Button>
                );
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <UserProfileManager collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}
