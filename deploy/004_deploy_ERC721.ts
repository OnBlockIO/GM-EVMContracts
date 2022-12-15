import {getSettings} from '../.config';
import hre, {deployments, ethers, getNamedAccounts, upgrades} from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/dist/types';

const GhostMarketERC721: DeployFunction = async function main() {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const CHAIN = hre.network.name;
  const PROXY = getSettings(CHAIN).erc721_token_proxy;
  const IS_MAINNET = true;
  const NAME = 'GhostMarket ERC721';
  const SYMBOL = 'GHOST';
  const API_PATH = IS_MAINNET ? 'api' : 'api-testnet';
  const API_URL = `https://${API_PATH}.ghostmarket.io/metadata/${CHAIN}`;

  if (PROXY) {
    const V2 = await ethers.getContractFactory('GhostMarketERC721');
    await upgrades.upgradeProxy(PROXY, V2);
    console.log('GhostMarketERC721 upgraded');
  } else {
    const erc721_proxy = await deploy('GhostMarketERC721', {
      contract: 'GhostMarketERC721',
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
    console.log('GhostMarketERC721 deployed at: ', erc721_proxy.address);
  }
}

export default GhostMarketERC721
