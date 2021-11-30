const HDWalletProvider = require('@truffle/hdwallet-provider');
const {
  MAINNET_PRIVATE_KEYS,
  TESTNET_PRIVATE_KEYS,
  ETHERSCAN_API_KEY
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
    testnet: {
      provider: () => new HDWalletProvider(TESTNET_PRIVATE_KEYS, `https://data-seed-prebsc-1-s1.binance.org:8545`),
      network_id: 97,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    mainnet: {
      provider: () => new HDWalletProvider(MAINNET_PRIVATE_KEYS, `https://bsc-dataseed1.binance.org`),
      network_id: 56,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true
    },
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
