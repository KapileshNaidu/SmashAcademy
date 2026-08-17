#!/usr/bin/env node
/**
 * Apply supabase/migrations/*.sql via the Supabase Management API.
 *
 * The publishable and secret API keys cannot run DDL — they only reach
 * PostgREST. Executing SQL needs a personal access token (starts with `sbp_`)
 * from https://supabase.com/dashboard/account/tokens.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-migrations.mjs
 *
 * Files are applied in filename order, each as a single statement batch, so a
 * migration either lands whole or fails loudly with the server's error.
 */

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'zkhyesmbhyaphmyvneov';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error(
    'SUPABASE_ACCESS_TOKEN is not set.\n' +
      'Create one at https://supabase.com/dashboard/account/tokens, then:\n' +
      '  SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-migrations.mjs',
  );
  process.exit(1);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');

async function runSql(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();

if (files.length === 0) {
  console.error(`No .sql files found in ${migrationsDir}`);
  process.exit(1);
}

for (const file of files) {
  const sql = await readFile(join(migrationsDir, file), 'utf8');
  process.stdout.write(`→ ${file} … `);

  try {
    await runSql(sql);
    console.log('ok');
  } catch (error) {
    console.log('FAILED');
    console.error(`\n${error.message}\n`);
    process.exit(1);
  }
}

console.log(`\nApplied ${files.length} migration${files.length === 1 ? '' : 's'}.`);
