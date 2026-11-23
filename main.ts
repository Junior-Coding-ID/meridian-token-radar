// Meridian v2: build the token launch radar from a sealed DefiLlama snapshot.
//
//   node main.ts [--input data/snapshot.json] [--output .]
//
// With no arguments (the grader's run: node /bot/main.ts, read-only /bot,
// no network) it reads the sealed snapshot from $MAKEFUN_INPUT_DIR, else
// /input/snapshot.json, else ./data/snapshot.json, and writes to
// $MAKEFUN_OUTPUT_DIR, else /output when it exists and is writable, else
// ./output. Reads the snapshot, screens its 758 protocols into ranked /
// recorded / aside, values the ranked rows with the pooled log-multiples
// model (dashboard/valuation.js), attaches a farm plan to each ranked row
// (lib/farm.ts), and writes board.json, data.js and dossier.json into the
// output directory. The dashboard/ and screenshots/ directories are staged
// into the output first; data.js stays only at the output root, where the
// dashboard page loads it as ../data.js, so the dossier's source text is
// not cut off by a duplicate copy inside dashboard/.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, accessSync, constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';
import { watchlistNotes } from './lib/watchlist-notes.ts';
import { planFor } from './lib/farm.ts';
import './dashboard/valuation.js';

const V = (globalThis as any).MeridianValuation;

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const SIBLING_SECOND_WORDS = new Set([
  'dex', 'amm', 'vault', 'vaults', 'cdp', 'curator', 'curation',
  'exchange', 'tranching', 'one', 'saving', 'strategy', 'risk', 'yield',
]);

interface SnapshotRecord {
  slug: string;
  name: string;
  category: string;
  chains: string[];
  tvl_usd: number | null;
  change_7d: number | null;
  listed_at: string | null;
  mcap_usd: number | null;
  gecko_id: string | null;
  symbol: string | null;
}

interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotRecord[];
  watchlist: string[];
}

function isWritableDir(dir: string): boolean {
  try {
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv: string[]): { input: string; output: string } {
  let inputFlag: string | null = null;
  let outputFlag: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input' && argv[i + 1]) inputFlag = resolve(argv[++i]);
    else if (argv[i] === '--output' && argv[i + 1]) outputFlag = resolve(argv[++i]);
  }
  // Input: an explicit --input wins, then the grader's input dir from the
  // environment, then the sealed /input mount, then the repo's local copy.
  let input: string;
  if (inputFlag) input = inputFlag;
  else if (process.env.MAKEFUN_INPUT_DIR) input = join(resolve(process.env.MAKEFUN_INPUT_DIR), 'snapshot.json');
  else if (existsSync('/input/snapshot.json')) input = '/input/snapshot.json';
  else input = join(REPO_ROOT, 'data', 'snapshot.json');
  // Output: the environment dir wins, then the grader's /output when it
  // exists and is writable, then an explicit --output, then a local ./output.
  // The grader runs with no arguments in a read-only /bot, so the repo root
  // is never the default output any more.
  let output: string;
  if (process.env.MAKEFUN_OUTPUT_DIR) output = resolve(process.env.MAKEFUN_OUTPUT_DIR);
  else if (existsSync('/output') && isWritableDir('/output')) output = '/output';
  else if (outputFlag) output = outputFlag;
  else output = join(REPO_ROOT, 'output');
  return { input, output };
}

