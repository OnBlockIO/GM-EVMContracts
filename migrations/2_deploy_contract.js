// migrations/2_deploy_token.js
const MyToken = artifacts.require('GhostMarket');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  await deployProxy(MyToken, ['GhostMarket', 'GM', '10000000000000000', '8'], { deployer, initializer: 'initialize' });
};
