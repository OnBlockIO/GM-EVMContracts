// migrations/2_deploy_token.js
const {
  BN,           // Big Number support
} = require('@openzeppelin/test-helpers');

const GM = artifacts.require('GhostMarket');
const OBV = artifacts.require('OnBlockVesting');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
    console.log("addresses !!!!!!!!!!!!!!");
    const voters = (await web3.eth.getAccounts()).slice(0, 4);
    console.log(voters)
    await deployProxy(GM, ['GhostMarket', 'GM', '10000000000000000', '8'], { deployer, initializer: 'initialize' });
    await deployer.deploy(OBV, new BN('10000000'), voters);
};
