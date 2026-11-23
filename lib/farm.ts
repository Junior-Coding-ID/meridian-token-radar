// Meridian farm plans (v2): what a researcher does next for each ranked
// protocol, and what it costs in time and money. Nothing here moves funds:
// every plan is either a small capped trial or research-only observation.
//
// A plan is chosen by category route, then refined by the watchlist note
// (lib/watchlist-notes.ts) or by the named-product specifics below.

export const FARM_PLAN_VERSION = 'v2';

export interface FarmReference {
  name: string;
  url: string;
}

export interface FarmPlan {
  route: string;
  mode: 'Small trial' | 'Observe';
  chain: string;
  minutes: number;
  capital: number;
  fee_cap: number;
  risk: string;
  reference: FarmReference;
  source_grade: 'Named product research' | 'Category-based checklist';
  version: string;
}

export interface WatchlistNote {
  chain?: string;
  source?: string;
  url?: string;
  inspect?: string;
  action?: string;
  exit?: string;
  mode?: 'Small trial' | 'Observe';
}

export interface RankedRecord {
  slug: string;
  name: string;
  category: string;
  chains: string[];
}

// Routes that allow a small capped trial; every other route is
// research-only observation.
const TRIAL_ROUTES = new Set(['Curated vault', 'Vault shares', 'Spot quote', 'Supply only']);

// The chain a plan runs on: the watchlist note's chain first, then a named
// override, then the first chain in this preference order that the protocol
// actually lists, then its first listed chain.
const CHAIN_PREFERENCE = ['Base', 'Arbitrum', 'Solana', 'Monad', 'Ethereum'];

const ROUTE_BY_CATEGORY: Record<string, string> = {
  'Basis Trading': 'Paper position',
  CDP: 'Collateral review',
  CeDeFi: 'Access review',
  Chain: 'Network activity',
  'Collateral Markets': 'Lockup review',
  Derivatives: 'Paper position',
  Dexs: 'Spot quote',
  'Dual-Token Stablecoin': 'Collateral review',
  'Governance Incentives': 'Network activity',
  Indexes: 'Read-only review',
  Insurance: 'Lockup review',
  'Interest Rate Derivatives': 'Paper position',
  Lending: 'Supply only',
  'Leveraged Farming': 'Paper position',
  'Liquidity Manager': 'Liquidity preview',
  'Onchain Capital Allocator': 'Vault shares',
  Payments: 'Invoice review',
  'Prediction Market': 'Paper position',
  RWA: 'Access review',
  Restaking: 'Lockup review',
  'Risk Curators': 'Curated vault',
  'Stablecoin Wrapper': 'Wrapper review',
  'Staking Pool': 'Lockup review',
  'Uncollateralized Lending': 'Access review',
  Yield: 'Vault shares',
  'Yield Aggregator': 'Vault shares',
  Farm: 'Vault shares',
};

const RISK_BY_ROUTE: Record<string, string> = {
  'Access review': 'Eligibility, counterparty exposure and restricted redemption are material.',
  'Collateral review': 'Debt liquidation and a broken peg can outweigh any incentive.',
  'Curated vault': 'Curator and host are separate parties. A vault share does not establish entitlement to either token.',
  'Invoice review': 'Network utility and a future distribution have separate eligibility rules.',
  'Liquidity preview': 'Rebalancing can realize losses relative to holding the assets.',
  'Lockup review': 'Slashing, capital locks and claim conditions may persist beyond the review date.',
  'Network activity': 'Network utility and a future distribution have separate eligibility rules.',
  'Paper position': 'Leverage, funding changes and settlement rules can produce losses.',
  'Peg module review': 'Debt liquidation and a broken peg can outweigh any incentive.',
  'Read-only review': 'A public and economical entry and exit route have yet to be verified.',
  'Spot quote': 'Thin pools, manipulated prices and slippage can make small swaps uneconomic.',
  'Subnet liquidity': 'Thin pools, manipulated prices and slippage can make small swaps uneconomic.',
  'Supply only': 'Utilization can prevent withdrawals. Taking on debt adds liquidation risk.',
  'Vault shares': 'Strategy loss, fees and withdrawal queues may reduce or delay capital returned.',
  'Wrapper review': 'The wrapper unit has a separate purpose from a hypothetical protocol token.',
};

