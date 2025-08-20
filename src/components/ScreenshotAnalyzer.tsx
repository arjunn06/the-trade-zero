import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, Camera, Brain, Loader2, CheckCircle, Key, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { PremiumFeature } from './PremiumFeature';

interface ExtractedTradeData {
  symbol?: string;
  trade_type?: 'long' | 'short';
  entry_price?: string;
  exit_price?: string;
  quantity?: string;
  stop_loss?: string;
  take_profit?: string;
  pnl?: string;
  notes?: string;
}

interface ScreenshotAnalyzerProps {
  onDataExtracted: (data: ExtractedTradeData) => void;
  className?: string;
}

export function ScreenshotAnalyzer({ onDataExtracted, className }: ScreenshotAnalyzerProps) {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Load saved API key on mount
  useState(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  });

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleAnalyzeClick = () => {
    if (!selectedFile) {
      toast({
        title: "No image selected",
        description: "Please select a screenshot to analyze",
        variant: "destructive"
      });
      return;
    }
    
    // If we have a saved API key, use it directly
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey && savedKey.startsWith('sk-')) {
      setApiKey(savedKey);
      analyzeScreenshot(savedKey);
    } else {
      setShowApiKeyDialog(true);
    }
  };

  const analyzeScreenshot = async (providedKey?: string) => {
    const key = providedKey || apiKey.trim();
    if (!key) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to analyze screenshots",
        variant: "destructive"
      });
      return;
    }
    if (!key.startsWith('sk-')) {
      toast({
        title: "Invalid API Key",
        description: "The key should start with 'sk-'. Please paste a valid OpenAI API key.",
        variant: "destructive"
      });
      return;
    }

    // Save the API key for future use
    localStorage.setItem('openai_api_key', key);

    setAnalyzing(true);
    setShowApiKeyDialog(false);

    try {
      // Convert image to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(selectedFile);
      });

      // Call our edge function for analysis with the user's API key
      const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
        body: { 
          image: base64,
          openai_api_key: key
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to analyze screenshot');
      }

      const result = data as any;
      
      if (result?.tradeData) {
        onDataExtracted(result.tradeData);
        toast({
          title: "Analysis complete",
          description: "Trade details extracted successfully!",
        });
        // Don't clear the API key since we're storing it
      } else if (result?.error) {
        throw new Error(result.error);
      } else {
        toast({
          title: "No trade data found",
          description: "Could not extract trade details from this image",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error analyzing screenshot:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze the screenshot. Please try again.";
      toast({
        title: "Analysis failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <PremiumFeature 
      feature="AI Screenshot Analyzer" 
      description="Automatically extract trade details from screenshots using AI"
      className={className}
    >
      <Card className={cn("screenshot-analyzer", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5" />
            AI Screenshot Analyzer
            <span className="ml-auto text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">Premium</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById('screenshot-upload')?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              id="screenshot-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            
            {previewUrl ? (
              <div className="space-y-3">
                <img
                  src={previewUrl}
                  alt="Screenshot preview"
                  className="max-w-full max-h-48 mx-auto rounded-lg shadow-sm"
                />
                <p className="text-sm text-muted-foreground">
                  {selectedFile?.name}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Drop your trading screenshot here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports: MT4, MT5, cTrader, TradingView, and other platforms
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Button */}
          <Button
            onClick={handleAnalyzeClick}
            disabled={!selectedFile || analyzing}
            className="w-full"
            size="lg"
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Screenshot...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Extract Trade Details
              </>
            )}
          </Button>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">AI can extract:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Symbol/Currency pair</li>
              <li>Entry & Exit prices</li>
              <li>Position size/Quantity</li>
              <li>Stop Loss & Take Profit</li>
              <li>P&L amount</li>
              <li>Trade direction (Buy/Sell)</li>
            </ul>
          </div>

          {/* API Key Dialog */}
          <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  OpenAI API Key Required
                </DialogTitle>
                <DialogDescription>
                  Enter your OpenAI API key to run the AI analysis. It is used once and never stored.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">How to get your OpenAI API Key:</p>
                  <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                    <li>Visit <Button variant="link" className="h-auto p-0 text-xs" asChild>
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                        OpenAI Platform <ExternalLink className="h-3 w-3 ml-1 inline" />
                      </a>
                    </Button></li>
                    <li>Sign in or create an OpenAI account</li>
                    <li>Click "Create new secret key"</li>
                    <li>Copy the API key (starts with "sk-")</li>
                    <li>Add credits to your OpenAI account if needed</li>
                  </ol>
                </div>
                
                <div>
                  <Label htmlFor="api-key">Your OpenAI API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your API key is stored locally and only used for analysis
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowApiKeyDialog(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => analyzeScreenshot()}
                    disabled={!apiKey.trim()}
                    className="flex-1"
                  >
                    Analyze Screenshot
                  </Button>
                  <Button
                    onClick={() => {
                      localStorage.removeItem('openai_api_key');
                      setApiKey('');
                      toast({
                        title: "API Key cleared",
                        description: "Your stored API key has been removed"
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs px-2"
                  >
                    Clear Key
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </PremiumFeature>
  );
}