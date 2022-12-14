const eth_mainnet = {
  blocks_per_day: 6400,
  start_block: 0,
  lp_token: '',
  gm_token: '0x35609dC59E15d03c5c865507e1348FA5abB319A8',
  proxy_addres: '',
};

const eth_testnet = {
  blocks_per_day: 6400,
  start_block: 0,
  lp_token: '',
  gm_token: '0x54cd0f7627597b8ea25dfc1dd0cc81f952c2d900',
  proxy_addres: '',
};

const avalanche_mainnet = {
  blocks_per_day: 43200,
  start_block: 18450573,
  lp_token: '0xef61490aa6316d06d5375164f0db7d472cd0029f',
  gm_token: '0x0B53b5dA7d0F275C31a6A182622bDF02474aF253',
  proxy_addres: '',
};

const avalanche_testnet = {
  blocks_per_day: 43200,
  start_block: 0,
  lp_token: '',
  gm_token: '0x7D35e9D90bD91BA82dAe43d7e03cF1e04c14aea8',
  proxy_addres: '',
};

const polygon_mainnet = {
  blocks_per_day: 43200,
  start_block: 31726839,
  lp_token: '0x66eae4669e5bc9a391d97d8aa2bffd7dffb2690e',
  gm_token: '0x6a335AC6A3cdf444967Fe03E7b6B273c86043990',
  proxy_addres: '',
};

const polygon_testnet = {
  blocks_per_day: 43200,
  start_block: 0,
  lp_token: '',
  gm_token: '0x957404188EA8804eFF6dc052e6B35c58aE351357',
  proxy_addres: '',
};

const bsc_mainnet = {
  blocks_per_day: 28800,
  start_block: 20311984,
  lp_token: '0x83895b0512c88f03c2513751475a3ea9cbec4fbe',
  gm_token: '0x0B53b5dA7d0F275C31a6A182622bDF02474aF253',
  proxy_addres: '',
};

const bsc_testnet = {
  blocks_per_day: 28800,
  start_block: 0,
  lp_token: '',
  gm_token: '0xf3fd0f360ace3b0e83843221a763fec857291060',
  proxy_addres: '',
};

let settings = {
  eth_mainnet: eth_mainnet,
  eth_testnet: eth_testnet,
  avalanche_mainnet: avalanche_mainnet,
  avalanche_testnet: avalanche_testnet,
  polygon_mainnet: polygon_mainnet,
  polygon_testnet: polygon_testnet,
  bsc_mainnet: bsc_mainnet,
  bsc_testnet: bsc_testnet,
};

function getSettings(network) {
  if (settings[network] !== undefined) {
    return settings[network];
  } else {
    return {};
  }
}

module.exports = {getSettings};
