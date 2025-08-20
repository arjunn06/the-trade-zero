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
    console.log('Analyze screenshot function called');
    const { image, openai_api_key } = await req.json();
    
    console.log('Request data received - has image:', !!image, 'has key:', !!openai_api_key);
    
    if (!image) {
      console.error('No image provided');
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!openai_api_key) {
      console.error('No OpenAI API key provided');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Making request to OpenAI API...');

    // Analyze the image with GPT-4 Vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openai_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert trading screenshot analyzer. Extract trade details from trading platform screenshots (MT4, MT5, cTrader, TradingView, etc.).

Look for these specific patterns in screenshots:
- Symbol/Pair: Often at the top (e.g., "EURUSD")
- Direction: "buy" or "sell" keywords, or analyze price movement arrows
- Quantity/Lot size: Numbers with decimal places near buy/sell
- Entry price: First price in sequences like "1.16842 → 1.16795"
- Exit price: Second price after arrow (→)
- Entry/Exit times: Timestamps in format like "2025.08.18 11:20:01"
- S/L (Stop Loss): Usually labeled as "S/L:" followed by price
- T/P (Take Profit): Usually labeled as "T/P:" followed by price
- P&L: Profit/Loss amount, often in red (negative) or green (positive)
- Swap: Overnight fees
- Charges/Commission: Trading fees

Return a JSON object with this exact structure:
{
  "symbol": "EURUSD",
  "trade_type": "long",
  "entry_price": "1.16842",
  "exit_price": "1.16795",
  "quantity": "0.09",
  "stop_loss": "1.16795",
  "take_profit": "1.17032",
  "pnl": "-4.23",
  "entry_time": "2025.08.18 11:20:01",
  "exit_time": "2025.08.18 11:55:56",
  "swap": "0",
  "charges": "-0.63",
  "notes": "Extracted from trading platform screenshot"
}

CRITICAL: Only include fields that are clearly visible. Use exact numerical values as shown. For trade_type, use "long" for buy orders and "short" for sell orders.`
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

    console.log('OpenAI API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      let errorMessage = 'OpenAI API error';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || 'API request failed';
      } catch {
        errorMessage = `API returned ${response.status}: ${errorText}`;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const data = await response.json();
    console.log('OpenAI response received, processing...');
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
    ['entry_price', 'exit_price', 'quantity', 'stop_loss', 'take_profit', 'pnl', 'swap', 'charges'].forEach(field => {
      if (tradeData[field]) {
        const numStr = String(tradeData[field]).replace(/[^0-9.-]/g, '');
        if (numStr && !isNaN(parseFloat(numStr))) {
          cleanedData[field] = numStr;
        }
      }
    });
    
    // Clean time fields
    ['entry_time', 'exit_time'].forEach(field => {
      if (tradeData[field] && typeof tradeData[field] === 'string') {
        cleanedData[field] = tradeData[field].trim();
      }
    });
    
    if (tradeData.notes && typeof tradeData.notes === 'string') {
      cleanedData.notes = tradeData.notes.substring(0, 500); // Limit length
    }

    console.log('Analysis completed successfully, returning data');
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});