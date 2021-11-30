// migrations/2_deploy_token.js
const {
  BN,           // Big Number support
} = require('@openzeppelin/test-helpers');

const GM = artifacts.require('GhostMarket');
const OBV = artifacts.require('OnBlockVesting');
const DFT = artifacts.require('DeflationaryToken');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
    const voters = (await web3.eth.getAccounts()).slice(0, 4);
    await deployProxy(GM, ['GhostMarket Token', 'GM', '10000000000000000', '8'], { deployer, initializer: 'initialize' });
    await deployProxy(DFT, ['DeflationaryToken', 'DFT', '10000000000000000', '8'], { deployer, initializer: 'initialize' });
    await deployer.deploy(OBV, new BN('1000000000000000'), voters); // 0.001 unit vault fee
};
