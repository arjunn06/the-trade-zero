
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NewTrade from "./pages/NewTrade";
import Trades from "./pages/Trades";
import TradeDetail from "./pages/TradeDetail";
import TradingAccounts from "./pages/TradingAccounts";
import Strategies from "./pages/Strategies";
import Notes from "./pages/Notes";
import Calendar from "./pages/Calendar";
import Confluence from "./pages/Confluence";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import Upgrade from "./pages/Upgrade";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Welcome from "./pages/Welcome";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="trade-zero-theme">
      <TooltipProvider>
        <AuthProvider>
          <SubscriptionProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/welcome" element={
              <ProtectedRoute>
                <Welcome />
              </ProtectedRoute>
            } />
            <Route path="/trades" element={<ProtectedRoute><Trades /></ProtectedRoute>} />
            <Route path="/trades/:id" element={<ProtectedRoute><TradeDetail /></ProtectedRoute>} />
            <Route path="/trades/new" element={<ProtectedRoute><NewTrade /></ProtectedRoute>} />
            <Route path="/trades/edit/:id" element={<ProtectedRoute><NewTrade /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
            <Route path="/accounts" element={<ProtectedRoute><TradingAccounts /></ProtectedRoute>} />
            <Route path="/strategies" element={<ProtectedRoute><Strategies /></ProtectedRoute>} />
            <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
            <Route path="/confluence" element={<ProtectedRoute><Confluence /></ProtectedRoute>} />
            <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-cancel" element={<PaymentCancel />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
