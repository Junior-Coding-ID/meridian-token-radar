/* The same functions run in Node and in the offline scenario calculator. All inputs are sealed. */
(() => {
  'use strict';
  const families = {
    'Managed capital': [
      'Risk Curators',
      'Onchain Capital Allocator',
      'Yield Aggregator',
      'Yield',
      'Farm',
      'Leveraged Farming',
      'Liquidity Manager',
      'Indexes',
      'Options Vault',
    ],
    'Credit & collateral': [
      'Lending',
      'Uncollateralized Lending',
      'CDP',
      'CDP Manager',
      'Collateral Markets',
      'Collateral Management',
      'Dual-Token Stablecoin',
      'Algo-Stables',
    ],
    'Trading venues': [
      'Dexs',
      'Derivatives',
      'Options',
      'OTC Marketplace',
      'Prediction Market',
      'Interest Rate Derivatives',
      'Basis Trading',
      'Synthetics',
    ],
    'Asset issuers': [
      'RWA',
      'CeDeFi',
      'Stablecoin Issuer',
      'Stablecoin Wrapper',
      'Insurance',
      'Anchor BTC',
      'Decentralized BTC',
    ],
    'Network services': [
      'Chain',
      'Payments',
      'Restaking',
      'Staking Pool',
      'Crypto Card Issuer',
      'Governance Incentives',
      'Token Locker',
      'Privacy',
      'Launchpad',
    ],
  };
  const familyOf = (category) => Object.keys(families).find((k) => families[k].includes(category)) || 'Other';
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const hasToken = (p) => p.gecko_id != null || p.symbol != null;
  const wholeDays = (asOf, listed) =>
    listed ? Math.max(0, Math.round((Date.parse(asOf) - Date.parse(listed)) / 86400000)) : null;
  const bySlug = (a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
  const wrappers =
    /^(?:Bridge|Canonical Bridge|Cross Chain Bridge|Liquid Staking|Liquid Restaking|Restaked BTC|CEX|Stablecoin Wrapper|Anchor BTC|Decentralized BTC)$/i;
  const wrapperName =
    /\b(?:wrapped|staked|staking|bridged)\b|^(?:Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;
  const version = /(?:\s|[a-z])v\d+(?:\.\d+)?$|\s\d+\.\d+$/i;
  const product = /\b(?:[a-z]*USD[ctex]?|[a-z]*ETH|[a-z]*BTC|[a-z]*HYPE|afLP|thBILL|liquidity fund|pre-launch)\b/i;
  const normalize = (name) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  // Above the floor, omission from the official watchlist carries information about hidden parents.
  // Below it, public name and sector clues only establish a screen, never parent verification.
  function classify(p, watch, floor, identities) {
    if (hasToken(p)) return p.mcap_usd > 0 ? 'Recorded · priced' : 'Recorded · unpriced';
    if (watch.has(p.slug)) return 'Watchlist';
    if (wrappers.test(p.category) || wrapperName.test(p.name)) return 'Wrapper, bridge or custody';
    if (version.test(p.name)) return 'Versioned deployment';
    if (p.tvl_usd >= floor) return 'Above floor · outside official list';
    if (product.test(p.name)) return 'Named asset or product';
    const name = normalize(p.name);
    if (identities.parents.some((n) => name === n || name.startsWith(n + ' '))) return 'Recorded parent-name match';
    if (identities.siblings.has(name.split(' ')[0]) && productLine.test(name))
      return 'Sibling product · parent unverified';
    if (/(?: dex| amm| stablecoin dex| saving vaults)$/.test(name) && identities.chains.has(name.split(' ')[0]))
      return 'Chain-branded product';
    return 'Below floor';
  }
  const productLine =
    /(?: cdp| vaults| strategy vaults| saving vaults| risk tranching| yield exchange| curator| curation| lending| pre launch| dex| amm| one)$/;
  function knownNames(protocols) {
    const names = new Set();
    for (const p of protocols.filter(hasToken)) {
      const token = normalize(p.symbol || '');
      if (token.length >= 3 && normalize(p.name).split(' ')[0] === token) names.add(token);
      for (const raw of [p.name, p.gecko_id]) {
        if (!raw) continue;
        const n = normalize(raw)
          .replace(/ (?:v\d+(?: \d+)?|finance|protocol|evm|lend|network)$/, '')
          .trim();
        if (n.length >= 3) names.add(n);
      }
    }
    const counts = new Map();
    for (const p of protocols.filter((p) => !hasToken(p))) {
      const name = normalize(p.name),
        stem = name.split(' ')[0];
      if (stem.length >= 3 && productLine.test(name)) counts.set(stem, (counts.get(stem) || 0) + 1);
    }
    const siblings = new Set([...counts].filter(([, n]) => n > 1).map(([stem]) => stem));
    const chains = new Set(protocols.flatMap((p) => p.chains).map(normalize));
    if (chains.has('ripple')) chains.add('xrpl');
    return { parents: [...names].sort(), siblings, chains };
  }
  function peersFrom(protocols) {
    const tokens = new Map();
    const ordered = [...protocols].sort((a, b) => b.tvl_usd - a.tvl_usd || bySlug(a, b));
    for (const p of ordered) {
      if (!hasToken(p) || !(p.mcap_usd > 0 && p.tvl_usd > 0) || wrappers.test(p.category) || wrapperName.test(p.name))
        continue;
      const id = (p.gecko_id || 'ticker/' + p.symbol).toLowerCase();
      if (!tokens.has(id)) tokens.set(id, { ...p, id, family: familyOf(p.category), ratio: p.mcap_usd / p.tvl_usd });
    }
    return [...tokens.values()];
  }
  function quantile(values, q) {
    const v = [...values].sort((a, b) => a - b);
    const i = (v.length - 1) * q,
      lo = Math.floor(i);
    return v[lo] + (v[Math.ceil(i)] - v[lo]) * (i - lo);
  }
  function evidence(p, peers) {
    const family = familyOf(p.category);
    const sectorPeers = peers.filter((x) => x.category === p.category);
    const familyPeers = peers.filter((x) => x.family === family);
    const sizeDistance = (x) => Math.abs(Math.log(x.tvl_usd / p.tvl_usd));
    const relevance = (x) => (x.category === p.category ? 0 : x.family === family ? 1 : 2);
    const examples = [...peers]
      .sort((a, b) => relevance(a) - relevance(b) || sizeDistance(a) - sizeDistance(b) || bySlug(a, b))
      .slice(0, 3);
    // Blend log quantiles. A single richly priced peer cannot set a whole sector's price.
    const pooled = (sample, prior, k, q) => {
      if (!sample.length) return prior;
      const w = sample.length / (sample.length + k);
      return (
        prior * (1 - w) +
        quantile(
          sample.map((x) => Math.log(x.ratio)),
          q,
        ) *
          w
      );
    };
    function multiple(q) {
      const global = quantile(
        peers.map((x) => Math.log(x.ratio)),
        q,
      );
      const group = pooled(familyPeers, global, 12, q);
      return Math.exp(pooled(sectorPeers, group, 6, q));
    }
    return {
      family,
      sector_n: sectorPeers.length,
      family_n: familyPeers.length,
      pool_n: peers.length,
      lower_multiple: multiple(0.25),
      multiple: multiple(0.5),
      upper_multiple: multiple(0.75),
      peers: examples.map((x) => ({
        slug: x.slug,
        name: x.name,
        category: x.category,
        tvl: x.tvl_usd,
        cap: x.mcap_usd,
        ratio: x.ratio,
        scope: relevance(x) === 0 ? 'Sector' : relevance(x) === 1 ? 'Family' : 'Global',
      })),
    };
  }
  function price(tvl, multiple, growth, days) {
    const growthFactor = growth == null ? 1 : Math.exp(0.35 * Math.log(clamp(1 + growth / 100, 0.5, 2)));
    const ageFactor = days == null ? 1 : 0.86 + (0.14 * Math.log1p(Math.min(days, 1095) / 90)) / Math.log1p(365 / 90);
    return {
      growth_factor: growthFactor,
      age_factor: ageFactor,
      dollars: Math.max(1, Math.round(tvl * multiple * growthFactor * ageFactor)),
    };
  }
  function estimate(p, asOf, peers) {
    const e = evidence(p, peers),
      days = wholeDays(asOf, p.listed_at);
    const calc = (multiple) => price(p.tvl_usd, multiple, p.change_7d, days);
    const base = calc(e.multiple);
    return { ...e, days, ...base, low: calc(e.lower_multiple).dollars, high: calc(e.upper_multiple).dollars };
  }
  // Leave out a whole token identity, including its cap, before predicting its observed circulating cap.
  function crossCheck(asOf, peers) {
    let hits = 0;
    const logErrors = [],
      benchmark = [];
    for (const held of peers) {
      const train = peers.filter((x) => x.id !== held.id);
      const predicted = estimate(held, asOf, train).dollars;
      const simple =
        held.tvl_usd *
        Math.exp(
          quantile(
            train.map((x) => Math.log(x.ratio)),
            0.5,
          ),
        );
      const error = Math.abs(Math.log(predicted / held.mcap_usd));
      logErrors.push(error);
      benchmark.push(Math.abs(Math.log(simple / held.mcap_usd)));
      if (error <= Math.log(2)) hits++;
    }
    return {
      n: peers.length,
      within2: hits,
      median_factor: Math.exp(quantile(logErrors, 0.5)),
      baseline_factor: Math.exp(quantile(benchmark, 0.5)),
    };
  }
  globalThis.MeridianValuation = {
    classify,
    knownNames,
    peersFrom,
    estimate,
    price,
    crossCheck,
    wholeDays,
    familyOf,
    bySlug,
  };
})();
