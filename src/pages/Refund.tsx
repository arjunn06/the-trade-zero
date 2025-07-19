import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowLeft } from 'lucide-react';

const Refund = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Trade Journal</span>
          </div>
          <Button variant="outline" asChild>
            <a href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </a>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Refund Policy</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          
          <h2>30-Day Money-Back Guarantee</h2>
          <p>
            We stand behind our service and offer a 30-day money-back guarantee for all new Professional plan subscriptions. If you're not completely satisfied with Trade Journal within the first 30 days of your subscription, we'll provide a full refund.
          </p>

          <h2>Eligibility Requirements</h2>
          <p>To be eligible for a refund, the following conditions must be met:</p>
          <ul>
            <li>Refund request must be made within 30 days of initial subscription</li>
            <li>Account must be in good standing with no violations of our Terms of Service</li>
            <li>Request must be made by the original account holder</li>
            <li>Account must not have exceeded reasonable usage limits during the refund period</li>
          </ul>

          <h2>What's Not Covered</h2>
          <p>The following are not eligible for refunds:</p>
          <ul>
            <li>Requests made after the 30-day period</li>
            <li>Partial month refunds (we do not prorate subscriptions)</li>
            <li>Free plan accounts (no payment made)</li>
            <li>Accounts terminated for Terms of Service violations</li>
            <li>Duplicate or fraudulent accounts</li>
            <li>Subscriptions obtained through promotional codes or special offers (unless explicitly stated)</li>
          </ul>

          <h2>How to Request a Refund</h2>
          <p>To request a refund:</p>
          <ol>
            <li>Contact our support team at support@tradejournal.com</li>
            <li>Include your account email address and subscription details</li>
            <li>Provide a brief reason for the refund request</li>
            <li>Our team will review your request within 2-3 business days</li>
          </ol>

          <h2>Refund Processing</h2>
          <p>
            Once approved, refunds will be processed back to the original payment method within 5-10 business days. The exact timing depends on your bank or credit card company's processing times.
          </p>

          <h2>Account Access</h2>
          <p>
            Upon refund approval, your account will be immediately downgraded to the free plan. All data will be preserved, but premium features will no longer be accessible.
          </p>

          <h2>Subscription Cancellation</h2>
          <p>
            You can cancel your subscription at any time without penalty. Cancellation stops future billing but does not trigger an automatic refund for the current billing period. You'll continue to have access to premium features until the end of your current billing cycle.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We reserve the right to modify this refund policy at any time. Changes will be effective immediately upon posting. The updated policy will apply to all new subscriptions and renewals after the change date.
          </p>

          <h2>Dispute Resolution</h2>
          <p>
            If you're not satisfied with our response to your refund request, you may contact your credit card company or payment provider to dispute the charge. However, we encourage you to contact us first to resolve any issues.
          </p>

          <h2>Contact Information</h2>
          <p>
            For refund requests or questions about this policy, please contact us at:
          </p>
          <ul>
            <li>Email: support@tradejournal.com</li>
            <li>Response time: 2-3 business days</li>
          </ul>

          <p className="text-sm text-muted-foreground mt-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Refund;