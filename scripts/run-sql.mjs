// scripts/run-sql.mjs
// Runs SQL against the project DB via the Supabase Management API.
// Usage: node --env-file=.env.local scripts/run-sql.mjs path/to/file.sql
//    or: node --env-file=.env.local scripts/run-sql.mjs --query "select now()"
// Token: SUPABASE_ACCESS_TOKEN (PAT). Project ref is fixed below.

import { readFileSync } from 'node:fs';

const REF = 'kqlfvwlzayinngrgafec';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN in env'); process.exit(1); }

const arg = process.argv[2];
if (!arg) { console.error('Pass a .sql file path or --query "<sql>"'); process.exit(1); }
const query = arg === '--query' ? process.argv.slice(3).join(' ') : readFileSync(arg, 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});

const text = await res.text();
if (!res.ok) { console.error(`HTTP ${res.status}:`, text); process.exit(1); }
console.log(text);
