import {getSettings} from '../.config';
import hre, {deployments, ethers, getNamedAccounts, upgrades} from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/dist/types';

const GhostMarketERC1155: DeployFunction = async function main() {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const CHAIN = hre.network.name;
  const PROXY = getSettings(CHAIN).erc1155_token_proxy;
  const IS_MAINNET = true;
  const NAME = 'GhostMarket ERC1155';
  const SYMBOL = 'GHOST';
  const API_PATH = IS_MAINNET ? 'api' : 'api-testnet';
  const API_URL = `https://${API_PATH}.ghostmarket.io/metadata/${CHAIN}`;

  if (PROXY) {
    const V2 = await ethers.getContractFactory('GhostMarketERC1155');
    await upgrades.upgradeProxy(PROXY, V2);
    console.log('GhostMarketERC1155 upgraded');
  } else {
    const erc1155_proxy = await deploy('GhostMarketERC1155', {
      contract: 'GhostMarketERC1155',
      from: deployer,
      proxy: {
        owner: deployer,
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          init: {
            methodName: 'initialize',
            args: [NAME, SYMBOL, API_URL],
          },
        },
      },
      log: true,
    });
    console.log('GhostMarketERC1155 deployed at: ', erc1155_proxy.address);
  }
};

export default GhostMarketERC1155;
