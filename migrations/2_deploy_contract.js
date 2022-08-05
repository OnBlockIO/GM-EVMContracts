// migrations/2_deploy_token.js
const {
  BN,           // Big Number support
} = require('@openzeppelin/test-helpers');

const GM = artifacts.require('GhostMarketToken');
const OBV = artifacts.require('OnBlockVesting');
const DFT = artifacts.require('DeflationaryToken');
const LPStake = artifacts.require('StakingPoolForDexTokens');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const blocksPerDayConfig = {
  bsc: 28800,
  eth: 6400,
  polygon: 43200,
  avalanche: 28800,
  n3: 5760,
  phantasma: 43200
}

const chain = 'bsc'
const _stakedToken = '0x179b6b41cd9ba207ccfd77fbb4c232dd4962a9eb'
const _ghostMarketToken = '0xf3fd0f360ace3b0e83843221a763fec857291060'
const totalRewards = 1000000
const duration = 90 // in days
const decimals = 10 ** 8
const _rewardPerBlock = parseInt(totalRewards / duration / blocksPerDayConfig[chain] * decimals) // 385802469
const _startBlock = 21577987
const _endBlock = _startBlock + (duration * blocksPerDayConfig[chain])

module.exports = async function (deployer) {
    const voters = (await web3.eth.getAccounts()).slice(0, 4);
    await deployProxy(GM, ['GhostMarket Token', 'GM', '10000000000000000', '8'], { deployer, initializer: 'initialize' });
    await deployProxy(DFT, ['DeflationaryToken', 'DFT', '10000000000000000', '8'], { deployer, initializer: 'initialize' });
    await deployer.deploy(OBV, new BN('1000000000000000'), voters); // 0.001 unit vault fee
    await deployProxy(LPStake, [_stakedToken, _ghostMarketToken, _rewardPerBlock, _startBlock, _endBlock], { deployer, initializer: 'initialize' });
};