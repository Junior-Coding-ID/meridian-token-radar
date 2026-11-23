// Protocol names here select documented workflows only. The valuation model never reads this map.
export const watchlistNotes = {
  'armitage-by-wintermute': {
    chain: 'Ethereum',
    source: 'Wintermute · Armitage documentation',
    url: 'https://armitage.wintermute.com/docs',
    inspect:
      'Open Armitage’s Morpho Vault V2 documentation. Match the vault’s curator and allocator roles, underlying lending markets and maximum exposure on Ethereum.',
  },
  axis: {
    source: 'DefiLlama · Axis product description',
    url: 'https://defillama.com/protocol/axis',
    inspect:
      'Separate Axis USDx from sUSDx. Read how the cross-venue arbitrage strategy backs the synthetic dollar and who handles a redemption.',
    action:
      'Compare a paper USDx redemption with an sUSDx exit. Record two quotes and the counterparty risk if basis or exchange liquidity changes.',
  },
  b14g: {
    source: 'DefiLlama · b14g dual staking',
    url: 'https://defillama.com/protocol/b14g',
    inspect:
      'Identify the Bitcoin leg and the partner-chain asset on a b14g dual-staking route. Record which balance is locked, how it unlocks and who controls each leg.',
  },
  clearstar: {
    chain: 'Base',
    source: 'Morpho · Clearstar USDC Reactor on Base',
    url: 'https://app.morpho.org/base/vault/0x1D3b1Cd0a0f242d598834b3F2d126dC6bd774657/clearstar-usdc-reactor',
    inspect:
      'Open the Clearstar USDC Reactor listing on Base. Compare market allocations and deposit limits with the amount of USDC immediately available for withdrawal.',
  },
  'doppler-finance': {
    chain: 'Ripple',
    source: 'Doppler · XRP vault',
    url: 'https://docs.doppler.finance/product/doppler-vaults/xrp-vault',
    inspect:
      'Read the Doppler XRP Vault terms on XRPL. Trace one withdrawal from request to release, and write down the stated waiting period and XRP-denominated settlement.',
  },
  ember: {
    chain: 'Sui',
    source: 'Ember · core concepts',
    url: 'https://learn.ember.so/ember-protocol/core-concepts',
    inspect:
      'Pick one Ember vault whose documents identify the strategy and manager. Read how vault receipt tokens track the pool and which underlying asset investors can redeem.',
  },
  firelight: {
    chain: 'Flare',
    source: 'Firelight · withdrawal guide',
    url: 'https://firelight.finance/articles/step-by-step-guide-to-withdrawing-and-unstaking-on-firelight-in-phase-1',
    inspect:
      'On Flare, distinguish FXRP principal from a Firelight stXRP share. Inspect the withdrawal calendar applicable to the current phase.',
    exit: 'Write down both the unstake request and the later claim. Compare the queued redemption against the quoted secondary-market exit and its price impact.',
  },
  'galaxy-curation': {
    source: 'Galaxy · curation directory',
    url: 'https://curation.galaxy.com/',
    inspect:
      'Use Galaxy’s curation directory to distinguish its Morpho and Kamino vaults. Select the matching chain, then record the host, asset and largest collateral exposure.',
  },
  'gami-labs': {
    chain: 'Stellar',
    mode: 'Observe',
    source: 'Gami · investment mandate',
    url: 'https://gamilabs.io/about',
    inspect:
      'Read Gami’s allocator mandate and verify which vehicle is open to the intended investor. Record the named manager and entry terms before considering a wallet action.',
  },
  'hive-protocol': {
    chain: 'BSquared',
    source: 'DefiLlama · BSquared Hive record',
    url: 'https://defillama.com/protocol/hive-protocol',
    inspect:
      'Follow the B² Hive link in the DefiLlama record. Distinguish BTC collateral and any existing B2 incentive from the hypothetical launch modeled on this board.',
  },
  hyperithm: {
    source: 'Morpho · Hyperithm directory',
    url: 'https://app.morpho.org/curator/hyperithm',
    inspect:
      'Filter the Morpho registry to Hyperithm. Read the underlying supply asset and collateral exposure on a supported deployment; compare available liquidity with total deposits.',
  },
  infinifi: {
    chain: 'Ethereum',
    source: 'Yearn Curation · infiniFi research',
    url: 'https://curation.yearn.fi/report/infinifi/',
    inspect:
      'On Ethereum, separate liquid iUSD, staked siUSD and the locked position. Read the currently available liquid backing before choosing which withdrawal to preview.',
    exit: 'For the liquid path, compare shares to iUSD and iUSD to USDC separately. If liquidity cannot cover redemption, record the queue and keep the trial unfunded.',
  },
  'k3-capital': {
    source: 'Morpho · K3 Capital directory',
    url: 'https://app.morpho.org/curator/k3-capital',
    inspect:
      'Find K3 Capital in Morpho’s curator directory. Record the listed vault and current network, then compare its largest market exposure against the per-market cap.',
  },
  keyrock: {
    chain: 'Ethereum',
    source: 'MorphoWatch · Keyrock curator research',
    url: 'https://morphowatch.com/curators/keyrock/',
    inspect:
      'Use the Keyrock curator listing to identify a vault, then confirm its contract and chain in the underlying Morpho registry. Compare USDC liquidity with the market allocations.',
  },
  lagoon: {
    source: 'Lagoon · deposit and withdrawal flows',
    url: 'https://docs.lagoon.finance/vault/deposit-and-withdraw-flows',
    inspect:
      'Check whether the selected Lagoon vault is synchronous or asynchronous. On the async path, distinguish a pending deposit request from settled, claimable shares.',
    exit: 'Preview the vault’s redeem request and identify the next settlement event. Record separately when the request is submitted, when NAV is updated and when assets are claimable.',
  },
  lofty: {
    chain: 'Algorand',
    source: 'Lofty · marketplace terms',
    url: 'https://www.lofty.ai/terms',
    inspect:
      'Read the property listing and Lofty’s marketplace terms. Identify the property interest, USDL settlement, jurisdictional access and whether other buyers are available.',
    exit: 'Inspect the bid side for that same property interest. Record available size and fees; a listing price alone cannot establish an executable exit.',
  },
  'mezo-earn': {
    chain: 'Mezo',
    source: 'Mezo · voting and incentives',
    url: 'https://mezo.org/docs/users/mezo-earn/vote/',
    inspect:
      'Read how veBTC votes direct Mezo gauge rewards. Distinguish the existing network’s voting and asset units from any hypothetical separate launch.',
    action:
      'Inspect a completed gauge vote and its fee distribution on paper. Record the lock term, gauge and epoch; skip a new lock solely to pursue a possible reward.',
  },
  noble: {
    chain: 'Noble',
    source: 'Circle · USDC on Noble',
    url: 'https://help.circle.com/s/article/A-closer-look-at-Noble-USDC-and-the-IBC-protocol?category=Utilizing_USDC',
    inspect:
      'Review native USDC issuance on Noble. Trace one historical IBC payment, matching the origin chain, destination channel, asset denomination and acknowledgement.',
  },
  'nonce-capital': {
    chain: 'Optimism',
    source: 'DefiLlama · Nonce Capital adapter methodology',
    url: 'https://defillama.com/protocol/nonce-capital',
    inspect:
      'Choose a Nonce-curated ether.fi Liquid or Midas product listed for Optimism. Match its manager, underlying exposure and eligible entry route on the host.',
    action:
      'Compare one underlying product with the enclosing vault. Trace duplicate exposures before previewing any deposit; record which contract actually credits the wallet.',
  },
  'plume-vaults': {
    chain: 'Plume Mainnet',
    source: 'Plume · vault directory',
    url: 'https://app.plume.org/vaults',
    inspect:
      'Compare two Plume real-world-asset vaults. Record each issuer, eligible investor class, vault-token unit and redemption window, then inspect the underlying exposure.',
  },
  r25: {
    chain: 'Sui',
    source: 'Sui · R25 on Sui',
    url: 'https://www.sui.io/blog/r25-rwa-assets-rcusd-rcusdp',
    inspect:
      'Distinguish the rcUSD asset from the rcUSDp yield position on Sui. Read issuer terms, who can redeem and which asset an exit delivers.',
  },
  rockawayx: {
    source: 'Morpho · RockawayX directory',
    url: 'https://app.morpho.org/curator/rockawayx',
    inspect:
      'Use the RockawayX curator page to identify a supported vault. Compare the vault’s deposit asset with its named ecosystem exposure and note available exit liquidity.',
  },
  'tori-finance': {
    chain: 'Ethereum',
    source: 'Tori Finance · synthetic dollar',
    url: 'https://www.tori.finance/',
    inspect:
      'Read how trading positions back trUSD. Distinguish a trUSD redemption from selling its yield-bearing position and record the venue or custodian exposure.',
  },
  'tulipa-capital': {
    source: 'Tulipa Capital · vault strategies',
    url: 'https://www.tulipa.capital/',
    inspect:
      'Start with Tulipa’s documented strategy and identify the specific hosting vault. Verify both curator and allocator roles, its asset denomination and its exit conditions.',
  },
  tydro: {
    chain: 'Ink',
    source: 'Tydro · lending documentation',
    url: 'https://docs.tydro.com/',
    inspect:
      'Inspect a Tydro reserve on Ink. Record supply cap, utilization and available withdrawal liquidity. Keep the supply-only route separate from collateral and borrowing.',
  },
  valos: {
    chain: 'Monad',
    source: 'DefiLlama · Valos private-credit record',
    url: 'https://defillama.com/protocol/valos',
    inspect:
      'Read the private-credit description of Valos on Monad. Identify the issuer, claim on underlying credit and any eligibility restriction on a VUSD subscription or redemption.',
  },
  'yuzu-money': {
    chain: 'Plasma',
    source: 'Yuzu Money · asset documentation',
    url: 'https://app.yuzu.money/docs',
    inspect:
      'On Plasma, compare yzUSD with the yield-accruing syzUSD vault share. Separate redeeming shares into yzUSD from obtaining the underlying settlement asset.',
  },
} as const;
