import {getSettings} from '../.config';
import hre, {deployments, ethers, getNamedAccounts, upgrades} from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/dist/types';

const GhostMarketToken: DeployFunction = async function main() {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const CHAIN = hre.network.name;
  const PROXY = getSettings(CHAIN).gm_token_proxy;
  const NAME = 'GhostMarket Token';
  const SYMBOL = 'GM';
  const SUPPLY = '10000000000000000';
  const DECIMALS = '8';

  if (PROXY) {
    const V2 = await ethers.getContractFactory('GhostMarketToken');
    await upgrades.upgradeProxy(PROXY, V2);
    console.log('GhostMarketToken upgraded');
  } else {
    const gm_proxy = await deploy('GhostMarketToken', {
      contract: 'GhostMarketToken',
      from: deployer,
      proxy: {
        owner: deployer,
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          init: {
            methodName: 'initialize',
            args: [NAME, SYMBOL, SUPPLY, DECIMALS],
          },
        },
      },
      log: true,
    });
    console.log('GhostMarketToken deployed at: ', gm_proxy.address);
  }
};

export default GhostMarketToken;