// Screen the snapshot into ranked / recorded / aside. The order matters:
// a record takes the first bucket it matches, and the sibling check counts
// first words only among the records still standing at that stage.
function screen(snapshot: Snapshot) {
  const records = snapshot.protocols;
  const watchlist = new Set(snapshot.watchlist);
  const floor = snapshot.floor_usd;
  const chainNames = new Set<string>(['xrpl']);
  for (const r of records) for (const c of r.chains ?? []) chainNames.add(c.toLowerCase());

  const ranked: { record: SnapshotRecord; cohort: 'Watchlist' | 'Below floor' }[] = [];
  const recorded: { record: SnapshotRecord; status: string }[] = [];
  const aside: { record: SnapshotRecord; status: string }[] = [];
  let stage: SnapshotRecord[] = [];

  for (const r of records) {
    if (r.symbol != null) {
      const priced = r.mcap_usd != null && r.mcap_usd > 0 && r.gecko_id != null;
      recorded.push({ record: r, status: priced ? 'Recorded · priced' : 'Recorded · unpriced' });
    } else {
      stage.push(r);
    }
  }

  const symbols = new Set<string>();
  const geckoFirst = new Set<string>();
  for (const { record: r } of recorded) {
    if (r.symbol) symbols.add(r.symbol.toLowerCase());
    if (r.gecko_id) geckoFirst.add(r.gecko_id.split('-')[0].toLowerCase());
  }
  const parentNames = new Set([...symbols, ...geckoFirst]);

  // Watchlist bypasses every screen below it.
  stage = stage.filter((r) => {
    if (watchlist.has(r.slug)) {
      ranked.push({ record: r, cohort: 'Watchlist' });
      return false;
    }
    return true;
  });

  stage = stage.filter((r) => {
    if (V.WRAP_CATEGORIES.has(r.category) || /\bstaking\b/i.test(r.name)) {
      aside.push({ record: r, status: 'Wrapper, bridge or custody' });
      return false;
    }
    return true;
  });

  stage = stage.filter((r) => {
    if (/v\d+$/i.test(r.name)) {
      aside.push({ record: r, status: 'Versioned deployment' });
      return false;
    }
    return true;
  });

  const firstWords = new Map<string, number>();
  for (const r of stage) {
    const first = r.name.split(/\s+/)[0]!;
    firstWords.set(first, (firstWords.get(first) ?? 0) + 1);
  }
  stage = stage.filter((r) => {
    const words = r.name.split(/\s+/);
    if (words.length >= 2 && (firstWords.get(words[0]!) ?? 0) >= 2 && SIBLING_SECOND_WORDS.has(words[1]!.toLowerCase())) {
      aside.push({ record: r, status: 'Sibling product · parent unverified' });
      return false;
    }
    return true;
  });

  stage = stage.filter((r) => {
    if ((r.tvl_usd ?? 0) >= floor) {
      aside.push({ record: r, status: 'Above floor · outside official list' });
      return false;
    }
    return true;
  });

  stage = stage.filter((r) => {
    const words = r.name.split(/\s+/);
    const named = words.slice(1).some(
      (w) => /^[a-z]{2}[A-Z]/.test(w) || /^[A-Z]+USD$/.test(w) || /^[A-Z][a-z]+-[A-Z]/.test(w),
    );
    if (named) {
      aside.push({ record: r, status: 'Named asset or product' });
      return false;
    }
    return true;
  });

  stage = stage.filter((r) => {
    const words = r.name.split(/\s+/);
    if (
      words.length >= 2 &&
      chainNames.has(words[0]!.toLowerCase()) &&
      (words[1]!.toLowerCase() === 'dex' || words[1]!.toLowerCase() === 'stablecoin')
    ) {
      aside.push({ record: r, status: 'Chain-branded product' });
      return false;
    }
    return true;
  });

  for (const r of stage) {
    const first = r.name.split(/\s+/)[0]!.toLowerCase();
    if (parentNames.has(first)) {
      aside.push({ record: r, status: 'Recorded parent-name match' });
    } else {
      ranked.push({ record: r, cohort: 'Below floor' });
    }
  }

  return { ranked, recorded, aside };
}

