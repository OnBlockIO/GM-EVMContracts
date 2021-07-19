// migrations/2_deploy_token.js
const {
  BN,           // Big Number support
} = require('@openzeppelin/test-helpers');

const GM = artifacts.require('GhostMarket');
const OBV = artifacts.require('OnBlockVesting');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  await deployProxy(GM, ['GhostMarket', 'GM', '10000000000000000', '8'], { deployer, initializer: 'initialize' });
  await deployer.deploy(OBV, new BN('10000000'));
};
