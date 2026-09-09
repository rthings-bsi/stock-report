const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gobcmaehhdktvyqbvfjv.supabase.co';
const supabaseKey = 'sb_publishable_s1kg9tR9lM_wk78udLj-ow_wJqzCB_M';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('users').insert([{
    username: 'testuser',
    password: '123',
    name: 'Test',
    role: 'viewer'
  }]);
  console.log('INSERT users:', data, error);
}
run();
