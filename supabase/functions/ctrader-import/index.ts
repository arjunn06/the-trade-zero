import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("ctrader-import triggered");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication failed", authError);
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    console.log("Authenticated user:", user.id);

    const { tradingAccountId, fromDate, toDate } = await req.json();
    console.log("Import params:", { tradingAccountId, fromDate, toDate });

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from("ctrader_connections")
      .select("*")
      .eq("trading_account_id", tradingAccountId)
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      console.error("Connection not found", connError);
      return new Response("No cTrader connection", { status: 400, headers: corsHeaders });
    }

    // Fetch trades from cTrader API (mocked for now)
    const trades = await fetchTradesFromCTraderAPI(connection.access_token, connection.account_number, fromDate, toDate);
    console.log(`Fetched ${trades.length} trades`);

    // Insert trades
    for (const trade of trades) {
      const tradeData = {
        trading_account_id: tradingAccountId,
        user_id: user.id,
        external_id: trade.id,
        symbol: trade.symbol,
        trade_type: trade.side.toLowerCase(),
        quantity: trade.volume,
        entry_price: trade.openPrice,
        entry_date: new Date(trade.openTime).toISOString(),
        close_price: trade.closePrice ?? null,
        close_date: trade.closeTime ? new Date(trade.closeTime).toISOString() : null,
        pnl: trade.pnl,
        commission: trade.commission,
        swap: trade.swap,
        status: 'closed',
        notes: 'Imported from cTrader',
        source: 'ctrader',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("trades")
        .upsert(tradeData, { onConflict: 'external_id' });

      if (error) {
        console.error(`Failed to insert trade ${trade.id}:`, error);
      }
    }

    return new Response(JSON.stringify({ success: true, tradesCount: trades.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("ctrader-import error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Mock API for now
async function fetchTradesFromCTraderAPI(accessToken: string, accountNumber: string, from: string, to: string) {
  console.log("Simulating fetchTradesFromCTraderAPI", { from, to });
  // Replace this with actual cTrader HTTP or WebSocket implementation
  return [
    {
      id: `mock_${Date.now()}`,
      symbol: "EURUSD",
      side: "BUY",
      volume: 0.1,
      openPrice: 1.2345,
      closePrice: 1.2375,
      openTime: Date.now() - 3 * 24 * 60 * 60 * 1000,
      closeTime: Date.now() - 2 * 24 * 60 * 60 * 1000,
      pnl: 30,
      commission: -2,
      swap: -1
    }
  ];
}