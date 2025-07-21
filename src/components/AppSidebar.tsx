
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
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground rounded-lg p-2">
            <TrendingUp className="h-5 w-5" />
          </div>
          {state === 'expanded' && (
            <div className="flex flex-col">
              <span className="font-bold text-lg">The Trade Zero</span>
              <p className="text-xs text-muted-foreground">Trading Journal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Trading</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className={getNavCls(isActive(item.url))}>
                    <NavLink to={item.url} end>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => {
                // Hide upgrade button for premium users
                if (item.title === 'Upgrade' && isPremium) {
                  return null;
                }
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className={getNavCls(isActive(item.url))}>
                      <NavLink to={item.url} end>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <UserProfileManager collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}
