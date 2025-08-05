import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface ZohoWebhookRequest {
  action: string
  user_email?: string
  trade_data?: {
    symbol: string
    trade_type: 'buy' | 'sell'
    entry_price: number
    quantity: number
    trading_account_name?: string
    strategy_name?: string
    stop_loss?: number
    take_profit?: number
    entry_date?: string
    notes?: string
    emotions?: string
  }
  query?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: ZohoWebhookRequest = await req.json()
    console.log('Received Zoho webhook payload:', JSON.stringify(payload, null, 2))

    const { action, user_email, trade_data, query } = payload

    switch (action) {
      case 'create_trade':
        return await handleCreateTrade(user_email, trade_data)
      
      case 'get_trading_accounts':
        return await handleGetTradingAccounts(user_email)
      
      case 'get_strategies':
        return await handleGetStrategies(user_email)
      
      case 'get_recent_trades':
        return await handleGetRecentTrades(user_email)
      
      case 'search_trades':
        return await handleSearchTrades(user_email, query)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Unknown action',
            available_actions: ['create_trade', 'get_trading_accounts', 'get_strategies', 'get_recent_trades', 'search_trades']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getUserByEmail(email: string) {
  if (!email) {
    throw new Error('Email is required')
  }

  // Get user from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', email)
    .single()

  if (profileError || !profile) {
    throw new Error('User not found with email: ' + email)
  }

  return profile.user_id
}

async function handleCreateTrade(user_email?: string, trade_data?: ZohoWebhookRequest['trade_data']) {
  try {
    if (!user_email || !trade_data) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: user_email and trade_data are required',
          chatbot_message: 'I need your email and trade details to create a trade entry. Please provide the symbol, trade type (buy/sell), entry price, and quantity.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = await getUserByEmail(user_email)

    // Validate required trade fields
    if (!trade_data.symbol || !trade_data.trade_type || !trade_data.entry_price || !trade_data.quantity) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required trade fields: symbol, trade_type, entry_price, quantity',
          chatbot_message: 'I need the following trade details: symbol, trade type (buy or sell), entry price, and quantity.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get or create trading account
    let trading_account_id = null
    if (trade_data.trading_account_name) {
      const { data: account } = await supabase
        .from('trading_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('name', trade_data.trading_account_name)
        .single()
      
      trading_account_id = account?.id
    }

    // If no specific account found, get user's first active account
    if (!trading_account_id) {
      const { data: accounts } = await supabase
        .from('trading_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)

      if (!accounts || accounts.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No trading accounts found',
            chatbot_message: 'You need to create a trading account first. Please set up your trading account in the dashboard.'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      trading_account_id = accounts[0].id
    }

    // Get strategy ID if provided
    let strategy_id = null
    if (trade_data.strategy_name) {
      const { data: strategy } = await supabase
        .from('strategies')
        .select('id')
        .eq('user_id', userId)
        .eq('name', trade_data.strategy_name)
        .eq('is_active', true)
        .single()
      
      strategy_id = strategy?.id
    }

    // Create the trade
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        user_id: userId,
        trading_account_id: trading_account_id,
        symbol: trade_data.symbol.toUpperCase(),
        trade_type: trade_data.trade_type,
        entry_price: trade_data.entry_price,
        quantity: trade_data.quantity,
        strategy_id: strategy_id,
        stop_loss: trade_data.stop_loss || null,
        take_profit: trade_data.take_profit || null,
        entry_date: trade_data.entry_date ? new Date(trade_data.entry_date).toISOString() : new Date().toISOString(),
        notes: trade_data.notes || null,
        emotions: trade_data.emotions || null,
        status: 'open',
        source: 'zoho_chatbot'
      })
      .select()
      .single()

    if (tradeError) {
      console.error('Trade creation error:', tradeError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create trade', 
          details: tradeError.message,
          chatbot_message: 'Sorry, I encountered an error while creating your trade. Please try again or contact support.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        trade: trade,
        chatbot_message: `Great! I've successfully created your ${trade_data.trade_type} trade for ${trade_data.symbol} at ${trade_data.entry_price}. Your trade ID is ${trade.id.substring(0, 8)}. The trade has been logged in your journal.`
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleCreateTrade:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        chatbot_message: 'I encountered an issue while processing your request. Please make sure you have a valid account and try again.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetTradingAccounts(user_email?: string) {
  try {
    if (!user_email) {
      return new Response(
        JSON.stringify({ 
          error: 'user_email is required',
          chatbot_message: 'I need your email to fetch your trading accounts.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = await getUserByEmail(user_email)

    const { data: accounts, error } = await supabase
      .from('trading_accounts')
      .select('id, name, broker, account_type, current_balance, current_equity, currency')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        accounts: accounts || [],
        chatbot_message: accounts && accounts.length > 0 
          ? `You have ${accounts.length} trading account(s): ${accounts.map(acc => `${acc.name} (${acc.broker})`).join(', ')}`
          : 'You don\'t have any active trading accounts yet. Please create one in your dashboard.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleGetTradingAccounts:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        chatbot_message: 'I couldn\'t fetch your trading accounts. Please check your email and try again.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetStrategies(user_email?: string) {
  try {
    if (!user_email) {
      return new Response(
        JSON.stringify({ 
          error: 'user_email is required',
          chatbot_message: 'I need your email to fetch your trading strategies.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = await getUserByEmail(user_email)

    const { data: strategies, error } = await supabase
      .from('strategies')
      .select('id, name, description, risk_per_trade, max_daily_risk')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        strategies: strategies || [],
        chatbot_message: strategies && strategies.length > 0 
          ? `You have ${strategies.length} trading strategy(ies): ${strategies.map(s => s.name).join(', ')}`
          : 'You don\'t have any active trading strategies yet. You can create strategies in your dashboard.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleGetStrategies:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        chatbot_message: 'I couldn\'t fetch your trading strategies. Please check your email and try again.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetRecentTrades(user_email?: string) {
  try {
    if (!user_email) {
      return new Response(
        JSON.stringify({ 
          error: 'user_email is required',
          chatbot_message: 'I need your email to fetch your recent trades.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = await getUserByEmail(user_email)

    const { data: trades, error } = await supabase
      .from('trades')
      .select(`
        id, symbol, trade_type, entry_price, exit_price, quantity, 
        status, entry_date, exit_date, pnl,
        trading_accounts(name),
        strategies(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      throw error
    }

    let message = ''
    if (!trades || trades.length === 0) {
      message = 'You don\'t have any trades yet. Start by creating your first trade!'
    } else {
      const openTrades = trades.filter(t => t.status === 'open').length
      const closedTrades = trades.filter(t => t.status === 'closed').length
      message = `Your last ${trades.length} trades: ${openTrades} open, ${closedTrades} closed. Most recent: ${trades[0].symbol} ${trades[0].trade_type} at ${trades[0].entry_price}`
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        trades: trades || [],
        chatbot_message: message
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleGetRecentTrades:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        chatbot_message: 'I couldn\'t fetch your recent trades. Please check your email and try again.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleSearchTrades(user_email?: string, query?: string) {
  try {
    if (!user_email) {
      return new Response(
        JSON.stringify({ 
          error: 'user_email is required',
          chatbot_message: 'I need your email to search your trades.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!query) {
      return new Response(
        JSON.stringify({ 
          error: 'query is required',
          chatbot_message: 'Please provide a search term (symbol, strategy name, or notes).'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = await getUserByEmail(user_email)

    const { data: trades, error } = await supabase
      .from('trades')
      .select(`
        id, symbol, trade_type, entry_price, exit_price, quantity, 
        status, entry_date, exit_date, pnl, notes,
        trading_accounts(name),
        strategies(name)
      `)
      .eq('user_id', userId)
      .or(`symbol.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      throw error
    }

    let message = ''
    if (!trades || trades.length === 0) {
      message = `No trades found matching "${query}". Try searching for a different symbol or keyword.`
    } else {
      message = `Found ${trades.length} trade(s) matching "${query}". ${trades.map(t => `${t.symbol} ${t.trade_type}`).join(', ')}`
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        trades: trades || [],
        query: query,
        chatbot_message: message
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleSearchTrades:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        chatbot_message: 'I couldn\'t search your trades. Please check your email and try again.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}