// Generic steps 2, 4 and 5 per route. {name} is the protocol's display name.
// Steps 1, 3 and 6 are the same for every plan (see buildSteps below).
const GENERIC_STEPS: Record<string, [string, string, string]> = {
  'Paper position': [
    'Identify one {name} market and its price source. Read settlement, fees and eligibility before considering exposure.',
    'On paper only, record entry, spread and funding or settlement terms. Compute the loss if the underlying moves 5% against the position.',
    'Price a close at the same size. Save both quotes, timestamps and loss estimate; reassess them at the next observation.',
  ],
  'Spot quote': [
    'Locate a documented {name} spot market on the selected network. Verify both asset identifiers, reserves and swap fees.',
    'Quote one real swap already needed. Record minimum received and compare price impact on two sizes before signing.',
    'Preview the reverse quote before entry. Record both spread and fees, and keep the execution receipt if the original trade went ahead.',
  ],
  'Curated vault': [
    'Find a vault that names {name} as curator. Match the asset, network, manager and contract address on the hosting platform.',
    'Preview a supply of one supported asset. Compare the share quote with displayed liquidity and read the collateral breakdown.',
    'Preview redeeming those shares back to the underlying asset. Record available liquidity and any queue or withdrawal fee.',
  ],
  'Vault shares': [
    'Find a {name} vault with an identifiable manager and a documented redemption path. Write down the asset and share denomination.',
    'Preview one single-asset deposit. Note expected shares, management fees and the exact vault that issues the receipt.',
    'Price a redemption back into the entry asset. If withdrawals are queued, record the settlement condition and wait for a real quote.',
  ],
  'Supply only': [
    'Inspect one {name} supply market. Read collateral and debt assets, liquidity, supply cap and withdrawal rules.',
    'Preview a small supply with borrowing switched off. Read the receipt balance and compare spend approval with the intended amount.',
    'Quote the reverse withdrawal into the original asset. Check that there is room in the pool to exit and save the receipt identifier.',
  ],
  'Liquidity preview': [
    'Read the fee tier, asset pair and range policy of one {name} managed position.',
    'Preview both legs of a liquidity deposit and compare the expected shares with the starting token balances.',
    'Preview a proportional removal. Record how the exit composition changes if price leaves the managed range.',
  ],
  'Access review': [
    'Read the issuer, jurisdiction, investor eligibility and access terms published for {name}. Record whether a public route exists.',
    'Look up the minimum, custody arrangement and fees for an eligible account. Keep the exercise read-only if access or terms are unclear.',
    'Write down the redemption calendar, settlement asset and counterparty. Set a reminder for the next terms update.',
  ],
  'Collateral review': [
    'Inspect the collateral list, oracle, minting ceiling and liquidation rule for one {name} position.',
    'Model a vault on paper with no debt. Add a hypothetical draw and lower collateral prices until the displayed safety buffer disappears.',
    'Price the debt repayment and collateral unlock. Save the liquidation threshold and the redemption or peg conditions.',
  ],
  'Network activity': [
    'Inspect the official {name} network or incentive rules. Identify the native fee unit and whether ordinary usage is documented.',
    'Follow one real transaction in a public explorer. Record its sender-facing action, fee unit and successful settlement state.',
    'Check the final receipt against the product terms and record which address or intermediary was credited.',
  ],
  'Read-only review': [
    'Locate the official {name} documentation and verify its product, deployment and access restrictions.',
    'Trace one public example through the documented interface or explorer. Save the action, asset denomination, and receipt reference.',
    'Identify how a participant unwinds the position and who controls settlement. Revisit the documentation before allocating capital.',
  ],
  'Lockup review': [
    'Identify the collateral and operator for one {name} pool; record its entry minimum, unbonding period and penalties.',
    'Inspect the deposit or coverage quote, the receipt denomination and who is allowed to withdraw. Model any slash before committing.',
    'Map the exact request, delay and claim sequence for exiting. Save the next unlock condition and revisit it before the planned exit.',
  ],
};

// Named-product specifics for watchlist rows that have no entry in
// watchlist-notes.ts: a chain override, a route override, the reference to
// check, and the inspect / action / exit steps that replace the generic ones.
interface NamedSpecific {
  chain?: string;
  route?: string;
  reference: FarmReference;
  inspect: string;
  action?: string;
  exit?: string;
}

