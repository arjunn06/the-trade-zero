import { WelcomeScreen } from '@/components/WelcomeScreen';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Welcome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleComplete = async () => {
    if (!user) return;

    try {
      // Mark onboarding as completed in database
      const { error } = await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating onboarding status:', error);
        toast({
          title: "Error",
          description: "Failed to save onboarding progress. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Keep localStorage as backup for session consistency
      localStorage.setItem('welcome-completed', 'true');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error", 
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  return <WelcomeScreen onComplete={handleComplete} />;
};

export default Welcome;