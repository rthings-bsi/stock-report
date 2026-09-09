const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gobcmaehhdktvyqbvfjv.supabase.co';
const supabaseKey = 'sb_publishable_s1kg9tR9lM_wk78udLj-ow_wJqzCB_M';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('users').insert([{
    username: 'newuser123',
    password: 'password',
    name: 'New User',
    role: 'staff'
  }]);
  console.log('INSERT:', data, error);
}
run();
