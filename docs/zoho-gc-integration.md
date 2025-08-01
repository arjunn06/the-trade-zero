# Zoho Guided Conversations (GC) Integration for Trade Journaling

This integration allows users to interact with their trade journal through a Zoho Desk Guided Conversations chatbot using webhook blocks.

## Webhook Endpoint

**URL**: `https://dynibyqrcbxneiwjyahn.functions.supabase.co/zoho-webhook`
**Method**: POST
**Authentication**: None (public endpoint)

## Supported Actions

### 1. Create Trade
Creates a new trade entry in the user's journal.

**Request Format:**
```json
{
  "action": "create_trade",
  "user_email": "user@example.com",
  "trade_data": {
    "symbol": "EURUSD",
    "trade_type": "buy",
    "entry_price": 1.0850,
    "quantity": 100000,
    "trading_account_name": "Live Account",
    "strategy_name": "Breakout Strategy",
    "stop_loss": 1.0800,
    "take_profit": 1.0900,
    "entry_date": "2025-01-01T10:30:00Z",
    "notes": "Strong breakout above resistance",
    "emotions": "Confident"
  }
}
```

**Response:**
```json
{
  "success": true,
  "trade": {
    "id": "uuid",
    "symbol": "EURUSD",
    "trade_type": "buy",
    "entry_price": 1.0850,
    "quantity": 100000,
    "status": "open",
    "created_at": "2025-01-01T10:30:00Z"
  },
  "chatbot_message": "Great! I've successfully created your buy trade for EURUSD at 1.0850. Your trade ID is 12345678. The trade has been logged in your journal."
}
```

### 2. Get Trading Accounts
Retrieves user's active trading accounts.

**Request Format:**
```json
{
  "action": "get_trading_accounts",
  "user_email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": "uuid",
      "name": "Live Account",
      "broker": "MetaTrader 5",
      "account_type": "live",
      "current_balance": 10000.00,
      "current_equity": 10500.00,
      "currency": "USD"
    }
  ],
  "chatbot_message": "You have 1 trading account(s): Live Account (MetaTrader 5)"
}
```

### 3. Get Strategies
Retrieves user's active trading strategies.

**Request Format:**
```json
{
  "action": "get_strategies",
  "user_email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "strategies": [
    {
      "id": "uuid",
      "name": "Breakout Strategy",
      "description": "Trading breakouts above key resistance levels",
      "risk_per_trade": 2.0,
      "max_daily_risk": 6.0
    }
  ],
  "chatbot_message": "You have 1 trading strategy(ies): Breakout Strategy"
}
```

### 4. Get Recent Trades
Retrieves user's 10 most recent trades.

**Request Format:**
```json
{
  "action": "get_recent_trades",
  "user_email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "trades": [
    {
      "id": "uuid",
      "symbol": "EURUSD",
      "trade_type": "buy",
      "entry_price": 1.0850,
      "exit_price": null,
      "quantity": 100000,
      "status": "open",
      "entry_date": "2025-01-01T10:30:00Z",
      "exit_date": null,
      "pnl": null,
      "trading_accounts": { "name": "Live Account" },
      "strategies": { "name": "Breakout Strategy" }
    }
  ],
  "chatbot_message": "Your last 10 trades: 1 open, 0 closed. Most recent: EURUSD buy at 1.0850"
}
```

### 5. Search Trades
Searches trades by symbol, notes, or other criteria.

**Request Format:**
```json
{
  "action": "search_trades",
  "user_email": "user@example.com",
  "query": "EURUSD"
}
```

**Response:**
```json
{
  "success": true,
  "trades": [
    {
      "id": "uuid",
      "symbol": "EURUSD",
      "trade_type": "buy",
      "entry_price": 1.0850,
      "exit_price": null,
      "quantity": 100000,
      "status": "open",
      "entry_date": "2025-01-01T10:30:00Z",
      "notes": "Strong breakout above resistance",
      "trading_accounts": { "name": "Live Account" },
      "strategies": { "name": "Breakout Strategy" }
    }
  ],
  "query": "EURUSD",
  "chatbot_message": "Found 1 trade(s) matching \"EURUSD\". EURUSD buy"
}
```

## Error Handling

All endpoints return appropriate error messages with chatbot-friendly responses:

```json
{
  "error": "User not found with email: user@example.com",
  "chatbot_message": "I couldn't find an account with that email. Please make sure you've registered and try again."
}
```

## Setting up in Zoho GC

1. **Create a Webhook Block** in your Guided Conversations flow
2. **Set the URL** to: `https://dynibyqrcbxneiwjyahn.functions.supabase.co/zoho-webhook`
3. **Set Method** to POST
4. **Add Headers**:
   - Content-Type: application/json
5. **Configure the Request Body** based on the action you want to perform
6. **Use the `chatbot_message`** from the response to provide user feedback

## Example Chatbot Flow

1. **User says**: "Create a buy trade for EURUSD"
2. **Bot collects**: Symbol, trade type, entry price, quantity
3. **Bot asks**: "What's your email address?"
4. **Bot calls webhook** with create_trade action
5. **Bot responds** with the chatbot_message from the API response

## Required Data

- **User Email**: Must match the email in the user's profile
- **Trading Account**: User must have at least one active trading account
- **Required Trade Fields**: symbol, trade_type, entry_price, quantity
- **Optional Fields**: strategy_name, stop_loss, take_profit, notes, emotions

## Notes

- The webhook automatically maps strategy names to strategy IDs
- If no specific trading account is provided, it uses the user's first active account
- All trades created through the chatbot are marked with `source: 'zoho_chatbot'`
- The endpoint is public (no JWT required) but validates users by email
- Trade symbols are automatically converted to uppercase