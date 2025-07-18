import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { TrendingUp, BarChart3, Shield, Calendar } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

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
            <span className="font-bold text-xl">Trade Journal</span>
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
            Professional Trading Journal
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
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="font-semibold">Trade Journal</span>
          </div>
          <p className="text-center text-muted-foreground mt-2">
            Professional trading journal platform for serious traders.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
