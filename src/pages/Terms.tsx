import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowLeft } from 'lucide-react';

const Terms = () => {
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
        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Trade Journal ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of Trade Journal per device for personal, non-commercial transitory viewing only.
          </p>
          <ul>
            <li>This is the grant of a license, not a transfer of title</li>
            <li>Under this license you may not modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to reverse engineer any software contained on the website</li>
          </ul>

          <h2>3. User Accounts</h2>
          <p>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account.
          </p>

          <h2>4. Trading Data</h2>
          <p>
            You retain ownership of all trading data you input into the Service. We will not share, sell, or distribute your trading data to third parties without your explicit consent.
          </p>

          <h2>5. Service Availability</h2>
          <p>
            We strive to maintain 99.9% uptime but cannot guarantee uninterrupted service. The Service may be temporarily unavailable for maintenance, updates, or due to technical issues beyond our control.
          </p>

          <h2>6. Payment Terms</h2>
          <p>
            Subscription fees are billed in advance on a monthly basis. All fees are non-refundable except as required by law or as specified in our Refund Policy.
          </p>

          <h2>7. Prohibited Uses</h2>
          <p>You may not use our Service:</p>
          <ul>
            <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
            <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
            <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
            <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
            <li>To submit false or misleading information</li>
          </ul>

          <h2>8. Termination</h2>
          <p>
            We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever including breach of Terms.
          </p>

          <h2>9. Disclaimer</h2>
          <p>
            The information on this website is provided on an "as is" basis. To the fullest extent permitted by law, this Company excludes all representations, warranties, conditions and terms.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            In no event shall Trade Journal, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, punitive, consequential, or special damages.
          </p>

          <h2>11. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website. Your continued use of the Service constitutes acceptance of the updated terms.
          </p>

          <h2>12. Contact Information</h2>
          <p>
            If you have any questions about these Terms and Conditions, please contact us at support@tradejournal.com.
          </p>

          <p className="text-sm text-muted-foreground mt-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Terms;