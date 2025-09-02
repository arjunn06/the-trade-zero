import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RazorpayPayment } from '@/components/RazorpayPayment';
import { TrendingUp, BarChart3, Shield, Calendar, Check, Star, Brain, ArrowRight, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GeometricElements } from '@/components/GeometricElements.tsx';
const Index = () => {
  const {
    user,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();

  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      description: `${plan} plan ($${amount}/month) will be integrated with Zoho payments.`
    });

    // Log payment integration info only in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Zoho Payment Integration:', {
        plan,
        amount,
        user: user.id
      });
    }
  };

  // Redirect authenticated users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <div className="min-h-screen bg-background text-foreground dark">
      {/* Header */}
      <header className="relative z-50 border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-brand-blue" />
            <span className="font-bold text-xl">TheTradeZero</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground rounded-lg">
              <a href="/auth">Sign In</a>
            </Button>
            <Button asChild className="bg-white text-black hover:bg-white/90 rounded-lg text-sm font-medium">
              <a href="/auth">Get Started</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Preview - Top Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div 
          className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-blue/5 to-transparent"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        />
        <div className="container mx-auto px-6">
          <div className="relative max-w-3xl mx-auto">
            <div 
              className="relative z-10 bg-card border border-border rounded-2xl p-8 shadow-2xl"
              style={{ transform: `translateY(${scrollY * -0.05}px)` }}
            >
              {/* Mock Dashboard Header */}
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-semibold">Dashboard Overview</h3>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>

              {/* Mock Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-muted/50 rounded-xl p-6">
                  <div className="text-sm text-muted-foreground mb-2">Total P&L</div>
                  <div className="text-2xl font-bold text-success">+$12,345</div>
                  <div className="text-sm text-success">+23.4%</div>
                </div>
                <div className="bg-muted/50 rounded-xl p-6">
                  <div className="text-sm text-muted-foreground mb-2">Win Rate</div>
                  <div className="text-2xl font-bold">68.5%</div>
                  <div className="text-sm text-muted-foreground">142/207 trades</div>
                </div>
                <div className="bg-muted/50 rounded-xl p-6">
                  <div className="text-sm text-muted-foreground mb-2">Avg. Win</div>
                  <div className="text-2xl font-bold">$289</div>
                  <div className="text-sm text-muted-foreground">vs -$156 avg loss</div>
                </div>
              </div>

              {/* Mock Chart */}
              <div className="bg-muted/30 rounded-xl p-6 mb-6">
                <div className="flex items-end justify-between h-32 gap-2">
                  {Array.from({
                  length: 16
                }).map((_, i) => <div key={i} className="bg-brand-blue/60 rounded-sm flex-1" style={{
                  height: `${Math.random() * 80 + 20}%`
                }}></div>)}
                </div>
              </div>

              {/* Mock Recent Trades */}
              <div className="space-y-3">
                <div className="text-base font-medium mb-4">Recent Trades</div>
                {[{
                symbol: 'EURUSD',
                pnl: '+$234',
                time: '2h ago',
                type: 'Long'
              }, {
                symbol: 'GBPJPY', 
                pnl: '-$89',
                time: '4h ago',
                type: 'Short'
              }, {
                symbol: 'USDJPY',
                pnl: '+$156',
                time: '6h ago',
                type: 'Long'
              }].map((trade, i) => <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-brand-blue rounded-full"></div>
                      <div>
                        <span className="font-medium">{trade.symbol}</span>
                        <span className="text-sm text-muted-foreground ml-2">{trade.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${trade.pnl.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                        {trade.pnl}
                      </span>
                      <span className="text-sm text-muted-foreground">{trade.time}</span>
                    </div>
                  </div>)}
              </div>
            </div>

            {/* Background Glow with parallax */}
            <div 
              className="absolute inset-0 bg-brand-blue/20 rounded-2xl blur-3xl transform scale-110 -z-10"
              style={{ transform: `translateY(${scrollY * -0.03}px) scale(1.1)` }}
            ></div>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <main className="relative">
        <GeometricElements />
        
        <section className="container mx-auto px-6 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div 
              className="space-y-8"
              style={{ transform: `translateY(${scrollY * 0.02}px)` }}
            >
              <h1 className="text-5xl lg:text-7xl font-cirka mb-8 leading-[0.9] font-light tracking-tight">
                Trading journal
                <br />
                <span className="text-muted-foreground">for professionals</span>
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground mb-12 leading-relaxed font-normal max-w-2xl mx-auto">
                The best way to track your trades instead of spreadsheets.
                Deliver professional analytics and insights at scale.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 h-12 px-6 text-sm font-medium rounded-lg border-0" asChild>
                  <a href="/auth">
                    Get Started
                  </a>
                </Button>
                <Button size="lg" variant="ghost" className="h-12 px-6 text-sm font-medium rounded-lg text-white hover:bg-white/10" asChild>
                  <a href="/auth">Login</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-cirka font-light mb-6 leading-tight">Everything you need to scale</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Professional tools for serious traders who want to understand and improve their performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group p-6 rounded-2xl border border-border bg-card hover:bg-card/80 transition-all duration-300 hover:border-brand-blue/50">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/20 flex items-center justify-center mb-4 group-hover:bg-brand-blue/30 transition-colors">
                <TrendingUp className="h-6 w-6 text-brand-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Advanced Tracking</h3>
              <p className="text-muted-foreground leading-relaxed">
                Log every detail with precision. Entry, exit, P&L, risk, and more with our comprehensive trade journal.
              </p>
            </div>

            <div className="group p-6 rounded-2xl border border-border bg-card hover:bg-card/80 transition-all duration-300 hover:border-brand-blue/50">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/20 flex items-center justify-center mb-4 group-hover:bg-brand-blue/30 transition-colors">
                <BarChart3 className="h-6 w-6 text-brand-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Performance Analytics</h3>
              <p className="text-muted-foreground leading-relaxed">
                Deep insights into your trading patterns with advanced metrics, win rates, and drawdown analysis.
              </p>
            </div>

            <div className="group p-6 rounded-2xl border border-border bg-card hover:bg-card/80 transition-all duration-300 hover:border-brand-blue/50">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/20 flex items-center justify-center mb-4 group-hover:bg-brand-blue/30 transition-colors">
                <TrendingUp className="h-6 w-6 text-brand-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                Powerful Confluence Tool
                <span className="text-xs px-2 py-1 bg-brand-blue/20 text-brand-blue rounded-full">Pro</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Advanced pattern recognition and market confluence analysis to identify A+ trading setups with precision.
              </p>
            </div>

            <div className="group p-6 rounded-2xl border border-border bg-card hover:bg-card/80 transition-all duration-300 hover:border-brand-blue/50">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/20 flex items-center justify-center mb-4 group-hover:bg-brand-blue/30 transition-colors">
                <Calendar className="h-6 w-6 text-brand-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Visual P&L Calendar</h3>
              <p className="text-muted-foreground leading-relaxed">
                Track daily, weekly, and monthly performance with our intuitive calendar interface.
              </p>
            </div>

            <div className="group p-6 rounded-2xl border border-border bg-card hover:bg-card/80 transition-all duration-300 hover:border-brand-blue/50">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/20 flex items-center justify-center mb-4 group-hover:bg-brand-blue/30 transition-colors">
                <Shield className="h-6 w-6 text-brand-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Risk Management</h3>
              <p className="text-muted-foreground leading-relaxed">
                Built-in risk monitoring with drawdown alerts and position sizing recommendations.
              </p>
            </div>

            <div className="group p-6 rounded-2xl border border-border bg-card hover:bg-card/80 transition-all duration-300 hover:border-brand-blue/50">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/20 flex items-center justify-center mb-4 group-hover:bg-brand-blue/30 transition-colors">
                <Zap className="h-6 w-6 text-brand-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Multi-Account Support</h3>
              <p className="text-muted-foreground leading-relaxed">
                Manage multiple trading accounts and strategies from a single unified dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-cirka font-light mb-6 leading-tight">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Start free and scale as you grow. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl border border-border bg-card">
              <h3 className="text-2xl font-cirka font-light mb-2">Starter</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">Perfect for getting started with trading journaling</p>
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
              
              <Button className="w-full h-12 text-sm font-medium bg-white text-black hover:bg-white/90 rounded-lg" asChild>
                <a href="/auth">Get Started</a>
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
              
              <h3 className="text-2xl font-cirka font-light mb-2">Professional</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">Advanced features for serious traders</p>
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
              
              <RazorpayPayment plan="professional" amount={10} onSuccess={() => {
              toast({
                title: "Payment Successful!",
                description: "Welcome to Professional plan! Redirecting to dashboard..."
              });
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 2000);
            }} onError={error => {
              console.error('Payment error:', error);
            }}>
                <div className="w-full h-12 flex items-center justify-center text-base font-medium">
                  Start Professional Plan
                </div>
              </RazorpayPayment>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="container mx-auto px-6 py-24">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">Ready to scale your trading?</h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">Join professional traders who trust TheTradeZero to track, analyze, and improve their performance.</p>
            <Button size="lg" className="h-12 px-8 text-base font-medium" asChild>
              <a href="/auth">
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-brand-blue" />
            <span className="font-semibold text-lg">TheTradeZero</span>
          </div>
          <p className="text-center text-muted-foreground mb-6">
            Professional trading journal platform for serious traders.
          </p>
          <div className="flex justify-center gap-8 text-sm">
            <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</a>
            <a href="/refund" className="text-muted-foreground hover:text-foreground transition-colors">Refund Policy</a>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;