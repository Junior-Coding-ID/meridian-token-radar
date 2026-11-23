// Meridian dashboard (v2): the offline reader for data.js.
//
// Views, all hash-routed so the page works from a plain file open:
//   #view=radar    ranked table, valuation curve, coverage, Top-5 spotlight
//   #view=audit    snapshot counts, crosscheck, recorded and aside lists
//   #view=method   the model, the screening rules, the farm-plan rules
//   #row=<slug>    one ranked protocol: worksheet, scenario, peers, farm plan
(() => {
  'use strict';
  const root = document.getElementById('content');
  const D = globalThis.MERIDIAN_DATA;
  const V = globalThis.MeridianValuation;
  if (!D || !V) {
    root.innerHTML =
      '<p class="notice">The local data file could not be opened. Extract the full archive and open dashboard/index.html again.</p>';
    return;
  }
  const { metadata: M, rows, recorded, aside } = D;
  const C = M.counts;
  const bySlug = new Map([...rows, ...recorded, ...aside].map((p) => [p.slug, p]));

  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const utc = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const esc = (x) =>
    String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const money = (n) => (n == null ? '—' : usd.format(n));
  function short(n) {
    if (n == null) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return usd.format(n);
  }
  function pct(n) {
    if (n == null) return '—';
    return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
  }
  const footer = document.getElementById('footer-snapshot');
  if (footer) footer.textContent = `Snapshot ${M.as_of} · ${M.source}`;

  // ------------------------------------------------------------ table state
  const state = { q: '', category: '', cohort: 'All', sort: 'rank', page: 0 };
  const PAGE = 25;

  function filteredRows() {
    let list = rows;
    if (state.cohort !== 'All') list = list.filter((r) => r.cohort === state.cohort);
    if (state.category) list = list.filter((r) => r.category === state.category);
    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.slug.includes(q) ||
          r.category.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    if (state.sort === 'value') sorted.sort((a, b) => b.implied_value_usd - a.implied_value_usd);
    else if (state.sort === 'tvl') sorted.sort((a, b) => b.tvl_usd - a.tvl_usd);
    else if (state.sort === 'multiple') sorted.sort((a, b) => b.valuation.multiple - a.valuation.multiple);
    else if (state.sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => a.rank - b.rank);
    return sorted;
  }

  // ------------------------------------------------------------ radar view
  function curveSvg() {
    const W = 600;
    const H = 125;
    const xs = rows.map((r) => Math.log10(r.tvl_usd));
    const ys = rows.map((r) => Math.log10(r.valuation.multiple));
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const px = (v) => 34 + ((v - x0) / (x1 - x0)) * (W - 52);
    const py = (v) => H - 22 - ((v - y0) / (y1 - y0)) * (H - 40);
    const topSlugs = new Set(M.top5.map((t) => t.slug));
    const dots = rows
      .map((r) => {
        const top = topSlugs.has(r.slug);
        return `<circle cx="${px(Math.log10(r.tvl_usd)).toFixed(1)}" cy="${py(Math.log10(r.valuation.multiple)).toFixed(1)}" r="${top ? 4 : 2}" fill="${top ? '#e3bd75' : '#8fc3a8'}" opacity="${top ? 1 : 0.75}"/>`;
      })
      .join('');
    const labels = M.top5
      .map((t) => {
        const r = bySlug.get(t.slug);
        return `<text class="point-label" x="${(px(Math.log10(r.tvl_usd)) + 6).toFixed(1)}" y="${(py(Math.log10(r.valuation.multiple)) - 4).toFixed(1)}">#${r.rank}</text>`;
      })
      .join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Implied multiple against TVL for the ${rows.length} ranked protocols">
      <line class="axis" x1="34" y1="${H - 22}" x2="${W - 18}" y2="${H - 22}"/>
      <line class="axis" x1="34" y1="8" x2="34" y2="${H - 22}"/>
      ${dots}${labels}
      <text x="34" y="${H - 8}">${short(Math.pow(10, x0))} TVL</text>
      <text x="${W - 18}" y="${H - 8}" text-anchor="end">${short(Math.pow(10, x1))} TVL</text>
      <text x="38" y="14">×${Math.pow(10, y1).toFixed(2)}</text>
      <text x="38" y="${H - 26}">×${Math.pow(10, y0).toFixed(2)}</text>
    </svg>`;
  }

  function spotlightHtml() {
    const cards = M.top5
      .map((t) => {
        const r = bySlug.get(t.slug);
        return `<div style="border:1px solid var(--line);border-radius:9px;padding:13px 15px;background:#fbfcf7">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="display:grid;place-content:center;width:26px;height:26px;border-radius:50%;background:#143d38;color:#fff4d3;font:700 12px var(--mono)">#${r.rank}</span>
            <strong style="font-size:15px">${esc(r.name)}</strong>
          </div>
          <div style="font-size:22px;font-weight:650;color:var(--green);letter-spacing:-0.6px">${money(r.implied_value_usd)}</div>
          <div class="small" style="margin-top:3px">Peer range ${money(t.low)} – ${money(t.high)}</div>
          <div class="small">Multiple ×${r.valuation.multiple.toFixed(3)} · ${esc(r.category)}</div>
          <div style="margin-top:8px"><a class="textlink" href="#row=${esc(r.slug)}">Open the worksheet →</a></div>
        </div>`;
      })
      .join('');
    return `<section class="panel" style="margin-bottom:25px">
      <div class="sectionhead"><h2>Top-5 spotlight</h2><span class="total">${esc(M.model)}</span></div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px">${cards}</div>
    </section>`;
  }

  function tableHtml(list) {
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    const page = Math.min(state.page, pages - 1);
    const slice = list.slice(page * PAGE, page * PAGE + PAGE);
    const body = slice
      .map((r) => {
        const change = r.change_7d;
        return `<tr class="selectable">
          <td class="rank">#${r.rank}</td>
          <td><div class="namewrap"><span class="monogram">${esc(r.name.slice(0, 2).toUpperCase())}</span>
            <span><button class="rowname" data-row="${esc(r.slug)}">${esc(r.name)}</button>
            <span class="sub">${esc(r.chains[0] ?? '')}${r.chains.length > 1 ? ` +${r.chains.length - 1}` : ''} · ${esc(r.category)}</span></span></div></td>
          <td><span class="pill ${r.cohort === 'Watchlist' ? 'watch' : 'early'}">${esc(r.cohort)}</span></td>
          <td class="num">${money(r.tvl_usd)}</td>
          <td class="num ${change == null ? '' : change >= 0 ? 'positive' : 'negative'}">${pct(change)}</td>
          <td class="num">×${r.valuation.multiple.toFixed(3)}</td>
          <td class="num val">${money(r.implied_value_usd)}</td>
          <td><a href="#row=${esc(r.slug)}" aria-label="Open ${esc(r.name)}"><span class="chev">›</span></a></td>
        </tr>`;
      })
      .join('');
    return `<div class="tablewrap"><table>
      <thead><tr><th>Rank</th><th>Protocol</th><th>Cohort</th><th class="num">TVL</th><th class="num">7d</th><th class="num">Multiple</th><th class="num">Implied value</th><th></th></tr></thead>
      <tbody>${body || '<tr><td colspan="8" class="empty">No protocol matches these filters.</td></tr>'}</tbody>
    </table></div>
    <div class="pageline"><span>Showing ${list.length === 0 ? 0 : page * PAGE + 1}–${Math.min(list.length, (page + 1) * PAGE)} of ${list.length}</span>
      <span class="pager"><button class="pagebtn" data-page="prev" ${page === 0 ? 'disabled' : ''}>‹ Prev</button>
      <span>Page ${page + 1} of ${pages}</span>
      <button class="pagebtn" data-page="next" ${page >= pages - 1 ? 'disabled' : ''}>Next ›</button></span></div>`;
  }

  function renderRadar() {
    const categories = [...new Set(rows.map((r) => r.category))].sort();
    const list = filteredRows();
    const rankedPct = Math.round((C.ranked / C.input) * 100);
    const recordedPct = Math.round((C.recorded / C.input) * 100);
    const asidePct = 100 - rankedPct - recordedPct;
    root.innerHTML = `
    <div class="intro"><div><p class="eyebrow">Token launch radar · sealed snapshot</p>
      <h1>Which unpriced protocol would be worth what — if it launched?</h1>
      <p>147 protocols with no live token, valued off 89 priced peers. Every number below is reproducible from the snapshot in board.json.</p></div>
      <div class="datebox"><span class="fieldname">Snapshot</span><span>${esc(utc.format(new Date(`${M.as_of}T00:00:00Z`)))}</span></div></div>
    <div class="hero-grid">
      <section class="curve"><div class="curve-top"><h2>Valuation curve</h2><span class="cap">Implied multiple × TVL · log scales</span></div>
        ${curveSvg()}<div class="curve-note">Gold dots are the top 5 · ${esc(M.model)}</div></section>
      <section class="coverage"><div><h2>Coverage</h2><span class="cap">${C.input} protocols in the snapshot</span></div>
        <div class="stack"><i class="lg-rank" style="width:${rankedPct}%;background:#1e735e"></i><i class="lg-listed" style="width:${recordedPct}%;background:#92aba4"></i><i class="lg-aside" style="width:${asidePct}%;background:#dbc9a1"></i></div>
        <div class="keys"><div><strong>${C.ranked}</strong><small>Ranked</small></div><div><strong>${C.recorded}</strong><small>Recorded</small></div><div><strong>${C.excluded}</strong><small>Aside</small></div></div>
        <div class="under"><span>${C.watchlist} on the official watchlist · ${C.peers} priced peers</span><a href="#view=audit">Snapshot audit →</a></div></section>
    </div>
    ${spotlightHtml()}
    <section class="panel directory">
      <div class="sectionhead" style="padding:21px 23px 0"><h2>Ranked table <span class="total">${list.length} shown</span></h2>
        <div class="seg" role="group" aria-label="Cohort">
          ${['All', 'Watchlist', 'Below floor'].map((c) => `<button data-cohort="${c}" class="${state.cohort === c ? 'on' : ''}">${c}</button>`).join('')}
        </div></div>
      <div class="filterline">
        <label class="searchbox"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input id="q" type="search" placeholder="Search name, slug or category" value="${esc(state.q)}" aria-label="Search protocols"><kbd>/</kbd></label>
        <label class="selectbox"><select id="cat" aria-label="Category"><option value="">All categories</option>
          ${categories.map((c) => `<option ${state.category === c ? 'selected' : ''} value="${esc(c)}">${esc(c)}</option>`).join('')}</select></label>
        <label class="selectbox"><select id="sort" aria-label="Sort by">
          ${[['rank', 'Rank'], ['value', 'Implied value'], ['tvl', 'TVL'], ['multiple', 'Multiple'], ['name', 'Name']].map(([v, l]) => `<option value="${v}" ${state.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <button class="clear" id="clear" ${state.q || state.category || state.cohort !== 'All' ? '' : 'disabled'}>Clear</button>
      </div>
      ${tableHtml(list)}
    </section>`;
    document.getElementById('q').addEventListener('input', (e) => {
      state.q = e.target.value;
      state.page = 0;
      renderRadar();
      const q = document.getElementById('q');
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
    });
    document.getElementById('cat').addEventListener('change', (e) => {
      state.category = e.target.value;
      state.page = 0;
      renderRadar();
    });
    document.getElementById('sort').addEventListener('change', (e) => {
      state.sort = e.target.value;
      renderRadar();
    });
    document.getElementById('clear').addEventListener('click', () => {
      Object.assign(state, { q: '', category: '', cohort: 'All', sort: 'rank', page: 0 });
      renderRadar();
    });
    root.querySelectorAll('[data-cohort]').forEach((b) =>
      b.addEventListener('click', () => {
        state.cohort = b.dataset.cohort;
        state.page = 0;
        renderRadar();
      }),
    );
    root.querySelectorAll('[data-page]').forEach((b) =>
      b.addEventListener('click', () => {
        state.page += b.dataset.page === 'next' ? 1 : -1;
        renderRadar();
      }),
    );
    root.querySelectorAll('[data-row]').forEach((b) =>
      b.addEventListener('click', () => {
        location.hash = `#row=${b.dataset.row}`;
      }),
    );
  }

  // ------------------------------------------------------------ detail view
  function renderDetail(slug) {
    const r = bySlug.get(slug);
    if (!r || r.rank == null) {
      root.innerHTML = `<p class="notice">No ranked protocol with that id. <a href="#view=radar">Back to the radar</a>.</p>`;
      return;
    }
    const v = r.valuation;
    const f = r.farm;
    const peerRows = v.peers
      .map(
        (p) => `<tr><td><a href="#row=${esc(p.slug)}">${esc(p.name)}</a></td><td>${esc(p.category)}</td><td>${esc(p.scope)}</td><td class="num">${money(p.tvl)}</td><td class="num">${money(p.cap)}</td><td class="num">×${p.ratio.toFixed(2)}</td></tr>`,
      )
      .join('');
    root.innerHTML = `
    <a class="back" href="#view=radar">← Back to the radar</a>
    <section class="detailhero"><div><p class="eyebrow">Rank #${r.rank} · ${esc(r.cohort)}</p>
      <h1>${esc(r.name)}</h1>
      <div class="tags"><span class="tag">${esc(r.category)}</span><span class="tag">${esc(v.family ?? 'No family')}</span><span class="tag">${esc(r.chains.join(', '))}</span></div></div>
      <div class="bigval"><span class="cap">Implied value at launch</span><strong>${money(r.implied_value_usd)}</strong>
      <span class="mono">Peer range ${money(v.low)} – ${money(v.high)}</span><br><span class="mono">Multiple ×${v.multiple.toFixed(3)} (low ×${v.lower_multiple.toFixed(3)} · high ×${v.upper_multiple.toFixed(3)})</span></div></section>
    <div class="detailgrid"><div class="col">
      <section class="panel"><div class="panelhead"><h2>Valuation worksheet</h2><span class="cap">${esc(M.model)}</span></div>
        <ul class="worksheet">
          <li><span>TVL<small>Sealed snapshot, ${esc(M.as_of)}</small></span><b>${money(r.tvl_usd)}</b></li>
          <li><span>7-day TVL change<small>Bounded −50% / +100%, power 0.35</small></span><b>${pct(r.change_7d)} → ×${v.growth_factor.toFixed(4)}</b></li>
          <li><span>Listed ${r.listed_at ? utc.format(new Date(`${r.listed_at}T00:00:00Z`)) : '—'}<small>${v.days == null ? 'No listing date' : `${v.days} days · neutral at 365, capped at 1,095`}</small></span><b>×${v.age_factor.toFixed(4)}</b></li>
          <li><span>Sector multiple<small>${esc(r.category)} · ${v.sector_n} priced peer${v.sector_n === 1 ? '' : 's'}</small></span><b>×${v.multiple.toFixed(4)}</b></li>
          <li><span>Family / pool<small>${esc(v.family ?? '—')} · ${v.family_n} peers · pool ${v.pool_n}</small></span><b>low ×${v.lower_multiple.toFixed(3)} · high ×${v.upper_multiple.toFixed(3)}</b></li>
          <li class="totalrow"><span>Implied value</span><b>${money(v.dollars)}</b></li>
        </ul>
        <div class="scenario"><label><span>Try another multiple</span><span id="scen-out">${money(v.dollars)}</span></label>
          <input id="scen" type="range" min="0.01" max="2" step="0.01" value="${v.multiple.toFixed(2)}" aria-label="Multiple">
          <div class="scenariooutput">At ×<span id="scen-mult">${v.multiple.toFixed(2)}</span> the same TVL, growth and age give <span id="scen-val">${money(v.dollars)}</span>.</div></div>
      </section>
      <section class="panel"><div class="panelhead"><h2>Closest peers</h2><span class="cap">By log TVL</span></div>
        <div class="tablewrap"><table class="peer"><thead><tr><th>Peer</th><th>Category</th><th>Scope</th><th class="num">TVL</th><th class="num">Cap</th><th class="num">Ratio</th></tr></thead>
        <tbody>${peerRows}</tbody></table></div></section>
    </div><div class="col">
      <section class="panel"><div class="panelhead"><h2>Farm plan · ${esc(f.route)}</h2><span class="cap">${esc(f.source_grade)}</span></div>
        <div class="budget"><div><b>${f.minutes} min</b><small>Active time</small></div><div><b>$${f.capital}</b><small>Principal</small></div><div><b>$${f.fee_cap}</b><small>Fee cap</small></div></div>
        <p class="small">Mode: ${esc(f.mode)} on ${esc(f.chain)}. ${esc(f.risk)}</p>
        <ol class="steps">${r.farm_steps.map((s, i) => `<li><span class="stepnum">${String(i + 1).padStart(2, '0')}</span><span><strong>Step ${i + 1}</strong><p>${esc(s)}</p></span></li>`).join('')}</ol>
        <p class="risk">${esc(f.risk)}</p>
        <p class="detailnote"><span class="cap">Reference</span><a class="ref" href="${esc(f.reference.url)}" target="_blank" rel="noreferrer">${esc(f.reference.name)}</a></p>
        <p class="detailnote small">Plan ${esc(f.version)} · No reward is assumed. A vault share does not establish entitlement to a future token.</p>
      </section>
    </div></div>`;
    const scen = document.getElementById('scen');
    scen.addEventListener('input', () => {
      const mult = Number(scen.value);
      const value = Math.round(r.tvl_usd * mult * v.growth_factor * v.age_factor);
      document.getElementById('scen-mult').textContent = mult.toFixed(2);
      document.getElementById('scen-val').textContent = money(value);
      document.getElementById('scen-out').textContent = money(value);
    });
  }

  // ------------------------------------------------------------ audit view
  function renderAudit() {
    const blocks = [
      ['Input', C.input, 'protocols in the snapshot'],
      ['Watchlist', C.watchlist, 'officially tracked'],
      ['Ranked', C.ranked, 'valued on this board'],
      ['Recorded', C.recorded, 'already have a token'],
      ['Priced', C.priced, 'with a market cap'],
      ['Excluded', C.excluded, 'set aside with a reason'],
    ];
    const byStatus = new Map();
    for (const a of aside) byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1);
    const statusRows = [...byStatus.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `<tr><td>${esc(s)}</td><td class="num">${n}</td></tr>`)
      .join('');
    const recordedRows = recorded
      .slice(0, 50)
      .map(
        (p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td class="num">${money(p.tvl_usd)}</td><td class="num">${money(p.mcap_usd)}</td><td>${esc(p.status)}</td></tr>`,
      )
      .join('');
    root.innerHTML = `
    <div class="intro"><div><p class="eyebrow">Snapshot audit</p><h1>What the snapshot held, and where it went</h1>
      <p>Source: ${esc(M.source)}. SHA-256 <span class="mono">${esc(M.snapshot_sha256.slice(0, 16))}…</span> · floor ${money(M.floor_usd)}.</p></div></div>
    <div class="auditblocks">${blocks.map(([n, v, s]) => `<section class="panel"><div class="n">${v}</div><div class="small">${esc(s)}</div><div class="cap">${esc(n)}</div></section>`).join('')}</div>
    <div class="methods">
      <section class="panel"><div class="panelhead"><h2>Leave-one-out crosscheck</h2><span class="cap">Pool n = ${M.crosscheck.n}</span></div>
        <ul class="worksheet">
          <li><span>Within 2× of the real cap</span><b>${M.crosscheck.within2} of ${M.crosscheck.n}</b></li>
          <li><span>Median prediction error</span><b>×${M.crosscheck.median_factor.toFixed(2)}</b></li>
          <li><span>Baseline (global median only)</span><b>×${M.crosscheck.baseline_factor.toFixed(2)}</b></li>
        </ul>
        <p class="small" style="margin-top:10px">Each priced peer is removed in turn, the pooled multiple is refit without it, and its cap is predicted from its TVL with its own growth and age factors. The pooled model beats the global-median baseline.</p></section>
      <section class="panel"><div class="panelhead"><h2>Aside, by reason</h2><span class="cap">${C.excluded} records</span></div>
        <div class="tablewrap"><table><thead><tr><th>Reason</th><th class="num">Count</th></tr></thead><tbody>${statusRows}</tbody></table></div></section>
    </div>
    <section class="panel directory"><div class="sectionhead" style="padding:21px 23px 0"><h2>Recorded protocols</h2><span class="total">${C.recorded} · first 50</span></div>
      <div class="tablewrap"><table><thead><tr><th>Protocol</th><th>Category</th><th class="num">TVL</th><th class="num">Cap</th><th>Status</th></tr></thead>
      <tbody>${recordedRows}</tbody></table></div></section>`;
  }

  // ------------------------------------------------------------ method view
  function renderMethod() {
    const families = Object.entries(V.FAMILIES)
      .map(([f, sectors]) => `<li><strong>${esc(f)}</strong> — ${sectors.map(esc).join(', ')}</li>`)
      .join('');
    root.innerHTML = `
    <div class="intro"><div><p class="eyebrow">Method</p><h1>How a number on this board is made</h1>
      <p>Everything is computed from the sealed snapshot. No live prices, no hand-picked comps.</p></div></div>
    <div class="methods">
      <section class="panel"><h2>The pooled multiple</h2>
        <p>For a protocol, take the median of ln(market cap / TVL) over the priced peers in its sector, its family and the whole pool, then shrink them together:</p>
        <div class="formula">log(multiple) = (n·S + 6·Fp) / (n + 6)<br>Fp = (m·F + 12·G) / (m + 12)</div>
        <p>S is the sector median (n peers), F the family median (m peers), G the global median. A sector with no priced peers falls back to its family prior; a family with none falls back to the global median. The low and high scenarios run the same blend at the 25th and 75th peer quantiles.</p>
        <p>Then: value = TVL × multiple × growth × age, rounded to the dollar.</p></section>
      <section class="panel"><h2>Growth and age</h2>
        <p>Growth: the 7-day TVL change, bounded to −50% / +100%, at power 0.35. No 7-day change means a factor of 1.</p>
        <div class="formula">growth = (1 + clamp(change₇d, −50, +100) / 100)^0.35</div>
        <p>Age: listing seasoning, neutral at 365 days and capped at 1,095 days, rising with the log of age:</p>
        <div class="formula">age = 0.4712 + 0.0864 · ln(min(days, 1095) + 90)</div>
        <p>No listing date means a factor of 1.</p></section>
      <section class="panel"><h2>Screening, in order</h2>
        <ol>
          <li>A symbol means the protocol already has a token: recorded, priced when it has a market cap and a CoinGecko id.</li>
          <li>The 40 watchlist slugs are ranked whatever their category.</li>
          <li>Wrapper, bridge and custody categories, or a name containing “staking”, go aside.</li>
          <li>Names ending in a version (V2, V3…) go aside.</li>
          <li>A first word shared by two or more survivors with a product second word (dex, vault, cdp…) is a sibling product, aside.</li>
          <li>TVL at or above the $${(M.floor_usd / 1e6).toFixed(0)}M floor, outside the official list, goes aside.</li>
          <li>Named assets (avETH-style tickers, *USD stablecoins, Pre-Launch products) go aside.</li>
          <li>Chain-branded products (XRPL DEX, Tempo Stablecoin Dex) go aside.</li>
          <li>A first word matching a recorded token's symbol or CoinGecko id is a parent-name match, aside.</li>
          <li>Everything left is ranked below the floor.</li>
        </ol></section>
      <section class="panel"><h2>Families</h2><ul>${families}</ul>
        <p>Sectors with no family (AI Agents, DOR, Decentralized AI, NFT Marketplace) use the global pool directly.</p>
        <h2 style="margin-top:16px">Farm plans</h2>
        <p>Curated vaults, vault shares, spot quotes and supply-only routes allow a small trial: 25 minutes, $25 principal, fee cap $2 ($5 on Ethereum). Every other route is research-only: 15 minutes, $0. The watchlist note or a named-product specific overrides the generic steps.</p></section>
    </div>
    <section class="panel"><h2>Sources</h2>
      <ul class="methodrefs">
        <li>Snapshot: ${esc(M.source)}</li>
        <li>SHA-256: <span class="mono">${esc(M.snapshot_sha256)}</span></li>
        <li>Model: ${esc(M.model)} · floor ${money(M.floor_usd)} · currency ${esc(M.currency)}</li>
        <li>Target: ${esc(M.target)}</li>
      </ul><span class="source-note">The dossier (dossier.json) is the machine-readable record of this dashboard: its screenshots and its source, built by vendor/makefun-board.ts.</span></section>`;
  }

  // ------------------------------------------------------------ routing
  function route() {
    const hash = location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash.replace(/;/g, '&'));
    document.querySelectorAll('nav a[data-nav]').forEach((a) => a.classList.remove('current'));
    if (params.has('row')) {
      renderDetail(params.get('row'));
      return;
    }
    const view = params.get('view') || 'radar';
    const nav = document.querySelector(`nav a[data-nav="${view}"]`);
    if (nav) nav.classList.add('current');
    if (view === 'audit') renderAudit();
    else if (view === 'method') renderMethod();
    else renderRadar();
  }
  window.addEventListener('hashchange', route);
  route();
})();
