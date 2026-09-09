const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gobcmaehhdktvyqbvfjv.supabase.co';
const supabaseKey = 'sb_publishable_s1kg9tR9lM_wk78udLj-ow_wJqzCB_M';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const payload = {
    snapshot_key: 'test_snap',
    last_updated: 'now',
    pipe_capacities: [],
    fast_slow_data: [],
    coil_strip_data: [],
    nc_warehouse_data: [],
    nc_items: [],
    loo_st_data: [],
    loo_lt_data: [],
    unfifo_data: [],
    unfifo_coil_data: [],
    unfifo_pipe_data: [],
    damaged_packaging_data: [],
    incoming_packaging_data: [],
    customer_breakdown: {}
  };
  const { data, error } = await supabase.from('warehouse_snapshots').upsert(payload, { onConflict: 'snapshot_key' });
  console.log('UPSERT snap:', data, error);
}
run();
