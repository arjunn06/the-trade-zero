// supabase/functions/ctrader-import/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { user_id, trading_account_id, access_token } = await req.json()

    if (!user_id || !trading_account_id || !access_token) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id, trading_account_id, or access_token' }),
        { status: 400 }
      )
    }

    // 1. Fetch trades from cTrader API
    const ctraderResponse = await fetch('https://api.spotware.com/trading/accounts/{your-account-id}/trades', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!ctraderResponse.ok) {
      const text = await ctraderResponse.text()
      return new Response(
        JSON.stringify({ error: 'Failed to fetch trades from cTrader', details: text }),
        { status: 502 }
      )
    }

    const { trades } = await ctraderResponse.json()

    if (!Array.isArray(trades)) {
      return new Response(JSON.stringify({ error: 'Trades format invalid' }), { status: 500 })
    }

    // 2. Format trades for Supabase insert
    const formattedTrades = trades.map((trade: any) => ({
      id: crypto.randomUUID(),
      user_id,
      trading_account_id,
      symbol: trade.symbol,
      volume: trade.volume,
      profit: trade.profit,
      side: trade.side, // assuming 'buy' or 'sell'
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      opened_at: new Date(trade.opened_at).toISOString(),
      closed_at: new Date(trade.closed_at).toISOString(),
    }))

    // 3. Insert into `trades` table
    const { error: insertError } = await supabaseClient
      .from('trades')
      .insert(formattedTrades)

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to insert trades', details: insertError.message }),
        { status: 500 }
      )
    }

    return new Response(JSON.stringify({ success: true, inserted: formattedTrades.length }), {
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: err.message }), {
      status: 500,
    })
  }
})