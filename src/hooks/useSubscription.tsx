import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionContextType {
  isLoading: boolean;
  isPremium: boolean;
  subscriptionTier: string;
  subscriptionEnd: string | null;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState('basic');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const checkSubscription = async () => {
    if (!user?.email) {
      setIsLoading(false);
      setIsPremium(false);
      setSubscriptionTier('basic');
      setSubscriptionEnd(null);
      return;
    }

    try {
      setIsLoading(true);

      const email = user.email.toLowerCase().trim();

      const { data, error } = await supabase
        .from('subscribers')
        .select('subscribed, subscription_tier, subscription_end')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Error checking subscription:', error);
        // Do not downgrade on error — keep current state
        return;
      }

      if (data) {
        console.log('Fetched subscription data:', data);

        // Parse subscription_end in UTC correctly
        const now = new Date();
        const endDate = data.subscription_end
          ? new Date(data.subscription_end + 'Z')
          : null;

        const isActive = Boolean(
          data.subscribed &&
          (!endDate || endDate > now)
        );

        setIsPremium(isActive);
        setSubscriptionTier(data.subscription_tier || 'basic');
        setSubscriptionEnd(data.subscription_end);

      } else {
        // No row found — only insert if not existing, don’t overwrite
        console.log('No subscription row found, creating basic entry.');
        const { error: insertError } = await supabase
          .from('subscribers')
          .insert({
            user_id: user.id,
            email,
            subscribed: false,
            subscription_tier: 'basic',
            subscription_end: null
          });

        if (insertError) {
          console.error('Error creating subscription entry:', insertError);
        }

        setIsPremium(false);
        setSubscriptionTier('basic');
        setSubscriptionEnd(null);
      }

    } catch (err) {
      console.error('Unexpected error in checkSubscription:', err);
      // Do not force downgrade if something blows up
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user]);

  // Auto-check every 5 min
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <SubscriptionContext.Provider value={{
      isLoading,
      isPremium,
      subscriptionTier,
      subscriptionEnd,
      checkSubscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}