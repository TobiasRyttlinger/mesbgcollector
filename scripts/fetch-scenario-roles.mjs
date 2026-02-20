/**
 * fetch-scenario-roles.mjs
 *
 * Pre-fetches detailed scenario faction/role data from the sbginventory API
 * for all 561 scenarios and writes the result to src/data/scenarios_roles.json.
 *
 * Run once:  node scripts/fetch-scenario-roles.mjs
 *
 * The output file maps scenario_id → scenario_factions[] (with roles).
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const API_BASE = 'https://homely-uncomfortable-wreckfish.gigalixirapp.com/api/scenarios';
const BATCH_SIZE = 10;      // concurrent requests per batch
const DELAY_MS   = 300;     // ms between batches to be polite

// Read all scenario IDs from the local file
const scenariosRaw = JSON.parse(
  readFileSync(join(ROOT, 'src/data/scenarios_req.json'), 'utf8')
);
const ids = scenariosRaw.data.map(s => s.id);
console.log(`Fetching role data for ${ids.length} scenarios…`);

async function fetchScenario(id) {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for scenario ${id}`);
  const json = await res.json();
  const factions = json.data?.scenario_factions ?? [];
  return { id, factions };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const result = {};
let done = 0;
let failed = [];

for (let i = 0; i < ids.length; i += BATCH_SIZE) {
  const batch = ids.slice(i, i + BATCH_SIZE);
  const settled = await Promise.allSettled(batch.map(fetchScenario));

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      const { id, factions } = outcome.value;
      result[id] = factions;
      done++;
    } else {
      const idIndex = batch[settled.indexOf(outcome)];
      console.warn(`  ✗ Failed: scenario ${idIndex} — ${outcome.reason?.message}`);
      failed.push(idIndex);
    }
  }

  const pct = Math.round(((i + batch.length) / ids.length) * 100);
  process.stdout.write(`\r  Progress: ${i + batch.length}/${ids.length} (${pct}%)`);

  if (i + BATCH_SIZE < ids.length) {
    await sleep(DELAY_MS);
  }
}

console.log(`\n\nDone. ${done} fetched, ${failed.length} failed.`);
if (failed.length) {
  console.log('Failed IDs:', failed.join(', '));
}

const outPath = join(ROOT, 'src/data/scenarios_roles.json');
writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log(`\nWritten to ${outPath}`);
