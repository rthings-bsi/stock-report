const fs = require('fs');
let code = fs.readFileSync('src/lib/db.ts', 'utf8');

code = code.replace(
  "Database = require('better-sqlite3');",
  "// Hide from Next.js/Webpack static analyzer to prevent Serverless crashes\n  Database = eval(\"require('better-sqlite3')\");"
);

fs.writeFileSync('src/lib/db.ts', code);
