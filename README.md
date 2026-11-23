# Meridian · Token launch radar

An offline research dashboard for the [make.fun token-radar-01 bounty](https://make.fun/bounty/token-radar-01). The 14 November 2026 sealed DefiLlama snapshot produces 147 ranked candidates, including all 40 official watchlist members and 107 discoveries below $50 million TVL. All 758 input records can be inspected. The dashboard and source are in English. The companion guide and complete farm plans are also available in Indonesian in the delivery ZIP.

## Open or rebuild

Open **dashboard/index.html** from the extracted source tree. Keep data.js at the root beside the dashboard directory. The page runs directly from disk, including search, filters, table sorting, pagination, detailed profiles, sensitivity analysis and the audit ledger. It makes no network requests.

Run with Node 22.18 or newer. The program has zero runtime dependencies.

```sh
node main.ts --input data/snapshot.json --output out
node scripts/verify.mjs out data/snapshot.json
```

A directory containing snapshot.json is also accepted as the input. In the grader, invoking **node main.ts** reads **/input/snapshot.json** and writes **/output**. With no mount and no arguments it uses the included sealed snapshot and writes **out/**. The environment variable **MAKEFUN_OUTPUT_DIR** also selects the output directory. Use **--output .** to refresh the committed root artifacts.

## What each number means

| Population | Records | Treatment |
| --- | ---: | --- |
| Official watchlist | 40 | Exact identities from the kit; every one ranked |
| Independently screened, below floor | 107 | Null token identifiers, passes the available identity checks |
| Token identifier recorded | 416 | Audit register, 128 with a positive market cap; 288 without a quoted cap |
| Other screened records | 195 | Audit register with one explicit primary reason each |
| **Total** | **758** | Every input record assigned once |

A ranked value is an estimate of the circulating market cap **if a separate protocol token launched** with today's *snapshot* fundamentals. Live-token caps measure an observed stock of circulating supply and price. The snapshot offers no initial float, token rights, launch date, future funding, allocation or wallet-specific eligibility.

### Eligibility

1. A recorded symbol or CoinGecko ID routes a record to the token register even when its market cap is missing.
2. Include the kit's official list. Membership preserves the house’s parent-relationship check. A member can still operate an existing underlying asset, stablecoin or network token.
3. Outside the list, remove wrapped, staked, custody and bridged products, versioned deployments, and above-floor omissions. The last group may have a parent that the ten exported fields cannot identify.
4. For smaller records, screen named assets, known token-family names, ambiguous sibling products and chain-branded markets. Null fields and these heuristics can miss a parent or a token and can drop unrelated projects with similar names. Inspect individual decisions under **Snapshot audit**.

Examples include WBTC, USDT0 and Binance staked ETH in the wrapper/custody group, and GMX Solana alongside the GMX EVM token identity. Saturn remains on the official list. Its playbook distinguishes sUSDat vault shares from the hypothetical protocol-level asset.

### Pricing

The code shares its calculation between Node and the browser in **dashboard/valuation.js**. An identifiable token needs a positive TVL and market cap to serve as a comparable. The model excludes custody/bridge/wrapper categories and wrapper/exchange names, then takes the largest eligible TVL row for each CoinGecko ID or fallback ticker. The snapshot yields **89** comparable identities.

For each candidate, take the logs of market-cap/TVL ratios. At the chosen quantile, shrink its business-family estimate toward the global pool with weight **m/(m+12)**, then shrink its sector estimate toward that blended family with weight **n/(n+6)**. Exponentiate to obtain the comparable multiple. The median is the base. The 25th and 75th quantiles give two dispersion scenarios, using the same factors as the base. The pools overlap intentionally; their counts are inclusive.

```text
growth = clamp(1 + change_7d / 100, 0.5, 2) ^ 0.35
age    = 0.86 + 0.14 × ln(1 + min(listed_days, 1095)/90) / ln(1 + 365/90)
cap    = round(TVL × pooled multiple × growth × age)
```

A missing age or growth report contributes a factor of one. Listing age is measured as of the snapshot date. Constants are disclosed modeling choices. Rank follows estimated whole dollars descending, with slug ascending to break ties. Protocol names, farm costs, outside research and weekly check-ins do not set prices.

**Held-out check.** Refit after removing each priced token and predict its snapshot cap. For 22 of 89 tokens, the estimate lands within a factor of two. Median absolute multiplicative error is **4.30×** versus **4.71×** for a global-median multiple alone. This measures cross-sectional error on existing tokens. A launch forecast would require historical prelaunch fundamentals and subsequent launch caps. The broad peer ranges and thin or imperfectly matched token economics are material.

### Farm plans

Every candidate has six ordered steps, a network to check, a time budget, a principal example, an all-in expense ceiling, an exit condition and a seven-day review. The 40 watchlist members have individually researched references. The 107 discoveries use product-category checklists with their protocol directory as a starting point. A network listed by DefiLlama still requires product-level verification.

- **Small trial**, 85 records. Example principal up to $25 already on the named network. Illustrative round-trip expense limit $2 on most networks or $5 on Ethereum. Count entry, approvals, exit and spread. If the fresh quote, minimum or accessibility is unsuitable, stay at preview. About 25 active minutes.
- **Observe**, 62 records. No capital, transaction or signature. About 15 active minutes to inspect a quote, queue, credit document or genuine historical action. Suitable for restricted access, leveraged venues and unclear economics.
- Save a receipt only for genuine use. Check actual product rules, regional eligibility, withdrawal liquidity and settlement timing. Review any official distribution policy if it appears. No expected reward enters the valuation.

## Source tree

| Path | Purpose |
| --- | --- |
| main.ts | Node entrypoint, immutable input reader, output builder |
| data/snapshot.json | Original sealed input, unmodified |
| dashboard/valuation.js | Eligibility, priced peer pool, pooled valuation, cross-check and interactive calculation |
| lib/farm.ts and lib/watchlist-notes.ts | Six-step routes, spending limits and verified watchlist notes |
| vendor/makefun-board.ts | Original make.fun dossier writer, unmodified |
| dashboard/ | Offline page, styles and interaction code |
| board.json and data.js | Complete ranked board and offline browser dataset |
| screenshots/ | Actual board, detail and filtered browser captures |
| dossier.json | Canonical vendor output; complete dashboard source fits the text cap |
| scripts/verify.mjs | Independent checks of the seven published file rules, board arithmetic and full audit ledger |
| scripts/capture.py | Optional repeatable screenshot capture with Playwright Python and Chromium |
| RESEARCH.md | Research sources, evidence policy and distinctions between products and token records |

For fresh screenshots after changing the code, run **node main.ts --data-only --output .**, then **python scripts/capture.py**, then **node main.ts --output .**. The optional capture tool needs Python and Playwright plus Chromium; use **CHROME_BIN** to choose a compatible browser executable. Node, the dashboard and the verifier do not depend on Python.

## Provenance and competition intake

The kit created the first commit after opening using its drand anchor and the supplied public payout address. The technical handoff includes a version-2 Git source bundle. The intake also requires an authentic build-session transcript and the entrant's wallet signature. This Work Mode environment exposed no exportable native session for this build to the kit's local or cloud discovery. The accompanying build-action journal is supporting evidence only. The official grading and prize decision run on the server. See the Indonesian submission guide in the delivery package for exact commands and the open requirement.

Released under MIT. The vendor file and snapshot attribution are recorded in THIRD-PARTY.md.

