import {getSettings} from '../.config';
import hre, {deployments, ethers, getNamedAccounts, upgrades} from 'hardhat';

async function main() {
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
  } else {
    await deploy('GhostMarketToken', {
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
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
