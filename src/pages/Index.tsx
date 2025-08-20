import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RazorpayPayment } from '@/components/RazorpayPayment';
import { TrendingUp, BarChart3, Shield, Calendar, Check, Star, ArrowRight, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="relative z-50 border-b border-border/20 backdrop-blur-md bg-background/80">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <TrendingUp className="h-8 w-8 text-brand-blue" />
              <div className="absolute inset-0 bg-brand-blue/20 rounded-full blur-lg"></div>
            </div>
            <span className="font-bold text-2xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">TheTradeZero</span>
          </div>
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="lg" asChild className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300">
              <a href="/auth">Sign In</a>
            </Button>
            <Button asChild className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 border-0">
              <a href="/auth">Get Started Free</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        <GeometricElements />
        
        {/* Parallax Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-brand-blue/10 to-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-40 right-10 w-96 h-96 bg-gradient-to-l from-primary/5 to-brand-blue/5 rounded-full blur-3xl" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <section className="container mx-auto px-6 py-32 lg:py-40 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Left Content */}
            <div className="relative z-10">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-brand-blue/10 to-primary/10 border border-brand-blue/20">
                  <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-brand-blue">Professional Trading Journal</span>
                </div>
                
                <h1 className="text-6xl lg:text-8xl font-extrabold leading-none tracking-tight">
                  <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
                    Trading journal
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-brand-blue to-primary bg-clip-text text-transparent">
                    for professionals
                  </span>
                </h1>
                
                <p className="text-2xl lg:text-3xl text-muted-foreground/90 leading-relaxed font-light">
                  The best way to track your trades instead of spreadsheets.
                  <br />
                  <span className="text-foreground/70">Analyze performance and improve your strategy at scale.</span>
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6 pt-4">
                  <Button size="lg" className="group bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary h-14 px-10 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-500 border-0" asChild>
                    <a href="/auth">
                      Get Started Free
                      <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-semibold border-2 border-border hover:border-brand-blue/50 hover:bg-brand-blue/5 backdrop-blur-sm transition-all duration-300" asChild>
                    <a href="/auth">View Demo</a>
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Content - Dashboard Preview */}
            <div className="relative lg:transform lg:translate-y-8 lg:hover:translate-y-0 transition-transform duration-700">
              <div className="relative z-10 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500">
                {/* Mock Dashboard Header */}
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Dashboard Overview</h3>
                  <div className="flex gap-3">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-400 to-red-500 shadow-lg"></div>
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-lg"></div>
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 shadow-lg"></div>
                  </div>
                </div>

                {/* Mock Stats Cards */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-muted/80 to-muted/40 backdrop-blur-sm rounded-xl p-6 border border-border/30 hover:border-brand-blue/30 transition-all duration-300">
                    <div className="text-sm text-muted-foreground mb-2">Total P&L</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">+$12,345</div>
                    <div className="text-sm text-green-500 font-medium">+23.4%</div>
                  </div>
                  <div className="bg-gradient-to-br from-muted/80 to-muted/40 backdrop-blur-sm rounded-xl p-6 border border-border/30 hover:border-brand-blue/30 transition-all duration-300">
                    <div className="text-sm text-muted-foreground mb-2">Win Rate</div>
                    <div className="text-3xl font-bold text-foreground">68.5%</div>
                    <div className="text-sm text-muted-foreground">142/207 trades</div>
                  </div>
                </div>

                {/* Mock Chart */}
                <div className="bg-gradient-to-br from-muted/60 to-muted/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-border/20">
                  <div className="flex items-end justify-between h-24 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-brand-blue to-brand-blue/60 rounded-lg flex-1 hover:from-brand-blue/80 hover:to-brand-blue/40 transition-all duration-300"
                        style={{ 
                          height: `${Math.random() * 70 + 30}%`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      ></div>
                    ))}
                  </div>
                </div>

                {/* Mock Recent Trades */}
                <div className="space-y-3">
                  <div className="text-lg font-semibold mb-4 text-foreground">Recent Trades</div>
                  {[
                    { symbol: 'EURUSD', pnl: '+$234', time: '2h ago', positive: true },
                    { symbol: 'GBPJPY', pnl: '-$89', time: '4h ago', positive: false },
                    { symbol: 'USDJPY', pnl: '+$156', time: '6h ago', positive: true }
                  ].map((trade, i) => (
                    <div key={i} className="flex items-center justify-between bg-gradient-to-r from-muted/60 to-muted/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-border/20 hover:border-brand-blue/30 transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${trade.positive ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-red-400 to-red-500'} shadow-lg`}></div>
                        <span className="text-base font-semibold text-foreground">{trade.symbol}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-base font-bold ${trade.positive ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.pnl}
                        </span>
                        <span className="text-sm text-muted-foreground/80">{trade.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enhanced Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/30 to-primary/20 rounded-3xl blur-3xl transform scale-110 -z-10 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-l from-primary/20 to-brand-blue/30 rounded-3xl blur-2xl transform scale-105 -z-20" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-32 relative">
          {/* Parallax Background */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-to-r from-brand-blue/10 to-primary/10 rounded-full blur-3xl transform translate-y-12"></div>
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-l from-primary/5 to-brand-blue/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="text-center mb-20 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-brand-blue/10 to-primary/10 border border-brand-blue/20 mb-6">
              <Star className="w-4 h-4 text-brand-blue" />
              <span className="text-sm font-medium text-brand-blue">Professional Features</span>
            </div>
            <h2 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Everything you need to scale</h2>
            <p className="text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Professional tools for serious traders who want to understand and improve their performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            <div className="group p-8 rounded-3xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm hover:from-card/90 hover:to-card/60 transition-all duration-500 hover:border-brand-blue/50 hover:shadow-2xl hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue/20 to-brand-blue/10 flex items-center justify-center mb-6 group-hover:from-brand-blue/30 group-hover:to-brand-blue/20 transition-all duration-300 group-hover:scale-110">
                <TrendingUp className="h-8 w-8 text-brand-blue" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">Advanced Tracking</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Log every detail with precision. Entry, exit, P&L, risk, and more with our comprehensive trade journal.
              </p>
            </div>

            <div className="group p-8 rounded-3xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm hover:from-card/90 hover:to-card/60 transition-all duration-500 hover:border-brand-blue/50 hover:shadow-2xl hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue/20 to-brand-blue/10 flex items-center justify-center mb-6 group-hover:from-brand-blue/30 group-hover:to-brand-blue/20 transition-all duration-300 group-hover:scale-110">
                <BarChart3 className="h-8 w-8 text-brand-blue" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">Performance Analytics</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Deep insights into your trading patterns with advanced metrics, win rates, and drawdown analysis.
              </p>
            </div>

            <div className="group p-8 rounded-3xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm hover:from-card/90 hover:to-card/60 transition-all duration-500 hover:border-brand-blue/50 hover:shadow-2xl hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue/20 to-brand-blue/10 flex items-center justify-center mb-6 group-hover:from-brand-blue/30 group-hover:to-brand-blue/20 transition-all duration-300 group-hover:scale-110">
                <Calendar className="h-8 w-8 text-brand-blue" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">Visual P&L Calendar</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Track daily, weekly, and monthly performance with our intuitive calendar interface.
              </p>
            </div>

            <div className="group p-8 rounded-3xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm hover:from-card/90 hover:to-card/60 transition-all duration-500 hover:border-brand-blue/50 hover:shadow-2xl hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue/20 to-brand-blue/10 flex items-center justify-center mb-6 group-hover:from-brand-blue/30 group-hover:to-brand-blue/20 transition-all duration-300 group-hover:scale-110">
                <Shield className="h-8 w-8 text-brand-blue" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">Risk Management</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Built-in risk monitoring with drawdown alerts and position sizing recommendations.
              </p>
            </div>

            <div className="group p-8 rounded-3xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm hover:from-card/90 hover:to-card/60 transition-all duration-500 hover:border-brand-blue/50 hover:shadow-2xl hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue/20 to-brand-blue/10 flex items-center justify-center mb-6 group-hover:from-brand-blue/30 group-hover:to-brand-blue/20 transition-all duration-300 group-hover:scale-110">
                <Zap className="h-8 w-8 text-brand-blue" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">Multi-Account Support</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Manage multiple trading accounts and strategies from a single unified dashboard.
              </p>
            </div>

            <div className="group p-8 rounded-3xl border-2 border-brand-blue/30 bg-gradient-to-br from-brand-blue/5 to-primary/5 backdrop-blur-sm hover:from-brand-blue/10 hover:to-primary/10 transition-all duration-500 hover:border-brand-blue/50 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/10 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue/30 to-primary/20 flex items-center justify-center mb-6 group-hover:from-brand-blue/40 group-hover:to-primary/30 transition-all duration-300 group-hover:scale-110">
                  <TrendingUp className="h-8 w-8 text-brand-blue" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-3">
                  Smart Analytics
                  <span className="text-xs px-3 py-1 bg-gradient-to-r from-brand-blue to-primary text-white rounded-full font-medium">Pro</span>
                </h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  Advanced pattern recognition and performance optimization recommendations powered by intelligent algorithms.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl border border-border bg-card">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <p className="text-muted-foreground mb-6">Perfect for getting started with trading journaling</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Up to 50 trades per month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Basic performance analytics</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>P&L calendar view</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>1 trading account</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Basic risk management</span>
                </li>
              </ul>
              
              <Button className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/10 hover:from-muted-foreground/30 hover:to-muted-foreground/20 text-foreground border border-border/50 hover:border-brand-blue/30 transition-all duration-300" asChild>
                <a href="/auth">Get Started Free</a>
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl border-2 border-brand-blue bg-card relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-brand-blue text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  Most Popular
                </div>
              </div>
              
              <h3 className="text-2xl font-bold mb-2">Professional</h3>
              <p className="text-muted-foreground mb-6">Advanced features for serious traders</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">$10</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Unlimited trades</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Advanced analytics & reports</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Multiple trading accounts</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>AI Screenshot Analysis</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Advanced risk management</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Export & backup</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Priority support</span>
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
                  setTimeout(() => {
                    window.location.href = '/dashboard';
                  }, 2000);
                }}
                onError={(error) => {
                  console.error('Payment error:', error);
                }}
              >
                <div className="w-full h-14 flex items-center justify-center text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg border-0">
                  Start Professional Plan
                </div>
              </RazorpayPayment>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="container mx-auto px-6 py-32 relative">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/5 to-primary/5 rounded-3xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-blue/10 via-transparent to-primary/10 rounded-3xl"></div>
          
          <div className="text-center max-w-4xl mx-auto relative z-10">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-brand-blue/20 to-primary/20 border border-brand-blue/30 backdrop-blur-sm">
                <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse"></div>
                <span className="font-medium text-brand-blue">Join Thousands of Professional Traders</span>
              </div>
              
              <h2 className="text-5xl lg:text-7xl font-extrabold leading-tight">
                <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Ready to scale</span>
                <br />
                <span className="bg-gradient-to-r from-brand-blue to-primary bg-clip-text text-transparent">your trading?</span>
              </h2>
              
              <p className="text-2xl lg:text-3xl text-muted-foreground leading-relaxed font-light max-w-3xl mx-auto">
                Join professional traders who trust <span className="font-semibold bg-gradient-to-r from-brand-blue to-primary bg-clip-text text-transparent">TheTradeZero</span> to track, analyze, and improve their performance.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
                <Button size="lg" className="group h-16 px-12 text-xl font-bold bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary shadow-2xl hover:shadow-3xl transition-all duration-500 border-0" asChild>
                  <a href="/auth">
                    Create Free Account
                    <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform duration-300" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="h-16 px-12 text-xl font-bold border-2 border-border hover:border-brand-blue/50 hover:bg-brand-blue/5 backdrop-blur-sm transition-all duration-300" asChild>
                  <a href="/auth">Sign In</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/20 bg-gradient-to-b from-background to-muted/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="relative">
                <TrendingUp className="h-6 w-6 text-brand-blue" />
                <div className="absolute inset-0 bg-brand-blue/20 rounded-full blur-lg"></div>
              </div>
              <span className="font-bold text-2xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">TheTradeZero</span>
            </div>
            <p className="text-center text-muted-foreground text-lg max-w-md mx-auto">
              Professional trading journal platform for serious traders.
            </p>
            <div className="flex justify-center gap-8 text-base">
              <a href="/terms" className="text-muted-foreground hover:text-brand-blue transition-colors duration-300">Terms & Conditions</a>
              <a href="/refund" className="text-muted-foreground hover:text-brand-blue transition-colors duration-300">Refund Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
