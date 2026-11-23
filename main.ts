import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
  cpSync,
  renameSync,
  rmSync,
  mkdtempSync,
  readdirSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { buildDossier } from './vendor/makefun-board.ts';
import { plan, type Protocol } from './lib/farm.ts';
import './dashboard/valuation.js';

const root = dirname(fileURLToPath(import.meta.url));
const opts = parseArgs({
  options: { input: { type: 'string' }, output: { type: 'string' }, 'data-only': { type: 'boolean' } },
}).values;
const mounted = existsSync('/input/snapshot.json');
const from = resolve(opts.input || (mounted ? '/input/snapshot.json' : join(root, 'data/snapshot.json')));
const input = statSync(from).isDirectory() ? join(from, 'snapshot.json') : from;
const out = resolve(opts.output || process.env.MAKEFUN_OUTPUT_DIR || (mounted ? '/output' : join(root, 'out')));
const raw = readFileSync(input),
  digest = createHash('sha256').update(raw).digest('hex');
const snapshot = JSON.parse(raw.toString('utf8')) as {
  as_of: string;
  source: string;
  floor_usd: number;
  watchlist: string[];
  protocols: Protocol[];
};
const V = globalThis.MeridianValuation;
const watch = new Set(snapshot.watchlist),
  all = snapshot.protocols;
const unique = new Set(all.map((p) => p.slug));
if (unique.size !== all.length || watch.size !== snapshot.watchlist.length || [...watch].some((s) => !unique.has(s)))
  throw Error('Invalid snapshot identities');
if (
  !Number.isFinite(Date.parse(snapshot.as_of)) ||
  !all.every((p) => Number.isSafeInteger(p.tvl_usd) && p.tvl_usd > 0 && Array.isArray(p.chains))
)
  throw Error('Invalid protocol metrics');
const known = V.knownNames(all),
  peers = V.peersFrom(all);
if (peers.length < 3) throw Error('At least three independent priced comparables are required');
const groups = all.map((p) => ({ p, status: V.classify(p, watch, snapshot.floor_usd, known) }));
const ranked = groups.filter((x) => x.status === 'Watchlist' || x.status === 'Below floor');
const rows = ranked
  .map(({ p, status }) => {
    const value = V.estimate(p, snapshot.as_of, peers),
      farming = plan(p);
    const { steps, ...route } = farming;
    return {
      ...p,
      rank: 0,
      implied_value_usd: value.dollars,
      farm_steps: steps,
      cohort: status,
      valuation: value,
      farm: route,
    };
  })
  .sort((a, b) => b.implied_value_usd - a.implied_value_usd || V.bySlug(a, b));
rows.forEach((row, i) => (row.rank = i + 1));
const listed = new Set(rows.map((p) => p.slug));
if (rows.length < 100 || rows.length > 4000 || [...watch].some((s) => !listed.has(s)))
  throw Error('Ranked size or watchlist coverage outside gate');
for (const p of rows) {
  if (
    !Number.isSafeInteger(p.implied_value_usd) ||
    p.implied_value_usd < 1 ||
    p.implied_value_usd > 1e14 ||
    p.farm_steps.some((s) => s.trim().length < 20 || s.trim().length > 600)
  )
    throw Error('Invalid valuation or plan for ' + p.slug);
}
const compare = V.crossCheck(snapshot.as_of, peers);
const recorded = groups.filter((x) => x.status.startsWith('Recorded ·'));
const aside = groups.filter((x) => !listed.has(x.p.slug) && !x.status.startsWith('Recorded ·'));
const counts = {
  input: all.length,
  watchlist: watch.size,
  ranked: rows.length,
  early: rows.length - watch.size,
  recorded: recorded.length,
  priced: recorded.filter((x) => x.p.mcap_usd > 0).length,
  excluded: aside.length,
  peers: peers.length,
};
const meta = {
  as_of: snapshot.as_of,
  source: snapshot.source,
  snapshot_sha256: digest,
  floor_usd: snapshot.floor_usd,
  currency: 'USD',
  target: 'Hypothetical circulating market cap conditional on launch',
  model: 'Meridian / pooled log multiples v2',
  counts,
  crosscheck: compare,
  top5: V.topFive(rows).map((r) => ({ rank: r.rank, slug: r.slug, name: r.name, implied_value_usd: r.implied_value_usd, low: r.valuation.low, high: r.valuation.high })),
};
const board = { metadata: meta, rows };
const slim = (x: { p: Protocol; status: string }) => ({ ...x.p, status: x.status });
const data = {
  ...board,
  recorded: recorded.map(slim).sort((a, b) => (b.mcap_usd || 0) - (a.mcap_usd || 0) || V.bySlug(a, b)),
  aside: aside.map(slim).sort((a, b) => b.tvl_usd - a.tvl_usd || V.bySlug(a, b)),
};
mkdirSync(out, { recursive: true });
const stage = mkdtempSync(join(out, '.meridian-'));
try {
  // A local script tag works via file://, including with the browser offline.
  const json = JSON.stringify(data)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
  writeFileSync(join(stage, 'data.js'), 'globalThis.MERIDIAN_DATA = ' + json + ';\n');
  writeFileSync(join(stage, 'board.json'), JSON.stringify(board, null, 2) + '\n');
  if (!opts['data-only']) {
    for (const dir of ['dashboard', 'screenshots']) cpSync(join(root, dir), join(stage, dir), { recursive: true });
    const bytes = buildDossier(stage, {
      text_max_bytes: 65536,
      screenshots: { max: 4, max_bytes: 524288 },
      dashboard: { max_files: 400, max_bytes: 4194304 },
    });
    writeFileSync(join(stage, 'dossier.json'), bytes);
    if (out !== root)
      for (const dir of ['dashboard', 'screenshots']) {
        // Preserve any user files in an existing output. Reject stale assets instead of publishing them.
        if (existsSync(join(out, dir))) {
          const previous = readdirSync(join(out, dir), { recursive: true });
          if (previous.some((path) => !existsSync(join(stage, dir, String(path)))))
            throw Error('Extra files in ' + join(out, dir) + '. Use an empty output directory.');
        }
        cpSync(join(stage, dir), join(out, dir), { recursive: true });
      }
  }
  const resultFiles = opts['data-only'] ? ['board.json', 'data.js'] : ['board.json', 'data.js', 'dossier.json'];
  for (const f of resultFiles) renameSync(join(stage, f), join(out, f));
} finally {
  rmSync(stage, { recursive: true, force: true });
}
console.log(
  JSON.stringify(
    { snapshot: digest, as_of: meta.as_of, counts, crosscheck: compare, output: out, data_only: !!opts['data-only'] },
    null,
    2,
  ),
);