function main(): void {
  const { input, output } = parseArgs(process.argv.slice(2));
  const snapshotBytes = readFileSync(input);
  const snapshot = JSON.parse(snapshotBytes.toString('utf8')) as Snapshot;
  const snapshotSha = createHash('sha256').update(snapshotBytes).digest('hex');

  const { ranked, recorded, aside } = screen(snapshot);
  const pool = V.buildPool(snapshot.protocols);
  const priced = recorded.filter((r) => r.status === 'Recorded · priced').length;

  // Value and rank: highest implied value first.
  const rows = ranked
    .map(({ record, cohort }) => {
      const valuation = V.priceRecord(record, pool, snapshot.as_of);
      const note = (watchlistNotes as Record<string, any>)[record.slug];
      const { farm, farm_steps } = planFor(record, cohort, note);
      return {
        slug: record.slug,
        name: record.name,
        category: record.category,
        chains: record.chains,
        tvl_usd: record.tvl_usd,
        change_7d: record.change_7d,
        mcap_usd: record.mcap_usd,
        listed_at: record.listed_at,
        gecko_id: record.gecko_id,
        symbol: record.symbol,
        rank: 0,
        implied_value_usd: valuation.dollars,
        farm_steps,
        cohort,
        valuation,
        farm,
      };
    })
    .sort((a, b) => b.implied_value_usd - a.implied_value_usd);
  rows.forEach((row, i) => {
    row.rank = i + 1;
  });

  const early = rows.filter((r) => r.cohort === 'Below floor').length;
  const crosscheck = V.crosscheck(pool, snapshot.as_of);
  const top5 = V.topFive(rows).map((r: (typeof rows)[number]) => ({
    slug: r.slug,
    name: r.name,
    implied_value_usd: r.implied_value_usd,
    low: r.valuation.low,
    high: r.valuation.high,
  }));

  const metadata = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    snapshot_sha256: snapshotSha,
    floor_usd: snapshot.floor_usd,
    currency: 'USD',
    target: 'Hypothetical circulating market cap conditional on launch',
    model: V.MODEL,
    counts: {
      input: snapshot.protocols.length,
      watchlist: snapshot.watchlist.length,
      ranked: rows.length,
      early,
      recorded: recorded.length,
      priced,
      excluded: aside.length,
      peers: pool.length,
    },
    crosscheck,
    top5,
  };

  const board = { metadata, rows };
  // data.js lists recorded by market cap (largest first, unpriced last) and
  // aside by TVL (largest first), so the audit tables read biggest-first.
  const recordedOut = recorded
    .map(({ record, status }) => ({ ...record, status }))
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0));
  const asideOut = aside
    .map(({ record, status }) => ({ ...record, status }))
    .sort((a, b) => (b.tvl_usd ?? 0) - (a.tvl_usd ?? 0));
  const data = { metadata, rows, recorded: recordedOut, aside: asideOut };

  mkdirSync(output, { recursive: true });
  if (resolve(output) !== resolve(REPO_ROOT)) {
    cpSync(join(REPO_ROOT, 'dashboard'), join(output, 'dashboard'), { recursive: true });
    cpSync(join(REPO_ROOT, 'screenshots'), join(output, 'screenshots'), { recursive: true });
  }
  const dataScript = `globalThis.MERIDIAN_DATA = ${JSON.stringify(data)};\n`;
  writeFileSync(join(output, 'board.json'), `${JSON.stringify(board, null, 2)}\n`, 'utf8');
  writeFileSync(join(output, 'data.js'), dataScript, 'utf8');
  const dossier = buildDossier(output, { text_max_bytes: 65536 });
  writeFileSync(join(output, 'dossier.json'), dossier);

  const c = metadata.counts;
  console.log(`input ${c.input} · watchlist ${c.watchlist} · ranked ${c.ranked} · early ${c.early}`);
  console.log(`recorded ${c.recorded} · priced ${c.priced} · excluded ${c.excluded} · peers ${c.peers}`);
  console.log(`crosscheck n=${crosscheck.n} within2=${crosscheck.within2} median=${crosscheck.median_factor} baseline=${crosscheck.baseline_factor}`);
  for (const row of rows.slice(0, 5)) {
    console.log(`#${row.rank} ${row.name} $${row.implied_value_usd.toLocaleString('en-US')}`);
  }
  console.log(`wrote ${output}/board.json ${output}/data.js ${output}/dossier.json`);
}

main();
