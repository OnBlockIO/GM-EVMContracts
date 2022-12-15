import {getSettings} from '../.config';
import hre, {deployments, ethers, upgrades} from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/dist/types';

const GhostMarketERC721: DeployFunction = async function main() {
  const {execute} = deployments;

  const CHAIN = hre.network.name;
  const PROXY = getSettings(CHAIN).erc721_token_proxy;
  if (!PROXY) return;

  const V1 = await ethers.getContractFactory('GhostMarketERC721V1');
  const V2 = await ethers.getContractFactory('GhostMarketERC721');

  // uncomment to force import if missing
  // await upgrades.forceImport(PROXY, V1, {kind: 'transparent'});

  // uncomment to validate upgrade
  await upgrades.validateUpgrade(PROXY, V2, {kind: 'transparent'});

  // upgrade
  // await upgrades.upgradeProxy(PROXY, V2, {unsafeSkipStorageCheck: true});
  // console.log('GhostMarketERC721 upgraded');

  // init new methods
  // await execute('GhostMarketERC721', {from: PROXY.address, log: true}, '__Mint721Validator_init_unchained');
  // console.log('__Mint721Validator_init_unchained executed');
};

export default GhostMarketERC721;
