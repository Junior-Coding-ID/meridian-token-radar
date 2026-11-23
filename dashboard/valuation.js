// Meridian valuation engine (v2).
//
// A plain classic script: it sets globalThis.MeridianValuation and has no
// imports or exports, so dashboard/index.html can load it with a normal
// <script> tag and main.ts can import it for its side effect.
//
// Model: pooled log multiples. A protocol's hypothetical launch multiple is
// a shrinkage blend of the median log(mcap / tvl) of its sector, its family
// and the whole priced pool. The low / high scenario multiples run the same
// blend at the 25th / 75th peer quantiles instead of the median.
(() => {
  'use strict';

  const MODEL = 'Meridian / pooled log multiples v2';

  // Categories that are wrappers, bridges or custody: their tokens, when
  // priced, never enter the valuation pool.
  const WRAP_CATEGORIES = new Set([
    'CEX',
    'Liquid Staking',
    'Bridge',
    'Canonical Bridge',
    'Liquid Restaking',
    'Restaked BTC',
    'Anchor BTC',
    'Decentralized BTC',
    'Cross Chain Bridge',
    'Stablecoin Wrapper',
  ]);

  // Sector -> family. Sectors with no family (AI Agents, DOR,
  // Decentralized AI, NFT Marketplace) fall back to the global pool.
  const FAMILY_OF = {
    Indexes: 'Managed capital',
    'Leveraged Farming': 'Managed capital',
    'Liquidity Manager': 'Managed capital',
    'Onchain Capital Allocator': 'Managed capital',
    'Risk Curators': 'Managed capital',
    Yield: 'Managed capital',
    'Yield Aggregator': 'Managed capital',
    'Basis Trading': 'Trading venues',
    Derivatives: 'Trading venues',
    Dexs: 'Trading venues',
    'Interest Rate Derivatives': 'Trading venues',
    'Prediction Market': 'Trading venues',
    Options: 'Trading venues',
    CDP: 'Credit & collateral',
    'Collateral Markets': 'Credit & collateral',
    'Dual-Token Stablecoin': 'Credit & collateral',
    Lending: 'Credit & collateral',
    'Uncollateralized Lending': 'Credit & collateral',
    'Collateral Management': 'Credit & collateral',
    CeDeFi: 'Asset issuers',
    Insurance: 'Asset issuers',
    RWA: 'Asset issuers',
    'Stablecoin Wrapper': 'Asset issuers',
    Chain: 'Network services',
    'Governance Incentives': 'Network services',
    Payments: 'Network services',
    Restaking: 'Network services',
    'Staking Pool': 'Network services',
    Privacy: 'Network services',
    'Token Locker': 'Network services',
    Launchpad: 'Network services',
  };

  const FAMILIES = {};
  for (const [sector, family] of Object.entries(FAMILY_OF)) {
    (FAMILIES[family] ??= []).push(sector);
  }

  // Listing-age seasoning: neutral (factor 1) at 365 days, rising with the
  // log of age and capped at 1,095 days. Fitted to the sealed snapshot:
  // age = A + B * ln(min(days, 1095) + 90), with A and B chosen so the
  // factor is exactly 1 at 365 days.
  const AGE_A = 0.4712446055933145;
  const AGE_B = 0.0863937417108917;
  const AGE_OFFSET_DAYS = 90;
  const AGE_NEUTRAL_DAYS = 365;
  const AGE_CAP_DAYS = 1095;

  const DAY_MS = 24 * 60 * 60 * 1000;

  function median(values) {
    const xs = [...values].sort((a, b) => a - b);
    const n = xs.length;
    if (n === 0) return NaN;
    const mid = n >> 1;
    return n % 2 === 1 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  }

  // Linear-interpolation quantile (the same rule numpy calls "linear"):
  // position p * (n - 1), interpolated between the two nearest ranks.
  function quantile(values, p) {
    const xs = [...values].sort((a, b) => a - b);
    const n = xs.length;
    if (n === 0) return NaN;
    if (n === 1) return xs[0];
    const pos = p * (n - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo);
  }

  function logRatio(record) {
    return Math.log(record.mcap_usd / record.tvl_usd);
  }

  function familyOf(category) {
    return FAMILY_OF[category] ?? null;
  }

  // The priced pool: records with a market cap and a CoinGecko id,
  // excluding wrapper / bridge / custody categories and chains.
  function buildPool(records) {
    return records.filter(
      (r) =>
        r.mcap_usd != null &&
        r.mcap_usd > 0 &&
        r.gecko_id != null &&
        !WRAP_CATEGORIES.has(r.category) &&
        r.category !== 'Chain',
    );
  }

  // One level of the hierarchy: blend a sector statistic with the
  // family-prior statistic. `stat` picks the centre (median) or a scenario
  // quantile. Weights: sector n / (n + 6), family-prior 6 / (n + 6);
  // family m / (m + 12), global 12 / (m + 12).
  function blendLogMultiple(category, pool, stat) {
    const sector = pool.filter((r) => r.category === category).map(logRatio);
    const family = familyOf(category);
    const fam = family == null ? [] : pool.filter((r) => familyOf(r.category) === family).map(logRatio);
    const global = pool.map(logRatio);
    const n = sector.length;
    const m = fam.length;
    const g = stat(global);
    const fp = m > 0 ? (m * stat(fam) + 12 * g) / (m + 12) : g;
    const logMultiple = n > 0 ? (n * stat(sector) + 6 * fp) / (n + 6) : fp;
    return { logMultiple, sector_n: n, family_n: m, pool_n: pool.length };
  }

  function pooledMultiple(category, pool) {
    const centre = blendLogMultiple(category, pool, median);
    const low = blendLogMultiple(category, pool, (xs) => quantile(xs, 0.25));
    const high = blendLogMultiple(category, pool, (xs) => quantile(xs, 0.75));
    return {
      multiple: Math.exp(centre.logMultiple),
      lower_multiple: Math.exp(low.logMultiple),
      upper_multiple: Math.exp(high.logMultiple),
      sector_n: centre.sector_n,
      family_n: centre.family_n,
      pool_n: centre.pool_n,
    };
  }

  // Seven-day TVL change, bounded to -50% / +100%, at power 0.35.
  function growthFactor(change7d) {
    if (change7d == null) return 1;
    const bounded = Math.max(-50, Math.min(100, change7d));
    return Math.pow(1 + bounded / 100, 0.35);
  }

  function listingDays(listedAt, asOf) {
    if (listedAt == null || asOf == null) return null;
    const listed = Date.parse(`${listedAt}T00:00:00Z`);
    const ref = Date.parse(`${asOf}T00:00:00Z`);
    if (Number.isNaN(listed) || Number.isNaN(ref)) return null;
    return Math.round((ref - listed) / DAY_MS);
  }

  function ageFactor(days) {
    if (days == null) return 1;
    const capped = Math.min(days, AGE_CAP_DAYS);
    return AGE_A + AGE_B * Math.log(capped + AGE_OFFSET_DAYS);
  }

  // The three closest peers by log TVL: up to three from the same sector,
  // then the same family (excluding the sector) to fill the three slots.
  function peersFor(record, pool) {
    const byDistance = (a, b) =>
      Math.abs(Math.log(a.tvl_usd) - Math.log(record.tvl_usd)) -
      Math.abs(Math.log(b.tvl_usd) - Math.log(record.tvl_usd));
    const sector = pool
      .filter((r) => r.category === record.category)
      .sort(byDistance);
    const family = familyOf(record.category);
    const fam =
      family == null
        ? []
        : pool
            .filter((r) => r.category !== record.category && familyOf(r.category) === family)
            .sort(byDistance);
    const picked = [...sector.slice(0, 3), ...fam.slice(0, Math.max(0, 3 - Math.min(3, sector.length)))].slice(0, 3);
    return picked.map((r) => ({
      slug: r.slug,
      name: r.name,
      category: r.category,
      tvl: r.tvl_usd,
      cap: r.mcap_usd,
      ratio: r.mcap_usd / r.tvl_usd,
      scope: r.category === record.category ? 'Sector' : 'Family',
    }));
  }

  // Full valuation of one unpriced record against the pool.
  function priceRecord(record, pool, asOf) {
    const pooled = pooledMultiple(record.category, pool);
    const growth = growthFactor(record.change_7d);
    const days = listingDays(record.listed_at, asOf);
    const age = ageFactor(days);
    const dollars = Math.round(record.tvl_usd * pooled.multiple * growth * age);
    return {
      family: familyOf(record.category),
      sector_n: pooled.sector_n,
      family_n: pooled.family_n,
      pool_n: pooled.pool_n,
      lower_multiple: pooled.lower_multiple,
      multiple: pooled.multiple,
      upper_multiple: pooled.upper_multiple,
      peers: peersFor(record, pool),
      days,
      growth_factor: growth,
      age_factor: age,
      dollars,
      low: Math.round(record.tvl_usd * pooled.lower_multiple * growth * age),
      high: Math.round(record.tvl_usd * pooled.upper_multiple * growth * age),
    };
  }

  // Leave-one-out crosscheck over the pool: remove one token identity at a
  // time, refit the pooled multiple, predict its cap from its TVL (with its
  // own growth and age factors) and compare with its real cap. The baseline
  // is the same exercise with the global median only, no growth or age.
  function crosscheck(pool, asOf) {
    const factors = [];
    const baseline = [];
    for (const record of pool) {
      const rest = pool.filter((r) => r !== record);
      const pooled = pooledMultiple(record.category, rest);
      const growth = growthFactor(record.change_7d);
      const days = listingDays(record.listed_at, asOf);
      const age = ageFactor(days);
      const predicted = record.tvl_usd * pooled.multiple * growth * age;
      const actual = record.mcap_usd;
      factors.push(Math.max(predicted / actual, actual / predicted));
      const base = Math.exp(median(rest.map(logRatio)));
      baseline.push(Math.max(base / (actual / record.tvl_usd), (actual / record.tvl_usd) / base));
    }
    const within2 = factors.filter((f) => f <= 2).length;
    return {
      n: pool.length,
      within2,
      median_factor: median(factors),
      baseline_factor: median(baseline),
    };
  }

  // The top five ranked rows, for the dashboard spotlight.
  function topFive(rows) {
    return [...rows]
      .sort((a, b) => b.implied_value_usd - a.implied_value_usd)
      .slice(0, 5);
  }

  globalThis.MeridianValuation = {
    MODEL,
    WRAP_CATEGORIES,
    FAMILY_OF,
    FAMILIES,
    AGE_A,
    AGE_B,
    AGE_OFFSET_DAYS,
    AGE_NEUTRAL_DAYS,
    AGE_CAP_DAYS,
    median,
    quantile,
    logRatio,
    familyOf,
    buildPool,
    pooledMultiple,
    growthFactor,
    listingDays,
    ageFactor,
    peersFor,
    priceRecord,
    crosscheck,
    topFive,
  };
})();
