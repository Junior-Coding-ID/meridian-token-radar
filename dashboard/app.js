// Meridian v2 — offline dashboard. Top 5 spotlight added; valuation range shown per protocol.
(() => {
  'use strict';
  const root = document.getElementById('content'),
    D = globalThis.MERIDIAN_DATA,
    V = globalThis.MeridianValuation;
  if (!D || !V) {
    root.innerHTML =
      '<p class="notice">The local data file could not be opened. Extract the full archive and open dashboard/index.html again.</p>';
    return;
  }
  const { metadata: M, rows, recorded, aside } = D,
    C = M.counts;
  const bySlug = new Map([...rows, ...recorded, ...aside].map((p) => [p.slug, p]));
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const utc = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const esc = (x) =>
    String(x ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const money = (n) => (n == null ? '—' : usd.format(n));
  function short(n, digits = 1) {
    if (n == null) return '—';
    const units = [
      [1e12, 'T'],
      [1e9, 'B'],
      [1e6, 'M'],
      [1e3, 'K'],
    ];
    const unit = units.find(([u]) => n >= u);
    return unit ? '$' + (n / unit[0]).toFixed(digits) + unit[1] : money(n);
  }
  const pct = (n) => (n == null ? 'Unknown' : (n > 0 ? '+' : '') + n.toFixed(1) + '%');
  const date = (s) => (s ? utc.format(new Date(s + 'T00:00:00Z')) : 'Unknown');
  const mult = (n, d = 3) => n.toFixed(d) + '×';
  const obj = (pairs) => Object.fromEntries(pairs);
  const state = () => obj(new URLSearchParams(location.hash.slice(1)));
  function url(patch, base = state()) {
    const p = new URLSearchParams(base);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') p.delete(k);
      else p.set(k, String(v));
    }
    return '#' + p.toString();
  }
  const section = (i, h, p) =>
    `<div class="intro"><div><div class="eyebrow">${esc(i)}</div><h1>${esc(h)}</h1><p>${esc(p)}</p></div><div class="datebox"><span class="fieldname">Snapshot UTC</span><span>${date(M.as_of)}</span></div></div>`;
  function change(patch, replace = false, scroll = false) {
    const href = url(patch);
    if (replace) {
      history.replaceState(null, '', href);
      render();
    } else if (href !== location.hash) {
      location.hash = href;
    } else render();
    if (scroll) window.scrollTo(0, 0);
  }
  const modeButtons = (key, choices, value) =>
    `<div class="seg" aria-label="${esc(key)}">${choices.map(([v, label]) => `<button data-set="${esc(key)}" data-value="${esc(v)}" class="${value === v ? 'on' : ''}" aria-pressed="${value === v}">${esc(label)}</button>`).join('')}</div>`;
  function select(key, label, values, current) {
    return `<label class="selectbox ${current ? 'active' : ''}"><span class="sr">${esc(label)}</span><select id="filter-${key}" data-filter="${key}" aria-label="${esc(label)}"><option value="">${esc(label)}</option>${values.map((v) => `<option value="${esc(v)}" ${current === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`;
  }
  function search(value) {
    return `<label class="searchbox"><svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke-width="1.6"><circle cx="8.5" cy="8.5" r="5.7"/><path d="m13 13 4 4"/></svg><input id="q" type="search" placeholder="Find a protocol…" aria-label="Search protocols" value="${esc(value)}"><kbd aria-hidden="true">/</kbd></label>`;
  }
  const categories = [...new Set(rows.map((x) => x.category || 'Other'))].sort();
  const chains = [...new Set(rows.flatMap((x) => x.chains))].sort();
  function countOf(a, k) {
    return a.reduce((n, p) => n + (p.cohort === k ? 1 : 0), 0);
  }
  const colors = [
    ['#d5e8dd', '#255b49'],
    ['#e3e1f2', '#514d77'],
    ['#f0e1cd', '#76562b'],
    ['#d7e6ea', '#345c6a'],
    ['#e9dfd8', '#6d4c3d'],
    ['#dfe7c9', '#4d6236'],
  ];
  function badge(p) {
    const sum = [...p.slug].reduce((n, c) => n + c.charCodeAt(0), 0),
      [bg, ink] = colors[sum % colors.length];
    const initials = p.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    return `<span aria-hidden="true" class="monogram" style="background:${bg};color:${ink}">${esc(initials)}</span>`;
  }
  const tag = (v) =>
    `<span class="pill ${v === 'Watchlist' ? 'watch' : v === 'Below floor' ? 'early' : ''}">${esc(v)}</span>`;
  const linkTo = (p) => esc(url({ p: p.slug }));
  const nameCell = (p, sub) =>
    `<div class="namewrap">${badge(p)}<span><a href="${linkTo(p)}" class="rowname" style="text-decoration:none">${esc(p.name)}</a><span class="sub">${esc(sub)}</span></span></div>`;
  // v2: Top 5 spotlight — the five largest implied caps, with their peer range, up front.
  // Rank numbers are shown twice: as a badge and in the label, so the order is clear at a glance.
  function spotlight(list) {
    const top = V.topFive ? V.topFive(list) : [...list].sort((a, b) => b.implied_value_usd - a.implied_value_usd).slice(0, 5);
    if (!top.length) return '';
    return `<div class="panel"><div class="panelhead"><h2>Top 5 by implied cap</h2><span class="cap">peer range shown</span></div><ul class="worksheet">${top
      .map(
        (p) =>
          `<li data-rank="${p.rank}"><span class="ranknum" aria-label="Rank ${p.rank}">#${p.rank}</span><span>${esc(p.name)}<small>${esc(p.cohort)} · ${esc(p.category || 'Other')}</small></span><b>${short(p.implied_value_usd)}</b><small>${short(p.valuation.low)} – ${short(p.valuation.high)}</small></li>`,
      )
      .join('')}</ul></div>`;
  }
  function curve(list) {
    const a = [...list].sort((p, q) => p.rank - q.rank);
    if (!a.length) return '<div class="curve"><h2>Valuation curve</h2><p>No matching protocols.</p></div>';
    const W = 730,
      H = 119,
      L = 57,
      R = 20,
      T = 18,
      B = 24,
      n = a.length,
      hi = Math.log10(a[0].implied_value_usd),
      lo = Math.log10(a.at(-1).implied_value_usd);
    const ceiling = Math.ceil(hi * 2) / 2,
      floor = Math.min(ceiling - 0.5, Math.floor(lo * 2) / 2);
    const x = (i) => L + (i * (W - L - R)) / Math.max(1, n - 1),
      y = (val) => T + ((ceiling - Math.log10(val)) / (ceiling - floor)) * (H - T - B);
    const coords = a.map((p, i) => [x(i).toFixed(2), y(p.implied_value_usd).toFixed(2)]);
    const path = coords.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ');
    const ticks = [];
    for (let k = Math.ceil(floor); k <= ceiling; k++) {
      const yy = y(10 ** k);
      ticks.push(
        `<line class="axis" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text x="1" y="${yy + 4}">${short(10 ** k, 0)}</text>`,
      );
    }
    const mid = Math.floor((n - 1) / 2),
      median = n % 2 ? a[mid].implied_value_usd : (a[mid].implied_value_usd + a[mid + 1].implied_value_usd) / 2;
    const label = n === 1 ? 'One match' : 'Global rank · ' + n + ' matches';
    return `<div class="curve"><div class="curve-top"><h2>Valuation curve</h2><span class="cap">Circulating cap · log USD</span></div>
      <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Descending implied caps for ${n} matching candidates. Highest ${money(a[0].implied_value_usd)}, median ${money(median)}.">
      <defs><linearGradient id="underfill" x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0%" stop-color="#78c898" stop-opacity=".38"/><stop offset="100%" stop-color="#78c898" stop-opacity=".02"/></linearGradient></defs>
      ${ticks.join('')}<path d="${path} L${x(n - 1)} ${H - B} L${L} ${H - B} Z" fill="url(#underfill)"/><path d="${path}" fill="none" stroke="#a1e9ab" stroke-width="2.6" stroke-linejoin="round"/>
      <circle cx="${coords[0][0]}" cy="${coords[0][1]}" r="3.4" fill="#f6d898"/><text class="point-label" x="${L + 10}" y="${Math.max(11, y(a[0].implied_value_usd) - 3)}">High ${short(a[0].implied_value_usd)}</text>
      ${n > 3 ? `<circle cx="${x(mid)}" cy="${y(a[mid].implied_value_usd)}" r="3.4" fill="#f6d898"/><text class="point-label" x="${x(mid) + 8}" y="${y(a[mid].implied_value_usd) - 9}">Median ${short(median)}</text>` : ''}
      <text x="${L}" y="${H - 2}">#${a[0].rank}</text><text x="${W - R}" y="${H - 2}" text-anchor="end">#${a.at(-1).rank}</text></svg><div class="curve-note">${esc(label)}</div></div>`;
  }
  function coverage() {
    const items = [
      [C.ranked, 'Ranked', 'lg-rank'],
      [C.recorded, 'Token recorded', 'lg-listed'],
      [C.excluded, 'Screened out', 'lg-aside'],
    ];
    return `<div class="coverage"><div class="cardhead"><h2>Snapshot coverage</h2><span class="cap">${C.input} records</span></div><div class="stack" aria-hidden="true">${items.map(([n, , c]) => `<i class="${c}" style="flex:${n}"></i>`).join('')}</div><div class="keys">${items.map(([n, t, c]) => `<div><strong>${n}</strong><small><i class="sw ${c}"></i>${t}</small></div>`).join('')}</div><div class="under"><span>${C.watchlist} / ${C.watchlist} watchlist covered</span><a href="#view=audit">Audit records →</a></div></div>`;
  }
  const perPage = 15;
  function paginate(list, s) {
    const pages = Math.max(1, Math.ceil(list.length / perPage)),
      page = Math.min(pages, Math.max(1, parseInt(s.page, 10) || 1));
    const offset = (page - 1) * perPage;
    const footer = `<div class="pageline"><span>${list.length ? offset + 1 : 0}–${Math.min(offset + perPage, list.length)} of ${list.length} records</span><div class="pager"><button class="pagebtn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>← Previous</button><span>${page} / ${pages}</span><button class="pagebtn" data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>Next →</button></div></div>`;
    return { shown: list.slice(offset, offset + perPage), footer };
  }
  const valueOf = (p, k) =>
    ({
      name: p.name.toLowerCase(),
      rank: p.rank,
      cap: p.implied_value_usd,
      tvl: p.tvl_usd,
      growth: p.change_7d,
      peers: p.valuation.sector_n,
    })[k];
  function sortRows(list, key, dir) {
    return [...list].sort((a, b) => {
      const x = valueOf(a, key),
        y = valueOf(b, key);
      if (x == null && y != null) return 1;
      if (y == null && x != null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'asc' ? 1 : -1) || a.rank - b.rank;
    });
  }
  function radar(s) {
    const query = (s.q || '').toLowerCase().trim(),
      cohort = s.cohort || 'All';
    const list = rows.filter(
      (p) =>
        (cohort === 'All' || p.cohort === cohort) &&
        (!s.chain || p.chains.includes(s.chain)) &&
        (!s.category || p.category === s.category) &&
        (!s.mode || p.farm.mode === s.mode) &&
        (!query || (p.name + ' ' + p.slug).toLowerCase().includes(query)),
    );
    const active = !!(query || s.chain || s.category || s.mode || cohort !== 'All'),
      key = ['rank', 'name', 'cap', 'tvl', 'growth', 'peers'].includes(s.sort) ? s.sort : 'cap',
      dir = s.dir || (key === 'rank' || key === 'name' ? 'asc' : 'desc');
    const { shown, footer } = paginate(sortRows(list, key, dir), s);
    const header = (k, label, cls = '') =>
      `<th class="${cls}" scope="col" aria-sort="${k === key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button class="${k === key ? 'sorted' : ''}" data-sort="${k}">${label} ${k === key ? (dir === 'asc' ? '↑' : '↓') : '↕'}</button></th>`;
    const tr = (p) =>
      `<tr class="selectable" data-row="${esc(p.slug)}"><td class="rank">${String(p.rank).padStart(2, '0')}</td><td>${nameCell(p, p.category || 'Unclassified')}</td><td>${tag(p.cohort)}</td><td class="optional">${esc(p.farm.chain)}${p.chains.length > 1 ? `<span class="sub">+${p.chains.length - 1} more</span>` : ''}</td><td class="num val" title="${money(p.implied_value_usd)}">${short(p.implied_value_usd)}</td><td class="num">${short(p.tvl_usd)}</td><td class="num ${p.change_7d > 0 ? 'positive' : p.change_7d < 0 ? 'negative' : ''}">${esc(pct(p.change_7d))}</td><td class="optional">${esc(p.farm.mode)}<span class="sub">${p.farm.minutes} min</span></td><td class="chev">›</td></tr>`;
    return (
      section(
        'Sealed protocol snapshot',
        'Token launch radar',
        'Estimated circulating market caps and farm plans for protocols with no token recorded.',
      ) +
      `<div class="hero-grid">${curve(list)}${coverage()}</div>${spotlight(list)}<div class="sectionhead"><h2>Ranked protocols <span class="total">${list.length}</span></h2>${modeButtons(
        'cohort',
        [
          ['All', 'All candidates'],
          ['Watchlist', 'Watchlist · ' + C.watchlist],
          ['Below floor', 'Below floor · ' + C.early],
        ],
        cohort,
      )}</div>
      <section class="directory" aria-label="Ranked protocols"><div class="filterline">${search(s.q)}${select('chain', 'All chains', chains, s.chain)}${select('category', 'All sectors', categories, s.category)}${select('mode', 'All farm routes', ['Observe', 'Small trial'], s.mode)}<button class="clear" data-clear ${active ? '' : 'disabled'}>Reset</button></div>
      ${active ? `<div class="selection"><b>Selection</b><span>${esc([s.chain, s.category, s.mode, cohort === 'All' ? '' : cohort, query].filter(Boolean).join(' / '))} · ${list.length} matches · ${countOf(list, 'Watchlist')} on watchlist</span></div>` : ''}
      <div class="tablewrap"><table><thead><tr>${header('rank', 'Rank')}${header('name', 'Protocol')}<th>Cohort</th><th class="optional">Plan chain</th>${header('cap', 'Implied cap', 'num')}${header('tvl', 'TVL', 'num')}${header('growth', '7d TVL', 'num')}<th class="optional">Farm route</th><th><span class="sr">Open</span></th></tr></thead><tbody>${shown.map(tr).join('')}</tbody></table></div>${list.length ? '' : '<div class="empty">No matches. <button class="ghost" data-clear>Clear filters</button></div>'}${footer}</section>`
    );
  }
  function back(p, s) {
    return `<a class="back" href="${esc(url({ p: null }, s))}">← ${p.rank ? 'Ranked protocols' : 'Snapshot audit'}</a>`;
  }
  const steps = [
    'Verify the route',
    'Inspect the product',
    'Set the budget',
    'Preview the action',
    'Test the exit',
    'Review eligibility',
  ];
  function detail(p, s) {
    if (!p.rank) return recordDetail(p, s);
    const v = p.valuation,
      f = p.farm;
    const worksheet = [
      ['Locked capital', 'Snapshot TVL', money(p.tvl_usd)],
      ['Peer multiple', v.sector_n + ' sector / ' + v.family_n + ' family / ' + v.pool_n + ' total', mult(v.multiple)],
      ['7-day TVL adjustment', pct(p.change_7d) + ' reported', mult(v.growth_factor)],
      [
        'Listing-age adjustment',
        v.days == null ? 'Date missing · neutral' : v.days + ' days since first listing',
        mult(v.age_factor),
      ],
      ['Implied circulating cap', 'Rounded once, in whole US dollars', money(p.implied_value_usd)],
    ];
    const peers = v.peers
      .map(
        (peer) =>
          `<tr><td>${esc(peer.name)}<span class="sub">${esc(peer.scope)} · ${esc(peer.category || 'Other')}</span></td><td class="num">${short(peer.cap)}</td><td class="num">${mult(peer.ratio, 2)}</td></tr>`,
      )
      .join('');
    const band =
      v.sector_n <= 2 ? 'Thin sector evidence' : v.sector_n <= 5 ? 'Limited sector evidence' : 'Sector evidence';
    return (
      back(p, s) +
      `<section class="detailhero"><div><div class="eyebrow">Protocol profile / Rank ${String(p.rank).padStart(2, '0')}</div><h1>${esc(p.name)}</h1><div class="tags"><span class="tag">${esc(p.cohort)}</span><span class="tag">${esc(p.category || 'Other')}</span><span class="tag">${p.chains.length} ${p.chains.length === 1 ? 'chain' : 'chains'}</span></div></div><div class="bigval"><span class="cap">Implied circulating cap</span><strong>${short(p.implied_value_usd)}</strong><span class="mono">Peer scenarios ${short(v.low)} – ${short(v.high)}</span></div></section>
      <div class="detailgrid"><div class="col"><article class="panel"><div class="panelhead"><h2>Valuation worksheet</h2><span class="cap">USD</span></div><ul class="worksheet">${worksheet.map(([k, desc, n], i) => `<li class="${i === 4 ? 'totalrow' : ''}"><span>${k}<small>${esc(desc)}</small></span><b>${n}</b></li>`).join('')}</ul>
      <div class="scenario"><label for="scenario">What if TVL changed? <span id="scenario-rate">0%</span></label><input id="scenario" type="range" min="-50" max="100" step="5" value="0"><div class="scenariooutput" id="scenario-value" aria-live="polite">Scenario cap ${money(v.dollars)}</div></div></article>
      <article class="panel"><div class="panelhead"><h2>Comparable tokens</h2><span class="cap">${v.pool_n} in pool</span></div><p class="hint">${esc(band)} · ${v.sector_n} exact-sector peers. The examples below are nearest in TVL within each matching scope.</p><table class="peer"><thead><tr><th>Token record</th><th class="num">Market cap</th><th class="num">Cap / TVL</th></tr></thead><tbody>${peers}</tbody></table></article></div>
      <div class="col"><article class="panel playbook"><div class="playhead"><h2>Farm playbook</h2>${tag(f.mode + ' · ' + f.chain)}</div><div class="budget"><div><b>${money(f.capital)}</b><small>Example principal</small></div><div><b>${money(f.fee_cap)}</b><small>Round-trip fee cap</small></div><div><b>${f.minutes} min</b><small>Active research</small></div></div>
      <ol class="steps">${p.farm_steps.map((t, i) => `<li><span class="stepnum">${String(i + 1).padStart(2, '0')}</span><div><strong>${steps[i]}</strong><p>${esc(t)}</p></div></li>`).join('')}</ol><p class="risk">${esc(f.risk)}</p></article>
      <article class="panel"><h3>Evidence &amp; access</h3><p class="hint">${esc(f.source_grade)} · ${esc(f.reference.name)}</p><code class="ref">${esc(f.reference.url)}</code><p class="source-note">Snapshot networks · ${esc(p.chains.join(', ') || 'Unknown')}. No campaign or payout is assumed. The sealed file has no parent field for independently screened rows.</p></article></div></div>`
    );
  }
  function recordDetail(p, s) {
    const reason = p.status.startsWith('Recorded')
      ? 'A recorded identifier moves this protocol into the token register. A missing market cap is kept unknown.'
      : 'The conservative identity screen set this record aside. The snapshot has no parent field for independent verification.';
    return (
      back(p, s) +
      section('Snapshot record', p.name, p.status) +
      `<div class="methods"><article class="panel"><h2>Sealed record</h2><ul class="worksheet">${[
        ['Sector', p.category],
        ['TVL', money(p.tvl_usd)],
        ['Reported market cap', money(p.mcap_usd)],
        ['7-day TVL', pct(p.change_7d)],
        ['Listed since', date(p.listed_at)],
        ['Token symbol', p.symbol],
        ['CoinGecko ID', p.gecko_id],
      ]
        .map(([k, x]) => `<li><span>${k}</span><b>${esc(x ?? 'Unknown')}</b></li>`)
        .join(
          '',
        )}</ul></article><article class="panel"><h2>Screening decision</h2><p>${esc(p.status)}. ${reason}</p><p>Networks · ${esc(p.chains.join(', ') || 'Unknown')}</p><code class="ref">${esc(p.slug)}</code></article></div>`
    );
  }
  function audit(s) {
    const subset = ['Recorded', 'Screened out'].includes(s.set) ? s.set : 'Recorded',
      pool = subset === 'Recorded' ? recorded : aside;
    const statuses = [...new Set(pool.map((p) => p.status))].sort();
    const list = pool.filter(
      (p) =>
        (!s.reason || s.reason === p.status) &&
        (!s.q || (p.name + ' ' + p.slug).toLowerCase().includes(s.q.toLowerCase())),
    );
    const { shown, footer } = paginate(list, s);
    return (
      section(
        'Protocol ledger',
        'Snapshot audit',
        'Trace every input record to its ranked, recorded-token or screened-out outcome.',
      ) +
      `<div class="auditblocks">${[
        [C.ranked, 'Ranked candidates'],
        [C.priced, 'Token records with a cap'],
        [C.recorded - C.priced, 'Token records without a cap'],
      ]
        .map(([n, t]) => `<div class="panel"><div class="n">${n}</div><span class="small">${t}</span></div>`)
        .join(
          '',
        )}</div><div class="sectionhead"><h2>Record register <span class="total">${list.length}</span></h2>${modeButtons(
        'set',
        [
          ['Recorded', 'Token recorded · ' + C.recorded],
          ['Screened out', 'Screened out · ' + C.excluded],
        ],
        subset,
      )}</div>
      <section class="directory"><div class="filterline">${search(s.q)}${select('reason', 'All decisions', statuses, s.reason)}<button data-clear class="clear">Reset</button></div><div class="tablewrap"><table><thead><tr><th>Protocol</th><th>Decision</th><th>Token</th><th class="num">Market cap</th><th class="num">TVL</th><th></th></tr></thead><tbody>${shown.map((p) => `<tr class="selectable" data-row="${esc(p.slug)}"><td>${nameCell(p, p.category || 'Unclassified')}</td><td>${esc(p.status)}</td><td>${esc(p.symbol || p.gecko_id || '—')}</td><td class="num val">${short(p.mcap_usd)}</td><td class="num">${short(p.tvl_usd)}</td><td class="chev">›</td></tr>`).join('')}</tbody></table></div>${list.length ? '' : '<p class="empty">No matching records.</p>'}${footer}</section>`
    );
  }
  function method() {
    const x = M.crosscheck;
    return (
      section(
        'Research notes',
        'Method & evidence',
        'From the frozen DefiLlama records to one conditional estimate and one usable plan per candidate.',
      ) +
      `<div class="methods"><article class="panel"><h2>01 / Eligibility</h2><p>All ${C.watchlist} official watchlist slugs are included. Additional rows must be below ${short(M.floor_usd, 0)}, with both token fields null. We screen wrapper and bridge categories, exchange prefixes, versioned names, named assets, token-family name matches, ambiguous sibling products and chain-branded markets.</p><p>Parent relationships are absent from the ten input fields. Above-floor omissions stay outside the ranking. Below-floor matches remain candidates for manual review.</p></article>
      <article class="panel"><h2>02 / Conditional valuation</h2><div class="formula">TVL × peer cap/TVL × 7d factor × listing-age factor</div><p>One token identity contributes one priced record, its largest eligible TVL. Sector, business-family and global log multiples are pooled. Thin sectors borrow more information from the wider pool.</p><p>Scenarios use the same calculation at the 25th and 75th peer quantiles. They describe peer dispersion. No token price, supply, launch odds or personal reward is inferred.</p></article>
      <article class="panel"><h2>03 / Model assumptions</h2><p>Sector weight is n/(n+6). Family weight is m/(m+12). Weekly TVL is bounded at −50% and +100%, then enters at power 0.35. Listing-age seasoning is neutral at 365 days and stops rising at 1,095 days. Missing growth or age gets a factor of 1.</p><p>Each record shows its own arithmetic. Equal estimates break by slug. Dates, TVL, token identifiers and observed market caps come exclusively from the sealed input.</p></article>
      <article class="panel"><h2>04 / Held-out peer check</h2><div class="formula">${x.within2} / ${x.n} observed caps within a factor of two</div><p>Remove one token identity at a time and refit. The median multiplicative error is ${x.median_factor.toFixed(2)}×. A global-median-only benchmark gives ${x.baseline_factor.toFixed(2)}×.</p><p>This is a cross-sectional check on existing tokens. The snapshot contains no future launches or realized airdrops against which to test these candidates.</p></article>
      <article class="panel"><h2>05 / Farm assumptions</h2><p>Plans separate observe-only research from optional small trials. Budgets cap total entry, approval, spread and exit costs. The principal and time are illustrative. The seven-day check-in is a review cadence; a product’s queue or unlock controls actual settlement.</p><p>A product-specific reference is shown where reviewed. Other plans state their category-based basis and require verification of the exact deployment before using funds.</p></article>
      <article class="panel"><h2>06 / Provenance</h2><p>${esc(M.source)}. The kit contains protocols at or above $5M TVL. Every one of its ${C.input} records has a decision in this edition.</p><code class="ref">SHA-256 ${esc(M.snapshot_sha256)}</code><p>Source notes with official documentation, governance discussions and dashboard references are included in RESEARCH.md in the source package.</p></article></div>`
    );
  }
  function render() {
    const s = state(),
      view = s.view || 'radar',
      focus = document.activeElement,
      id = focus?.id;
    const caret = id === 'q' ? [focus.selectionStart, focus.selectionEnd] : null;
    const p = s.p && bySlug.get(s.p);
    for (const a of document.querySelectorAll('[data-nav]')) {
      const on = a.dataset.nav === view;
      a.classList.toggle('current', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    root.innerHTML = p ? detail(p, s) : view === 'audit' ? audit(s) : view === 'method' ? method() : radar(s);
    document.title =
      (p
        ? p.name
        : view === 'method'
          ? 'Method & evidence'
          : view === 'audit'
            ? 'Snapshot audit'
            : 'Token launch radar') + ' · Meridian';
    document.getElementById('footer-snapshot').textContent = date(M.as_of) + ' UTC · DefiLlama';
    if (id) {
      const el = document.getElementById(id);
      if (el) {
        el.focus({ preventScroll: true });
        if (caret && el.type === 'search' && caret[0] != null) el.setSelectionRange(...caret);
      }
    }
  }
  root.addEventListener('click', (e) => {
    const el = e.target.closest('button,[data-row],a');
    if (!el) return;
    const s = state();
    if (el.matches('a')) return;
    if (el.hasAttribute('data-clear'))
      return change({ cohort: null, category: null, chain: null, mode: null, q: null, reason: null, page: null });
    if (el.dataset.set)
      return change({
        [el.dataset.set]: el.dataset.value,
        page: null,
        ...(el.dataset.set === 'set' ? { reason: null } : {}),
      });
    if (el.dataset.sort) {
      const k = el.dataset.sort,
        old = s.sort || 'cap',
        current = s.dir || (old === 'name' || old === 'rank' ? 'asc' : 'desc');
      return change({
        sort: k,
        dir: old === k ? (current === 'asc' ? 'desc' : 'asc') : k === 'name' || k === 'rank' ? 'asc' : 'desc',
        page: null,
      });
    }
    if (el.dataset.page) return change({ page: el.dataset.page });
    if (el.dataset.row) return change({ p: el.dataset.row }, false, true);
  });
  root.addEventListener('input', (e) => {
    if (e.target.id === 'q') return change({ q: e.target.value, page: null }, true);
    if (e.target.id === 'scenario') {
      const p = bySlug.get(state().p),
        v = p.valuation,
        delta = Number(e.target.value);
      document.getElementById('scenario-rate').textContent = (delta > 0 ? '+' : '') + delta + '%';
      document.getElementById('scenario-value').textContent =
        'Scenario cap ' + money(V.price(p.tvl_usd * (1 + delta / 100), v.multiple, p.change_7d, v.days).dollars);
    }
  });
  root.addEventListener('change', (e) => {
    if (e.target.dataset.filter) change({ [e.target.dataset.filter]: e.target.value, page: null });
  });
  document.addEventListener('keydown', (e) => {
    if (
      e.key === '/' &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)
    ) {
      const q = document.getElementById('q');
      if (q) {
        e.preventDefault();
        q.focus();
      }
    }
  });
  let last = state();
  window.addEventListener('hashchange', () => {
    const s = state();
    render();
    if (s.p !== last.p || s.view !== last.view) {
      window.scrollTo(0, 0);
      root.focus({ preventScroll: true });
    }
    last = s;
  });
  render();
})();
