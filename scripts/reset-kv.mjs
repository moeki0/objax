import fs from 'node:fs';
import path from 'node:path';
import { kv } from '@vercel/kv';

function loadDotEnv() {
  try {
    const p = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(p)) return;
    const txt = fs.readFileSync(p, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i <= 0) continue;
      const key = line.slice(0, i).trim();
      let val = line.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {}
}

loadDotEnv();

async function flushKV() {
  const report = {
    worlds: 0,
    worldUrls: 0,
    worldThingSets: 0,
    worldThings: 0,
    legacyObjects: 0,
    legacyObjectsSet: 0,
    stateKeys: 0,
  };

  // Worlds and their data
  try {
    const worldIds = (await kv.zrange('worlds:z', 0, -1)) ?? [];
    for (const wid of worldIds) {
      try {
        const wKey = `world:${wid}`;
        const world = await kv.get(wKey);
        if (world?.url) {
          await kv.del(`world:url:${world.url}`);
          report.worldUrls++;
        }
        const setKey = `world:${wid}:z`;
        const thingIds = (await kv.zrange(setKey, 0, -1)) ?? [];
        for (const tid of thingIds) {
          await kv.del(`world:${wid}:object:${tid}`);
          report.worldThings++;
        }
        await kv.del(setKey);
        report.worldThingSets++;
        await kv.del(wKey);
        report.worlds++;
      } catch {}
    }
    await kv.del('worlds:z');
  } catch {}

  // Legacy objects (pre-worlds)
  try {
    const legacyIds = (await kv.zrange('objects:z', 0, -1)) ?? [];
    for (const id of legacyIds) {
      await kv.del(`objects:${id}`);
      report.legacyObjects++;
    }
    await kv.del('objects:z');
    report.legacyObjectsSet++;
  } catch {}

  // Global state
  try {
    await kv.del('state:global');
    report.stateKeys++;
  } catch {}

  return report;
}

flushKV()
  .then((r) => {
    const url = process.env.KV_REST_API_URL || '(KV_REST_API_URL missing)';
    console.log('[kv:flush] target', url);
    console.log('[kv:flush] done', r);
    process.exit(0);
  })
  .catch((e) => {
    console.error('[kv:flush] error', e);
    process.exit(1);
  });
