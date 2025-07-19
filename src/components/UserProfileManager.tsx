import { useState } from 'react';
import { User, Settings, LogOut, Crown, Mail, Lock, Camera, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserProfileManagerProps {
  collapsed?: boolean;
}

export function UserProfileManager({ collapsed }: UserProfileManagerProps) {
  const { user, signOut } = useAuth();
  const { isPremium } = useSubscription();
  const { toast } = useToast();
  
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out."
    });
  };

  const handleUpdateProfile = async () => {
    // TODO: Implement profile update logic
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully."
    });
    setProfileDialogOpen(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match."
      });
      return;
    }
    
    // TODO: Implement password change logic
    toast({
      title: "Password changed",
      description: "Your password has been changed successfully."
    });
    setNewPassword('');
    setConfirmPassword('');
  };

  const getInitials = (name?: string) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getDisplayName = () => {
    return user?.user_metadata?.display_name || 
           user?.user_metadata?.full_name || 
           user?.email?.split('@')[0] || 
           'User';
  };

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xs">
                {getInitials(user?.user_metadata?.display_name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <span>My Account</span>
            {isPremium && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Settings className="h-4 w-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
            </DialogTrigger>
          </Dialog>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback>
            {getInitials(user?.user_metadata?.display_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {getDisplayName()}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.email}
            </p>
            {isPremium && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
            <Settings className="h-4 w-4 mr-3" />
            Profile Settings
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Profile Photo */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-lg">
                  {getInitials(user?.user_metadata?.display_name)}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Password Change */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <Label className="text-sm font-medium">Change Password</Label>
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {newPassword && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePasswordChange}
                    disabled={!newPassword || !confirmPassword}
                  >
                    Update Password
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleUpdateProfile} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="ghost" onClick={handleSignOut} size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}