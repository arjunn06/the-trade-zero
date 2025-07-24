import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RazorpayPayment } from '@/components/RazorpayPayment';
import { TrendingUp, BarChart3, Shield, Calendar, Check, Star } from 'lucide-react';
import { useEffect } from 'react';

const Index = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  // Load Zoho chatbot script
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://gc.zohopublic.in/org/60021522321/flows/581000000885913/embed/script';
    script.defer = true;
    script.setAttribute('nonce', '{place_your_nonce_value_here}');
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Handle payment integration with Zoho payments
  const handlePayment = (plan: string, amount: number) => {
    // For now, redirect to auth for registration
    // This will be replaced with Zoho payments integration
    if (!user) {
      // Redirect to auth with plan information
      window.location.href = `/auth?plan=${plan}&amount=${amount}`;
      return;
    }
    
    // TODO: Integrate with Zoho payments API
    // This is where Zoho payment integration will be implemented
    toast({
      title: "Payment Integration Coming Soon",
      description: `${plan} plan ($${amount}/month) will be integrated with Zoho payments.`,
    });
    
    console.log('Zoho Payment Integration:', { plan, amount, user: user.id });
  };

  // Redirect authenticated users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">The Trade Zero</span>
          </div>
          <Button asChild>
            <a href="/auth">Get Started</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            The Trade Zero
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Track your trades, analyze performance, and improve your trading strategy with our comprehensive journal platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="/auth">Start Trading Journal</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/auth">Sign In</a>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-24">
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Trade Tracking</h3>
            <p className="text-muted-foreground">
              Log all your trades with detailed entry and exit information, including P&L tracking.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Performance Analytics</h3>
            <p className="text-muted-foreground">
              Comprehensive dashboard with win rates, profit/loss analysis, and performance metrics.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Strategy Management</h3>
            <p className="text-muted-foreground">
              Create and manage trading strategies with confluence checklists and rules.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">P&L Calendar</h3>
            <p className="text-muted-foreground">
              Visual calendar view of your daily, weekly, and monthly trading performance.
            </p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free and upgrade as your trading grows. All plans include our core features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-card border rounded-lg p-8 relative">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Starter</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground mb-8">Perfect for getting started with trading journaling</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Up to 50 trades per month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Basic performance analytics</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>P&L calendar view</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>1 trading account</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Basic confluence checklist</span>
                </li>
              </ul>
              
              <Button className="w-full" asChild>
                <a href="/auth">Get Started Free</a>
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="bg-card border rounded-lg p-8 relative border-primary">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  Most Popular
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Professional</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$10</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground mb-8">Advanced features for serious traders</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Unlimited trades</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Advanced analytics & reports</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Multiple trading accounts</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Custom strategies & rules</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Advanced confluence system</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Trade screenshots & notes</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Export & backup</span>
                </li>
              </ul>
              
              <RazorpayPayment 
                plan="professional" 
                amount={10}
                onSuccess={() => {
                  toast({
                    title: "Payment Successful!",
                    description: "Welcome to Professional plan! Redirecting to dashboard...",
                  });
                  // Small delay to show the success message
                  setTimeout(() => {
                    window.location.href = '/dashboard';
                  }, 2000);
                }}
                onError={(error) => {
                  console.error('Payment error:', error);
                }}
              >
                Start Professional Plan
              </RazorpayPayment>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-24">
          <div className="bg-card border rounded-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to improve your trading?</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of traders who use our platform to track, analyze, and improve their trading performance.
            </p>
            <Button size="lg" asChild>
              <a href="/auth">Create Free Account</a>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="font-semibold">The Trade Zero</span>
          </div>
          <p className="text-center text-muted-foreground mb-4">
            Professional trading journal platform for serious traders.
          </p>
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <a href="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</a>
            <a href="/refund" className="hover:text-foreground transition-colors">Refund Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
