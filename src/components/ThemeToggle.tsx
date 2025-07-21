import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/providers/ThemeProvider';
interface ThemeToggleProps {
  collapsed?: boolean;
}
export function ThemeToggle({
  collapsed
}: ThemeToggleProps) {
  const {
    theme,
    setTheme
  } = useTheme();
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  if (collapsed) {
    return <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>;
  }
  return <Button variant="ghost" onClick={toggleTheme} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent px-[4px] mx-0 my-0 py-[4px]">
      <Sun className="h-4 w-4 mr-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 ml-[1.75rem] -translate-x-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      
    </Button>;
}