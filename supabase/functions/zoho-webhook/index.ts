import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface ZohoWebhookRequest {
  action: string
  user_email?: string
  session_id?: string
  selected_account_id?: string
  trade_data?: {
    symbol: string
    trade_type: 'buy' | 'sell'
    entry_price: number
    quantity: number
    trading_account_id?: string
    trading_account_name?: string
    strategy_name?: string
    stop_loss?: number
    take_profit?: number
    entry_date?: string
    notes?: string
    emotions?: string
  }
  query?: string
  trade_id?: string
  update_data?: {
    exit_price?: number
    exit_date?: string
    status?: 'open' | 'closed'
    notes?: string
    emotions?: string
    pnl?: number
  }
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

    const { action, user_email, trade_data, query, session_id, selected_account_id, trade_id, update_data } = payload

    switch (action) {
      case 'create_trade':
        return await handleCreateTrade(user_email, trade_data, selected_account_id)
      
      case 'get_trading_accounts':
        return await handleGetTradingAccounts(user_email, true) // true for dynamic buttons format
      
      case 'select_account':
        return await handleSelectAccount(user_email, selected_account_id, session_id)
      
      case 'get_strategies':
        return await handleGetStrategies(user_email)
      
      case 'get_recent_trades':
        return await handleGetRecentTrades(user_email)
      
      case 'search_trades':
        return await handleSearchTrades(user_email, query)
      
      case 'update_trade':
        return await handleUpdateTrade(user_email, trade_id, update_data)
      
      case 'close_trade':
        return await handleCloseTrade(user_email, trade_id, update_data)
      
      case 'get_account_summary':
        return await handleGetAccountSummary(user_email, selected_account_id)
      
      case 'get_quick_templates':
        return await handleGetQuickTemplates(user_email)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Unknown action',
            available_actions: [
              'create_trade', 'get_trading_accounts', 'select_account', 'get_strategies', 
              'get_recent_trades', 'search_trades', 'update_trade', 'close_trade',
              'get_account_summary', 'get_quick_templates'
            ]
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

async function handleCreateTrade(user_email?: string, trade_data?: ZohoWebhookRequest['trade_data'], selected_account_id?: string) {
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

    // Use selected account if provided (from session)
    let trading_account_id = selected_account_id
    
    if (!trading_account_id && trade_data.trading_account_id) {
      trading_account_id = trade_data.trading_account_id
    }
    
    if (!trading_account_id && trade_data.trading_account_name) {
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

async function handleGetTradingAccounts(user_email?: string, forGC = false) {
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

    // Format response for Zoho GC dynamic buttons if requested
    if (forGC && accounts && accounts.length > 0) {
      const gcButtons = accounts.map(account => ({
        text: `${account.name} - ${account.broker} (${account.currency}${account.current_balance})`,
        value: account.id,
        action: 'select_account'
      }))
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          accounts: accounts,
          gc_buttons: gcButtons,
          chatbot_message: 'Please select which trading account you want to use for journaling:',
          next_action: 'account_selection'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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

// New enhanced handlers for interactive trade journaling

async function handleSelectAccount(user_email?: string, selected_account_id?: string, session_id?: string) {
  try {
    if (!user_email || !selected_account_id) {
      return new Response(
        JSON.stringify({ 
          error: 'user_email and selected_account_id are required',
          chatbot_message: 'Please provide your email and select an account to continue.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = await getUserByEmail(user_email)

    // Verify the account belongs to the user
    const { data: account, error } = await supabase
      .from('trading_accounts')
      .select('id, name, broker, current_balance, currency')
      .eq('user_id', userId)
      .eq('id', selected_account_id)
      .eq('is_active', true)
      .single()

    if (error || !account) {
      return new Response(
        JSON.stringify({ 
          error: 'Account not found or access denied',
          chatbot_message: 'The selected account was not found or you don\'t have access to it.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        selected_account: account,
        session_id: session_id,
        chatbot_message: `Perfect! You've selected "${account.name}" (${account.broker}) with ${account.currency}${account.current_balance}. Now you can start journaling your trades. What would you like to do? You can: 📝 Create a new trade, 📊 View recent trades, or 🔍 Search your trade history.`,
        quick_actions: [
          { text: '📝 Create New Trade', action: 'create_trade_wizard' },
          { text: '📊 Recent Trades', action: 'get_recent_trades' },
          { text: '🔍 Search Trades', action: 'search_trades_prompt' },
          { text: '📈 Account Summary', action: 'get_account_summary' }
        ]
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleSelectAccount:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        chatbot_message: 'I encountered an issue while selecting your account. Please try again.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleUpdateTrade(user_email?: string, trade_id?: string, update_data?: ZohoWebhookRequest['update_data']) {
  try {
    if (!user_email || !trade_id || !update_data) {
      return new Response(
        JSON.stringify({ 
          error: 'user_email, trade_id, and update_data are required',
          chatbot_message: 'I need your email, trade ID, and update information to modify the trade.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = await getUserByEmail(user_email)

    // Verify the trade belongs to the user
    const { data: existingTrade, error: fetchError } = await supabase
      .from('trades')
      .select('id, symbol, trade_type, status')
      .eq('user_id', userId)
      .eq('id', trade_id)
      .single()

    if (fetchError || !existingTrade) {
      return new Response(
        JSON.stringify({ 
          error: 'Trade not found or access denied',
          chatbot_message: 'The trade you\'re trying to update was not found or you don\'t have access to it.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the trade
    const { data: updatedTrade, error: updateError } = await supabase
      .from('trades')
      .update({
        ...update_data,
        updated_at: new Date().toISOString()
      })
      .eq('id', trade_id)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Trade update error:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update trade', 
          details: updateError.message,
          chatbot_message: 'Sorry, I encountered an error while updating your trade. Please try again.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        trade: updatedTrade,
        chatbot_message: `✅ Successfully updated your ${existingTrade.symbol} ${existingTrade.trade_type} trade. The changes have been saved to your journal.`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleUpdateTrade:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        chatbot_message: 'I encountered an issue while updating your trade. Please check the trade ID and try again.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCloseTrade(user_email?: string, trade_id?: string, update_data?: ZohoWebhookRequest['update_data']) {
  try {
    if (!user_email || !trade_id) {
      return new Response(
        JSON.stringify({ 
          error: 'user_email and trade_id are required',
          chatbot_message: 'I need your email and trade ID to close the trade.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = await getUserByEmail(user_email)

    // Get the existing trade
    const { data: existingTrade, error: fetchError } = await supabase
      .from('trades')
      .select('id, symbol, trade_type, entry_price, quantity, status')
      .eq('user_id', userId)
      .eq('id', trade_id)
      .single()

    if (fetchError || !existingTrade) {
      return new Response(
        JSON.stringify({ 
          error: 'Trade not found or access denied',
          chatbot_message: 'The trade you\'re trying to close was not found or you don\'t have access to it.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingTrade.status === 'closed') {
      return new Response(
        JSON.stringify({ 
          error: 'Trade already closed',
          chatbot_message: `This ${existingTrade.symbol} trade is already closed.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate PnL if exit_price is provided
    let calculatedPnl = null
    if (update_data?.exit_price && existingTrade.entry_price && existingTrade.quantity) {
      const priceDiff = existingTrade.trade_type === 'buy' 
        ? update_data.exit_price - existingTrade.entry_price
        : existingTrade.entry_price - update_data.exit_price
      calculatedPnl = priceDiff * existingTrade.quantity
    }

    // Close the trade
    const { data: closedTrade, error: updateError } = await supabase
      .from('trades')
      .update({
        status: 'closed',
        exit_price: update_data?.exit_price || null,
        exit_date: update_data?.exit_date || new Date().toISOString(),
        pnl: update_data?.pnl || calculatedPnl,
        notes: update_data?.notes || existingTrade.notes,
        emotions: update_data?.emotions || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', trade_id)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Trade close error:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to close trade', 
          details: updateError.message,
          chatbot_message: 'Sorry, I encountered an error while closing your trade. Please try again.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pnlText = closedTrade.pnl 
      ? closedTrade.pnl > 0 
        ? `🟢 Profit: +$${Math.abs(closedTrade.pnl).toFixed(2)}`
        : `🔴 Loss: -$${Math.abs(closedTrade.pnl).toFixed(2)}`
      : ''

    return new Response(
      JSON.stringify({ 
        success: true, 
        trade: closedTrade,
        chatbot_message: `🏁 Successfully closed your ${existingTrade.symbol} ${existingTrade.trade_type} trade at ${closedTrade.exit_price || 'market price'}. ${pnlText} The trade has been updated in your journal.`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleCloseTrade:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        chatbot_message: 'I encountered an issue while closing your trade. Please check the trade ID and try again.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetAccountSummary(user_email?: string, selected_account_id?: string) {
  try {
    if (!user_email) {
      return new Response(
        JSON.stringify({ 
          error: 'user_email is required',
          chatbot_message: 'I need your email to get your account summary.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = await getUserByEmail(user_email)

    // Get account info
    let accountFilter = supabase
      .from('trading_accounts')
      .select('id, name, broker, current_balance, current_equity, currency, initial_balance')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (selected_account_id) {
      accountFilter = accountFilter.eq('id', selected_account_id)
    }

    const { data: accounts, error: accountError } = await accountFilter

    if (accountError || !accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No accounts found',
          chatbot_message: 'No trading accounts found. Please create an account first.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const account = accounts[0]

    // Get trade statistics for this account
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('pnl, status, trade_type, entry_date')
      .eq('user_id', userId)
      .eq('trading_account_id', account.id)

    if (tradesError) {
      console.error('Error fetching trades:', tradesError)
    }

    const tradeStats = trades || []
    const totalTrades = tradeStats.length
    const openTrades = tradeStats.filter(t => t.status === 'open').length
    const closedTrades = tradeStats.filter(t => t.status === 'closed').length
    const winningTrades = tradeStats.filter(t => t.status === 'closed' && (t.pnl || 0) > 0).length
    const losingTrades = tradeStats.filter(t => t.status === 'closed' && (t.pnl || 0) < 0).length
    const totalPnL = tradeStats.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const winRate = closedTrades > 0 ? ((winningTrades / closedTrades) * 100).toFixed(1) : '0'
    const netROI = ((account.current_balance - account.initial_balance) / account.initial_balance * 100).toFixed(2)

    const summary = `📊 **${account.name}** Summary (${account.broker})
💰 Balance: ${account.currency}${account.current_balance} | Equity: ${account.currency}${account.current_equity}
📈 Net ROI: ${netROI}% | Total P&L: ${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
📝 Trades: ${totalTrades} total (${openTrades} open, ${closedTrades} closed)
🎯 Win Rate: ${winRate}% (${winningTrades}W / ${losingTrades}L)`

    return new Response(
      JSON.stringify({ 
        success: true, 
        account_summary: {
          account,
          stats: {
            total_trades: totalTrades,
            open_trades: openTrades,
            closed_trades: closedTrades,
            winning_trades: winningTrades,
            losing_trades: losingTrades,
            win_rate: parseFloat(winRate),
            total_pnl: totalPnL,
            net_roi: parseFloat(netROI)
          }
        },
        chatbot_message: summary
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleGetAccountSummary:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        chatbot_message: 'I couldn\'t generate your account summary. Please try again.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetQuickTemplates(user_email?: string) {
  try {
    if (!user_email) {
      return new Response(
        JSON.stringify({ 
          error: 'user_email is required',
          chatbot_message: 'I need your email to get your quick trade templates.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = await getUserByEmail(user_email)

    // Get user's most traded symbols and strategies
    const { data: popularSymbols, error: symbolsError } = await supabase
      .from('trades')
      .select('symbol')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: strategies, error: strategiesError } = await supabase
      .from('strategies')
      .select('name, risk_per_trade')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(5)

    if (symbolsError || strategiesError) {
      console.error('Error fetching templates data:', symbolsError || strategiesError)
    }

    // Count symbol frequency
    const symbolCounts: Record<string, number> = {}
    popularSymbols?.forEach(trade => {
      symbolCounts[trade.symbol] = (symbolCounts[trade.symbol] || 0) + 1
    })

    const topSymbols = Object.entries(symbolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symbol]) => symbol)

    const templates = {
      popular_symbols: topSymbols,
      strategies: strategies || [],
      quick_actions: [
        { text: '🚀 Scalp Trade', symbol: 'EURUSD', quantity: 10000, notes: 'Quick scalp opportunity' },
        { text: '📈 Swing Position', symbol: 'GBPUSD', quantity: 50000, notes: 'Medium-term swing trade' },
        { text: '⚡ Breakout Trade', symbol: 'USDJPY', quantity: 25000, notes: 'Breakout above resistance' }
      ]
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        templates,
        chatbot_message: `Here are your quick trade templates based on your trading history:
📊 Most traded: ${topSymbols.slice(0, 3).join(', ')}
🎯 Active strategies: ${strategies?.map(s => s.name).join(', ') || 'None set up yet'}

Use these templates to quickly create trades with your preferred settings!`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handleGetQuickTemplates:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        chatbot_message: 'I couldn\'t fetch your quick templates. Please try again.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }