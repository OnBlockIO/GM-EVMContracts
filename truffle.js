const HDWalletProvider = require('@truffle/hdwallet-provider');
const {
  MAINNET_PRIVATE_KEYS,
  TESTNET_PRIVATE_KEYS,
  ETHERSCAN_API_KEY,
  INFURA_API_KEY
} = require('./.secrets.json');

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },
    bsctestnet: {
      provider: () => new HDWalletProvider(TESTNET_PRIVATE_KEYS, `https://data-seed-prebsc-1-s1.binance.org:8545`),
      network_id: 97,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    bscmainnet: {
      provider: () => new HDWalletProvider(MAINNET_PRIVATE_KEYS, `wss://bsc-ws-node.nariox.org:443`),
      network_id: 56,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    polygontestnet: {
      provider: () => new HDWalletProvider(TESTNET_PRIVATE_KEYS, `https://polygon-mumbai.infura.io/v3/${INFURA_API_KEY}`),
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      gas: 6000000,
      gasPrice: 10000000000,
    },
    polygonmainnet: {
      provider: () => new HDWalletProvider(MAINNET_PRIVATE_KEYS, `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`),
      network_id: 137,
      confirmations: 2,
      skipDryRun: true,
      networkCheckTimeout: 10000,
      gas: 20000000,
      gasPrice: 30000000000,
    },
    avalanchetestnet: {
      provider: () => new HDWalletProvider(TESTNET_PRIVATE_KEYS, `https://api.avax-test.network/ext/bc/C/rpc`),
      network_id: '*',
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    avalanchemainnet: {
      provider: () => new HDWalletProvider(MAINNET_PRIVATE_KEYS, `https://api.avax.network/ext/bc/C/rpc`),
      network_id: '*',
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    ethtestnet: {
      provider: () => new HDWalletProvider(TESTNET_PRIVATE_KEYS, `wss://ropsten.infura.io/ws/v3/${INFURA_API_KEY}`),
      network_id: '*',
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    ethmainnet: {
      provider: () => new HDWalletProvider(MAINNET_PRIVATE_KEYS, `wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}`),
      network_id: '*',
      gas: 2100000,
      gasPrice: 150000000000, // 180 gwei
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: "^0.8.0", // A version or constraint - Ex. "^0.5.0"
                         // Can also be set to "native" to use a native solc
      parser: "solcjs",  // Leverages solc-js purely for speedy parsing
    }
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    etherscan: ETHERSCAN_API_KEY
  }
};
