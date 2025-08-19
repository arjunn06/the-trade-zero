import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Analyze the image with GPT-4 Vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert trading screenshot analyzer. Extract trade details from trading platform screenshots (MT4, MT5, cTrader, TradingView, etc.).

Return a JSON object with the following structure:
{
  "symbol": "EURUSD" (currency pair or instrument),
  "trade_type": "long" or "short" (based on Buy/Sell),
  "entry_price": "1.2345" (entry price as string),
  "exit_price": "1.2400" (exit price if available),
  "quantity": "0.10" (lot size or position size),
  "stop_loss": "1.2300" (SL price if visible),
  "take_profit": "1.2500" (TP price if visible),
  "pnl": "100.50" (profit/loss amount if shown),
  "notes": "Additional context or platform info"
}

Only include fields that are clearly visible in the screenshot. If a field is not visible or unclear, omit it from the response. Be precise with numerical values.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this trading screenshot and extract the trade details. Focus on identifying: symbol/pair, trade direction (buy/sell), entry price, exit price (if closed), position size, stop loss, take profit, and P&L if visible.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('OpenAI response:', content);

    // Try to parse the JSON response
    let tradeData = null;
    try {
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        tradeData = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, try parsing the whole content
        tradeData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse trade data:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to extract structured trade data from image',
          rawResponse: content 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate and clean the extracted data
    const cleanedData: any = {};
    
    if (tradeData.symbol && typeof tradeData.symbol === 'string') {
      cleanedData.symbol = tradeData.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    
    if (tradeData.trade_type) {
      const type = tradeData.trade_type.toLowerCase();
      if (type.includes('buy') || type.includes('long')) {
        cleanedData.trade_type = 'long';
      } else if (type.includes('sell') || type.includes('short')) {
        cleanedData.trade_type = 'short';
      }
    }
    
    // Clean numerical fields
    ['entry_price', 'exit_price', 'quantity', 'stop_loss', 'take_profit', 'pnl'].forEach(field => {
      if (tradeData[field]) {
        const numStr = String(tradeData[field]).replace(/[^0-9.-]/g, '');
        if (numStr && !isNaN(parseFloat(numStr))) {
          cleanedData[field] = numStr;
        }
      }
    });
    
    if (tradeData.notes && typeof tradeData.notes === 'string') {
      cleanedData.notes = tradeData.notes.substring(0, 500); // Limit length
    }

    return new Response(
      JSON.stringify({ 
        tradeData: cleanedData,
        confidence: Object.keys(cleanedData).length > 2 ? 'high' : 'low'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-screenshot function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze screenshot', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});