const NAMED: Record<string, NamedSpecific> = {
  'steakhouse-financial': {
    reference: { name: 'Morpho · Steakhouse curator directory', url: 'https://app.morpho.org/curator/steakhouse-financial' },
    inspect: 'In the Morpho curator directory, filter for Steakhouse Financial and Base. Open a listed USDC vault and compare its liquidity, collateral and fees.',
    action: 'Preview a USDC deposit to that specific Steakhouse vault. Record the share estimate and contract address; compare the vault risk tier before entry.',
    exit: 'Preview redeeming the same shares to USDC. Check available liquidity, keep the vault address and save both receipts if executed.',
  },
  gauntlet: {
    reference: { name: 'Morpho · Gauntlet WETH Core on Base', url: 'https://app.morpho.org/base/vault/0x6b13c060F13Af1fdB319F52315BbbF3fb1D88844/gauntlet-weth-core' },
    inspect: 'Open the Gauntlet WETH Core listing on Base in Morpho. Match the vault address and inspect its collateral exposures, supply caps and liquid WETH.',
    action: 'Using WETH already on Base, preview a single supply and note the quoted vault shares. Include any wrapping or approval charge in the budget.',
    exit: 'Quote a redemption into WETH. Log available liquidity, shares burned and the two transaction hashes if executed.',
  },
  usdd: {
    chain: 'Tron',
    route: 'Peg module review',
    reference: { name: 'USDD · peg stability module', url: 'https://docs.usdd.io/user-guide/psm-peg-stability-module' },
    inspect: 'Read the USDD Peg Stability Module documentation. USDD already functions as a stablecoin; this board models a distinct hypothetical protocol token.',
    action: 'Preview the two directions in a supported PSM pair. Note conversion units, balance availability and network fees without minting debt.',
    exit: 'Price the debt repayment and collateral unlock. Save the liquidation threshold and the redemption or peg conditions.',
  },
  veda: {
    reference: { name: 'Veda · Boring Queue integration', url: 'https://sdk.veda.tech/docs/boring-queue-ui-integration' },
    inspect: 'Locate a partner vault whose documentation names Veda and its supported network. Match the Teller and withdrawal queue to that vault.',
    action: 'Preview one deposit and the withdrawal intent before funding. Compare share units, maturity, solver discount and any permitted fill window.',
    exit: 'If the exit uses BoringQueue, record the request ID, maturity and discount. Check actual fulfillment before marking capital returned.',
  },
  'bittensor-dtao': {
    route: 'Subnet liquidity',
    reference: { name: 'Learn Bittensor · slippage', url: 'https://guides.learnbittensor.org/staking-and-delegation/slippage' },
    inspect: 'Compare TAO and one subnet’s alpha units. Read subnet liquidity and price impact: these are already network assets.',
    action: 'On paper, quote TAO to subnet alpha and back. Compare size-dependent slippage and fees; record the subnet identifier and time.',
    exit: 'Preview the reverse quote before entry. Record both spread and fees, and keep the execution receipt if the original trade went ahead.',
  },
  onre: {
    reference: { name: 'OnRe · regulatory framework', url: 'https://docs.onre.finance/legal' },
    inspect: 'Read the OnRe segregated-account eligibility rules, including the Qualified Acquirer test and identity checks for direct participation.',
    action: 'Review the ONyc product documents and redemption terms on paper. Record the reinsurance exposure and whether the direct route is open to you.',
  },
  opentrade: {
    chain: 'Ethereum',
    reference: { name: 'OpenTrade · institutional onboarding', url: 'https://docs.opentrade.io/' },
    inspect: 'Read OpenTrade’s institutional onboarding requirements. Check which legal entity can subscribe and whether the route is available in your jurisdiction.',
    action: 'Without funding a wallet, record the product’s subscription minimum, cut-off and fee disclosures. Mark the route inaccessible unless eligibility is confirmed.',
  },
  upshift: {
    reference: { name: 'Upshift · vault lifecycle', url: 'https://docs.upshift.finance/introduction/integration-guide' },
    inspect: 'Select an Upshift vault only after verifying its allowlist, entry asset and whether the vault uses instant or queued redemption.',
    exit: 'For a queued redemption, record request shares and the vault-specific withdrawal period. Check claimability before recording a completed exit.',
  },
  symbiotic: {
    reference: { name: 'Symbiotic · vaults and epochs', url: 'https://docs.symbiotic.fi/learn/core-concepts/vault' },
    inspect: 'Pick one documented Symbiotic Ethereum vault. Identify its collateral, epoch length, delegated networks and slasher configuration.',
    exit: 'Read the vault’s epoch rule; record withdrawal request, earliest claimable epoch and final claim separately. Save the slashing window with the quote.',
  },
  saturn: {
    chain: 'Ethereum',
    route: 'Wrapper review',
    reference: { name: 'Saturn · yield-dollar contract documentation', url: 'https://github.com/saturn-organization/saturn-yield-dollar' },
    inspect: 'Saturn is on the official watchlist with category Stablecoin Wrapper. Identify the underlying asset and distinguish any wrapper receipt from a possible separate protocol token.',
    action: 'Trace an sUSDat redemption into USDat through the documented withdrawal queue. Record the share units and settlement condition without funding a wallet.',
    exit: 'Record the underlying asset, liquidity and exit limits.',
  },
  'lightning-network': {
    route: 'Invoice review',
    reference: { name: 'ACINQ · Phoenix', url: 'https://github.com/ACINQ/phoenix' },
    inspect: 'Review a Lightning payment in a wallet you already use. Note invoice amount, expiry and the routing or liquidity fee. BTC is the settlement asset.',
    action: 'For an existing payment, compare the invoice amount and final fee with the wallet receipt. Do not open a paid channel for this research exercise.',
    exit: 'Save a private note of the payment status and total fee. Review an official rules announcement before treating a payment as an eligibility signal.',
  },
  curvance: {
    reference: { name: 'Curvance · market accounting', url: 'https://app.curvance.com/transparency.html' },
    inspect: 'In Curvance on Monad, open one market and note the supply asset, paired debt asset, collateral cap and available liquidity.',
    action: 'Preview supplying only the chosen asset. Keep debt at zero and compare the receipt, approval and remaining liquidity before confirming.',
  },
  'reti-pooling': {
    reference: { name: 'Réti · validator configuration', url: 'https://txnlab.gitbook.io/reti-open-pooling/getting-started/quick-start-for-validators' },
    inspect: 'In Réti on Algorand, inspect one validator’s declared pool minimum, commission, payout interval and entry conditions.',
  },
};

