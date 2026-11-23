import { watchlistNotes } from './watchlist-notes.ts';
export type Protocol = {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  mcap_usd: number | null;
  gecko_id: string | null;
  symbol: string | null;
};
type Route = { label: string; inspect: string; action: string; exit: string; mode?: 'Observe'; risk: string };
const route = (
  label: string,
  inspect: string,
  action: string,
  exit: string,
  risk: string,
  mode?: 'Observe',
): Route => ({ label, inspect, action, exit, risk, mode });
const routes: Record<string, Route> = {};
function assign(categories: string[], r: Route) {
  for (const c of categories) routes[c] = r;
}

assign(
  ['Risk Curators'],
  route(
    'Curated vault',
    'Find a vault that names {name} as curator. Match the asset, network, manager and contract address on the hosting platform.',
    'Preview a supply of one supported asset. Compare the share quote with displayed liquidity and read the collateral breakdown.',
    'Preview redeeming those shares back to the underlying asset. Record available liquidity and any queue or withdrawal fee.',
    'Curator and host are separate parties. A vault share does not establish entitlement to either token.',
  ),
);
assign(
  ['Yield', 'Yield Aggregator', 'Onchain Capital Allocator', 'Farm'],
  route(
    'Vault shares',
    'Find a {name} vault with an identifiable manager and a documented redemption path. Write down the asset and share denomination.',
    'Preview one single-asset deposit. Note expected shares, management fees and the exact vault that issues the receipt.',
    'Price a redemption back into the entry asset. If withdrawals are queued, record the settlement condition and wait for a real quote.',
    'Strategy loss, fees and withdrawal queues may reduce or delay capital returned.',
  ),
);
assign(
  ['Lending'],
  route(
    'Supply only',
    'Inspect one {name} supply market. Read collateral and debt assets, liquidity, supply cap and withdrawal rules.',
    'Preview a small supply with borrowing switched off. Read the receipt balance and compare spend approval with the intended amount.',
    'Quote the reverse withdrawal into the original asset. Check that there is room in the pool to exit and save the receipt identifier.',
    'Utilization can prevent withdrawals. Taking on debt adds liquidation risk.',
  ),
);
assign(
  ['Dexs'],
  route(
    'Spot quote',
    'Locate a documented {name} spot market on the selected network. Verify both asset identifiers, reserves and swap fees.',
    'Quote one real swap already needed. Record minimum received and compare price impact on two sizes before signing.',
    'Preview the reverse quote before entry. Record both spread and fees, and keep the execution receipt if the original trade went ahead.',
    'Thin pools, manipulated prices and slippage can make small swaps uneconomic.',
  ),
);
assign(
  ['Liquidity Manager'],
  route(
    'Liquidity preview',
    'Read the fee tier, asset pair and range policy of one {name} managed position.',
    'Preview both legs of a liquidity deposit and compare the expected shares with the starting token balances.',
    'Preview a proportional removal. Record how the exit composition changes if price leaves the managed range.',
    'Rebalancing can realize losses relative to holding the assets.',
    'Observe',
  ),
);
assign(
  ['CDP', 'CDP Manager', 'Dual-Token Stablecoin'],
  route(
    'Collateral review',
    'Inspect the collateral list, oracle, minting ceiling and liquidation rule for one {name} position.',
    'Model a vault on paper with no debt. Add a hypothetical draw and lower collateral prices until the displayed safety buffer disappears.',
    'Price the debt repayment and collateral unlock. Save the liquidation threshold and the redemption or peg conditions.',
    'Debt liquidation and a broken peg can outweigh any incentive.',
    'Observe',
  ),
);
assign(
  ['RWA', 'CeDeFi', 'Crypto Card Issuer', 'OTC Marketplace', 'Uncollateralized Lending'],
  route(
    'Access review',
    'Read the issuer, jurisdiction, investor eligibility and access terms published for {name}. Record whether a public route exists.',
    'Look up the minimum, custody arrangement and fees for an eligible account. Keep the exercise read-only if access or terms are unclear.',
    'Write down the redemption calendar, settlement asset and counterparty. Set a reminder for the next terms update.',
    'Eligibility, counterparty exposure and restricted redemption are material.',
    'Observe',
  ),
);
assign(
  ['Derivatives', 'Interest Rate Derivatives', 'Basis Trading', 'Leveraged Farming', 'Prediction Market'],
  route(
    'Paper position',
    'Identify one {name} market and its price source. Read settlement, fees and eligibility before considering exposure.',
    'On paper only, record entry, spread and funding or settlement terms. Compute the loss if the underlying moves 5% against the position.',
    'Price a close at the same size. Save both quotes, timestamps and loss estimate; reassess them at the next observation.',
    'Leverage, funding changes and settlement rules can produce losses.',
    'Observe',
  ),
);
assign(
  ['Staking Pool', 'Restaking', 'Collateral Markets', 'Insurance'],
  route(
    'Lockup review',
    'Identify the collateral and operator for one {name} pool; record its entry minimum, unbonding period and penalties.',
    'Inspect the deposit or coverage quote, the receipt denomination and who is allowed to withdraw. Model any slash before committing.',
    'Map the exact request, delay and claim sequence for exiting. Save the next unlock condition and revisit it before the planned exit.',
    'Slashing, capital locks and claim conditions may persist beyond the review date.',
    'Observe',
  ),
);
assign(
  ['Payments', 'Chain', 'Governance Incentives'],
  route(
    'Network activity',
    'Inspect the official {name} network or incentive rules. Identify the native fee unit and whether ordinary usage is documented.',
    'Follow one real transaction in a public explorer. Record its sender-facing action, fee unit and successful settlement state.',
    'Check the final receipt against the product terms and record which address or intermediary was credited.',
    'Network utility and a future distribution have separate eligibility rules.',
    'Observe',
  ),
);
const other = route(
  'Read-only review',
  'Locate the official {name} documentation and verify its product, deployment and access restrictions.',
  'Trace one public example through the documented interface or explorer. Save the action, asset denomination, and receipt reference.',
  'Identify how a participant unwinds the position and who controls settlement. Revisit the documentation before allocating capital.',
  'A public and economical entry and exit route have yet to be verified.',
  'Observe',
);

