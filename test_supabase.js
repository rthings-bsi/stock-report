const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gobcmaehhdktvyqbvfjv.supabase.co';
const supabaseKey = 'sb_publishable_s1kg9tR9lM_wk78udLj-ow_wJqzCB_M';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log('GET users:', data, error);
}
run();