function pickChain(record: RankedRecord, note: WatchlistNote | undefined, named: NamedSpecific | undefined): string {
  if (note?.chain) return note.chain;
  if (named?.chain) return named.chain;
  for (const preferred of CHAIN_PREFERENCE) {
    if (record.chains.includes(preferred)) return preferred;
  }
  return record.chains[0] ?? 'Ethereum';
}

function buildSteps(
  record: RankedRecord,
  plan: FarmPlan,
  note: WatchlistNote | undefined,
  named: NamedSpecific | undefined,
): string[] {
  const generic = GENERIC_STEPS[plan.route] ?? GENERIC_STEPS['Read-only review']!;
  const fill = (text: string): string => text.replaceAll('{name}', record.name);
  const step1 = `${record.name} · ${plan.chain}. Spend about 5 minutes on the protocol’s verified documentation. Confirm the specific product is accessible on this network; if its address, terms or exit are unclear, stop at research.`;
  const step2 = named?.inspect ?? note?.inspect ?? fill(generic[0]);
  const step3 =
    plan.mode === 'Small trial'
      ? `Planning example: up to $25 principal already on ${plan.chain}; cap combined entry, exit, spread and approvals at $${plan.fee_cap}. Allow ~20 more active minutes. Skip if the minimum, fresh quotes or fees exceed either limit.`
      : 'Research budget $0; no funds or signatures. Spend about 10 more minutes on the checks below.';
  const step4 = named?.action ?? note?.action ?? fill(generic[1]);
  const step5 = named?.exit ?? note?.exit ?? fill(generic[2]);
  const step6 = 'Recheck in 7 days, or at the published unlock if later. Match any official eligibility rules to the wallet and receipt before considering a claim. No reward is assumed.';
  return [step1, step2, step3, step4, step5, step6];
}

// The plan and its six steps for one ranked protocol.
export function planFor(
  record: RankedRecord,
  cohort: 'Watchlist' | 'Below floor',
  note?: WatchlistNote,
): { farm: FarmPlan; farm_steps: string[] } {
  const named = NAMED[record.slug];
  const route = named?.route ?? ROUTE_BY_CATEGORY[record.category] ?? 'Read-only review';
  const mode: FarmPlan['mode'] =
    note?.mode ?? (TRIAL_ROUTES.has(route) ? 'Small trial' : 'Observe');
  const chain = pickChain(record, note, named);
  const minutes = mode === 'Small trial' ? 25 : 15;
  const capital = mode === 'Small trial' ? 25 : 0;
  const fee_cap = mode === 'Small trial' ? (chain === 'Ethereum' ? 5 : 2) : 0;
  const reference: FarmReference =
    note?.source && note?.url
      ? { name: note.source, url: note.url }
      : (named?.reference ?? { name: 'DefiLlama · protocol directory', url: `https://defillama.com/protocol/${record.slug}` });
  const farm: FarmPlan = {
    route,
    mode,
    chain,
    minutes,
    capital,
    fee_cap,
    risk: RISK_BY_ROUTE[route] ?? RISK_BY_ROUTE['Read-only review']!,
    reference,
    source_grade: cohort === 'Watchlist' ? 'Named product research' : 'Category-based checklist',
    version: FARM_PLAN_VERSION,
  };
  return { farm, farm_steps: buildSteps(record, farm, note, named) };
}

// One line for the dashboard: what the plan is, where, and what it costs.
export function planSummary(farm: FarmPlan): string {
  return `${farm.mode} · ${farm.route} · ${farm.chain} · ${farm.minutes} min · $${farm.capital} · fee cap $${farm.fee_cap}`;
}
