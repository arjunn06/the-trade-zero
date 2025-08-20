import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RazorpayPayment } from '@/components/RazorpayPayment';
import { TrendingUp, BarChart3, Shield, Calendar, Check, Star, ArrowRight, Zap, Users, Award, Target, Sparkles, Play, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { GeometricElements } from '@/components/GeometricElements.tsx';

const Index = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  // Load Zoho chatbot script
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://gc.zohopublic.in/org/60021522321/flows/581000000900001/embed/script';
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
    
    // Log payment integration info only in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Zoho Payment Integration:', { plan, amount, user: user.id });
    }
  };

  // Redirect authenticated users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-brand-blue rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-r from-primary to-brand-blue p-2 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <span className="font-bold text-2xl bg-gradient-to-r from-primary via-brand-blue to-primary bg-clip-text text-transparent">
              TheTradeZero
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
          </nav>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="lg" asChild className="text-muted-foreground hover:text-foreground transition-all duration-300">
              <a href="/auth">Sign In</a>
            </Button>
            <Button asChild className="bg-gradient-to-r from-primary to-brand-blue text-white hover:shadow-lg hover:shadow-primary/25 transition-all duration-300">
              <a href="/auth">Get Started Free</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative pt-20">
        <GeometricElements />
        
        {/* Enhanced Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-40 left-20 w-96 h-96 bg-gradient-to-r from-primary/20 to-brand-blue/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-60 right-20 w-[500px] h-[500px] bg-gradient-to-l from-brand-blue/15 to-primary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        <section className="container mx-auto px-6 py-20 lg:py-32 relative">
          <div className="text-center max-w-6xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 to-brand-blue/10 border border-primary/20 backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary">Trusted by 10,000+ Professional Traders</span>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold leading-none tracking-tight">
              <span className="block bg-gradient-to-r from-foreground to-foreground/90 bg-clip-text text-transparent">
                Transform Your
              </span>
              <span className="block bg-gradient-to-r from-primary via-brand-blue to-primary bg-clip-text text-transparent">
                Trading Performance
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-4xl mx-auto font-light">
              The most advanced trading journal built for serious traders. Track every trade, 
              analyze patterns, and optimize your strategy with professional-grade analytics.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
              <Button size="lg" className="group bg-gradient-to-r from-primary to-brand-blue text-white hover:shadow-2xl hover:shadow-primary/25 h-16 px-12 text-lg font-bold transition-all duration-500 hover:-translate-y-1" asChild>
                <a href="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="group h-16 px-12 text-lg font-bold border-2 border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300" asChild>
                <a href="#demo" className="flex items-center gap-3">
                  <Play className="w-5 h-5" />
                  Watch Demo
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="container mx-auto px-6 py-32 relative">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Start free, scale when ready
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              No hidden fees, no long-term contracts. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="group bg-gradient-to-br from-card to-card/80 rounded-3xl p-8 border border-border/50 transition-all duration-300">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2 text-foreground">Starter</h3>
                <p className="text-muted-foreground mb-6">Perfect for getting started</p>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground text-lg">/month</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Up to 50 trades per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Basic performance analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">P&L calendar view</span>
                </li>
              </ul>
              
              <Button className="w-full h-14 text-lg font-semibold" variant="outline" asChild>
                <a href="/auth">Get Started Free</a>
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="group relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-primary to-brand-blue text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                  <Star className="h-4 w-4" />
                  Most Popular
                </div>
              </div>
              <div className="relative bg-gradient-to-br from-card to-card/90 rounded-3xl p-8 border-2 border-primary/50 transition-all duration-300">
                <div className="text-center mb-8 pt-4">
                  <h3 className="text-2xl font-bold mb-2 text-foreground">Professional</h3>
                  <p className="text-muted-foreground mb-6">For serious traders</p>
                  <div className="mb-2">
                    <span className="text-5xl font-bold bg-gradient-to-r from-primary to-brand-blue bg-clip-text text-transparent">$19</span>
                    <span className="text-muted-foreground text-lg">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">Unlimited trades</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">Advanced analytics & reports</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">Multiple trading accounts</span>
                  </li>
                </ul>
                
                <RazorpayPayment 
                  plan="professional" 
                  amount={19}
                  onSuccess={() => {
                    toast({
                      title: "Payment Successful!",
                      description: "Welcome to Professional plan! Redirecting to dashboard...",
                    });
                    setTimeout(() => {
                      window.location.href = '/dashboard';
                    }, 2000);
                  }}
                  onError={(error) => {
                    console.error('Payment error:', error);
                  }}
                >
                  <div className="w-full h-14 flex items-center justify-center text-lg font-bold bg-gradient-to-r from-primary to-brand-blue text-white rounded-lg">
                    Start Free Trial
                  </div>
                </RazorpayPayment>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-border/10 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-6 py-20">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="relative">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <span className="font-bold text-2xl bg-gradient-to-r from-primary to-brand-blue bg-clip-text text-transparent">
                TheTradeZero
              </span>
            </div>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Professional trading journal platform for serious traders.
            </p>
            <div className="flex justify-center gap-8 text-base">
              <a href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</a>
              <a href="/refund" className="text-muted-foreground hover:text-primary transition-colors">Refund Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;