type Specific = {
  name?: string;
  chain?: string;
  mode?: 'Observe';
  inspect?: string;
  action?: string;
  exit?: string;
  risk?: string;
  label?: string;
  url: string;
  source: string;
};
const specifics: Record<string, Specific> = {
  ...watchlistNotes,
  'steakhouse-financial': {
    chain: 'Base',
    source: 'Morpho · Steakhouse curator directory',
    url: 'https://app.morpho.org/curator/steakhouse-financial',
    inspect:
      'In the Morpho curator directory, filter for Steakhouse Financial and Base. Open a listed USDC vault and compare its liquidity, collateral and fees.',
    action:
      'Preview a USDC deposit to that specific Steakhouse vault. Record the share estimate and contract address; compare the vault risk tier before entry.',
    exit: 'Preview redeeming the same shares to USDC. Check available liquidity, keep the vault address and save both receipts if executed.',
  },
  gauntlet: {
    chain: 'Base',
    source: 'Morpho · Gauntlet WETH Core on Base',
    url: 'https://app.morpho.org/base/vault/0x6b13c060F13Af1fdB319F52315BbbF3fb1D88844/gauntlet-weth-core',
    inspect:
      'Open the Gauntlet WETH Core listing on Base in Morpho. Match the vault address and inspect its collateral exposures, supply caps and liquid WETH.',
    action:
      'Using WETH already on Base, preview a single supply and note the quoted vault shares. Include any wrapping or approval charge in the budget.',
    exit: 'Quote a redemption into WETH. Log available liquidity, shares burned and the two transaction hashes if executed.',
  },
  veda: {
    source: 'Veda · Boring Queue integration',
    url: 'https://sdk.veda.tech/docs/boring-queue-ui-integration',
    inspect:
      'Locate a partner vault whose documentation names Veda and its supported network. Match the Teller and withdrawal queue to that vault.',
    action:
      'Preview one deposit and the withdrawal intent before funding. Compare share units, maturity, solver discount and any permitted fill window.',
    exit: 'If the exit uses BoringQueue, record the request ID, maturity and discount. Check actual fulfillment before marking capital returned.',
  },
  upshift: {
    source: 'Upshift · vault lifecycle',
    url: 'https://docs.upshift.finance/introduction/integration-guide',
    inspect:
      'Select an Upshift vault only after verifying its allowlist, entry asset and whether the vault uses instant or queued redemption.',
    exit: 'For a queued redemption, record request shares and the vault-specific withdrawal period. Check claimability before recording a completed exit.',
  },
  opentrade: {
    mode: 'Observe',
    source: 'OpenTrade · institutional onboarding',
    url: 'https://docs.opentrade.io/',
    inspect:
      'Read OpenTrade’s institutional onboarding requirements. Check which legal entity can subscribe and whether the route is available in your jurisdiction.',
    action:
      'Without funding a wallet, record the product’s subscription minimum, cut-off and fee disclosures. Mark the route inaccessible unless eligibility is confirmed.',
  },
  onre: {
    mode: 'Observe',
    source: 'OnRe · regulatory framework',
    url: 'https://docs.onre.finance/legal',
    inspect:
      'Read the OnRe segregated-account eligibility rules, including the Qualified Acquirer test and identity checks for direct participation.',
    action:
      'Review the ONyc product documents and redemption terms on paper. Record the reinsurance exposure and whether the direct route is open to you.',
  },
  symbiotic: {
    source: 'Symbiotic · vaults and epochs',
    url: 'https://docs.symbiotic.fi/learn/core-concepts/vault',
    inspect:
      'Pick one documented Symbiotic Ethereum vault. Identify its collateral, epoch length, delegated networks and slasher configuration.',
    exit: 'Read the vault’s epoch rule; record withdrawal request, earliest claimable epoch and final claim separately. Save the slashing window with the quote.',
  },
  'lightning-network': {
    source: 'ACINQ · Phoenix',
    url: 'https://github.com/ACINQ/phoenix',
    mode: 'Observe',
    label: 'Invoice review',
    inspect:
      'Review a Lightning payment in a wallet you already use. Note invoice amount, expiry and the routing or liquidity fee. BTC is the settlement asset.',
    action:
      'For an existing payment, compare the invoice amount and final fee with the wallet receipt. Do not open a paid channel for this research exercise.',
    exit: 'Save a private note of the payment status and total fee. Review an official rules announcement before treating a payment as an eligibility signal.',
  },
  curvance: {
    chain: 'Monad',
    source: 'Curvance · market accounting',
    url: 'https://app.curvance.com/transparency.html',
    inspect:
      'In Curvance on Monad, open one market and note the supply asset, paired debt asset, collateral cap and available liquidity.',
    action:
      'Preview supplying only the chosen asset. Keep debt at zero and compare the receipt, approval and remaining liquidity before confirming.',
  },
  usdd: {
    chain: 'Tron',
    mode: 'Observe',
    label: 'Peg module review',
    source: 'USDD · peg stability module',
    url: 'https://docs.usdd.io/user-guide/psm-peg-stability-module',
    inspect:
      'Read the USDD Peg Stability Module documentation. USDD already functions as a stablecoin; this board models a distinct hypothetical protocol token.',
    action:
      'Preview the two directions in a supported PSM pair. Note conversion units, balance availability and network fees without minting debt.',
  },
  'bittensor-dtao': {
    mode: 'Observe',
    label: 'Subnet liquidity',
    source: 'Learn Bittensor · slippage',
    url: 'https://guides.learnbittensor.org/staking-and-delegation/slippage',
    inspect:
      'Compare TAO and one subnet’s alpha units. Read subnet liquidity and price impact: these are already network assets.',
    action:
      'On paper, quote TAO to subnet alpha and back. Compare size-dependent slippage and fees; record the subnet identifier and time.',
  },
  'reti-pooling': {
    mode: 'Observe',
    source: 'Réti · validator configuration',
    url: 'https://txnlab.gitbook.io/reti-open-pooling/getting-started/quick-start-for-validators',
    inspect:
      'In Réti on Algorand, inspect one validator’s declared pool minimum, commission, payout interval and entry conditions.',
  },
  saturn: {
    chain: 'Ethereum',
    mode: 'Observe',
    label: 'Wrapper review',
    source: 'Saturn · yield-dollar contract documentation',
    url: 'https://github.com/saturn-organization/saturn-yield-dollar',
    inspect:
      'Saturn is on the official watchlist with category Stablecoin Wrapper. Identify the underlying asset and distinguish any wrapper receipt from a possible separate protocol token.',
    action:
      'Trace an sUSDat redemption into USDat through the documented withdrawal queue. Record the share units and settlement condition without funding a wallet.',
  },
};
const commonRoute = route(
  'Peg review',
  'Read the backing asset and redemption conditions for {name}.',
  'Observe a public mint or redemption and record the exchange rate.',
  'Record the underlying asset, liquidity and exit limits.',
  'The wrapper unit has a separate purpose from a hypothetical protocol token.',
  'Observe',
);
routes['Stablecoin Wrapper'] = commonRoute;
export function plan(p: Protocol) {
  const specific = specifics[p.slug],
    profile = { ...(routes[p.category || ''] || other), ...specific };
  const preferred = ['Base', 'Arbitrum', 'Optimism', 'Solana', 'Monad', 'Ethereum'];
  const chain =
    (specific?.chain && p.chains.includes(specific.chain)
      ? specific.chain
      : preferred.find((c) => p.chains.includes(c))) ||
    p.chains[0] ||
    'a documented network';
  const observe = profile.mode === 'Observe',
    cap = observe ? 0 : chain === 'Ethereum' ? 5 : 2;
  const minutes = observe ? 15 : 25,
    capital = observe ? 0 : 25;
  const opening = `${p.name} · ${chain}. Spend about 5 minutes on the protocol’s verified documentation. Confirm the specific product is accessible on this network; if its address, terms or exit are unclear, stop at research.`;
  const budget = observe
    ? 'Research budget $0; no funds or signatures. Spend about 10 more minutes on the checks below.'
    : `Planning example: up to $${capital} principal already on ${chain}; cap combined entry, exit, spread and approvals at $${cap}. Allow ~20 more active minutes. Skip if the minimum, fresh quotes or fees exceed either limit.`;
  const fill = (s: string) => s.replaceAll('{name}', p.name).replaceAll('{chain}', chain);
  const steps = [
    opening,
    fill(profile.inspect),
    budget,
    fill(profile.action),
    fill(profile.exit),
    'Recheck in 7 days, or at the published unlock if later. Match any official eligibility rules to the wallet and receipt before considering a claim. No reward is assumed.',
  ];
  return {
    route: profile.label,
    mode: observe ? 'Observe' : 'Small trial',
    chain,
    minutes,
    capital,
    fee_cap: cap,
    risk: profile.risk,
    steps,
    reference: {
      name: specific?.source || 'DefiLlama · protocol directory',
      url: specific?.url || 'https://defillama.com/protocol/' + encodeURIComponent(p.slug),
    },
    source_grade: specific ? 'Named product research' : 'Category-based checklist',
  };
}
