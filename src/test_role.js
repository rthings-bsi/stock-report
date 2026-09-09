const db = require('better-sqlite3')('./data/warehouse.db');

try {
  const checkExisting = db.prepare('SELECT id FROM roles WHERE LOWER(key) = ?').get('op_rtp');
  console.log('Exists:', checkExisting);

  const result = db.prepare(`
    INSERT INTO roles (key, name, description, color, is_system, permissions)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run('op_rtp', 'Retrnable Packaging', 'contoh', 'sky', '{}');
  console.log('Result:', result);
} catch (e) {
  console.error('Error:', e);
}
