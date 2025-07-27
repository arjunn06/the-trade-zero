import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function runs every 15 minutes to sync all active cTrader connections
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting automatic cTrader sync for all connections...');

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active cTrader connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('ctrader_connections')
      .select(`
        *,
        trading_accounts!inner(
          id,
          name,
          user_id,
          is_active
        )
      `)
      .eq('trading_accounts.is_active', true);

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      throw connectionsError;
    }

    if (!connections || connections.length === 0) {
      console.log('No active cTrader connections found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active connections to sync',
          syncedAccounts: 0
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    console.log(`Found ${connections.length} active cTrader connections to sync`);

    const syncResults = [];
    let successCount = 0;
    let errorCount = 0;

    // Sync each connection
    for (const connection of connections) {
      try {
        console.log(`Syncing account: ${connection.account_number} (${connection.trading_account_id})`);

        // Check if the last sync was more than 10 minutes ago to avoid over-syncing
        const lastSync = connection.last_sync ? new Date(connection.last_sync) : new Date(0);
        const now = new Date();
        const timeSinceLastSync = now.getTime() - lastSync.getTime();
        const tenMinutes = 10 * 60 * 1000;

        if (timeSinceLastSync < tenMinutes) {
          console.log(`Skipping ${connection.account_number} - synced ${Math.round(timeSinceLastSync / 60000)} minutes ago`);
          continue;
        }

        // Call the sync function for this account
        const syncResult = await supabaseClient.functions.invoke('ctrader-sync', {
          body: {
            tradingAccountId: connection.trading_account_id,
            fullSync: false // Incremental sync for auto-sync
          },
        });

        if (syncResult.error) {
          console.error(`Sync failed for ${connection.account_number}:`, syncResult.error);
          errorCount++;
          syncResults.push({
            accountNumber: connection.account_number,
            status: 'error',
            error: syncResult.error.message
          });
        } else {
          console.log(`Sync successful for ${connection.account_number}`);
          successCount++;
          syncResults.push({
            accountNumber: connection.account_number,
            status: 'success',
            data: syncResult.data
          });
        }

        // Add a small delay between syncs to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error syncing ${connection.account_number}:`, error);
        errorCount++;
        syncResults.push({
          accountNumber: connection.account_number,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`Auto-sync completed: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Auto-sync completed: ${successCount} successful, ${errorCount} errors`,
        syncedAccounts: successCount,
        errors: errorCount,
        results: syncResults,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Auto-sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});