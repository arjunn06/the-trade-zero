import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface RazorpayPaymentProps {
  plan: string;
  amount: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  plan,
  amount,
  onSuccess,
  onError,
  children,
  disabled = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue with payment",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay SDK");
      }

      // Create order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-payment', {
        body: { plan, amount }
      });

      if (orderError) throw orderError;
      if (!orderData) throw new Error("Failed to create payment order");

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TradeJournal Pro",
        description: `${plan} Plan Subscription`,
        order_id: orderData.orderId,
        prefill: {
          name: user.user_metadata?.display_name || user.email?.split('@')[0] || '',
          email: user.email,
        },
        theme: {
          color: "#3B82F6"
        },
        handler: async (response: any) => {
          try {
            // Verify payment
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: plan
              }
            });

            if (verifyError) throw verifyError;

            toast({
              title: "Payment Successful!",
              description: `Welcome to ${plan} plan! Your subscription is now active.`,
            });

            onSuccess?.();
          } catch (verificationError) {
            console.error('Payment verification failed:', verificationError);
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support with your payment ID: " + response.razorpay_payment_id,
              variant: "destructive"
            });
            onError?.("Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast({
              title: "Payment Cancelled",
              description: "You can try again anytime",
            });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : "Payment failed";
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePayment} 
      disabled={disabled || loading}
      className="w-full"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        children
      )}
    </Button>
  );
};