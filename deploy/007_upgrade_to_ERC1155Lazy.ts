import {getSettings} from '../.config';
import hre, {deployments, ethers, upgrades} from 'hardhat';

async function main() {
  const {execute} = deployments;

  const CHAIN = hre.network.name;
  const PROXY = getSettings(CHAIN).erc721_token_proxy;

  const V1 = await ethers.getContractFactory('GhostMarketERC1155V1');
  const V2 = await ethers.getContractFactory('GhostMarketERC1155');

  // uncomment to force import if missing
  // await upgrades.forceImport(PROXY, V1, {kind: 'transparent'});

  // uncomment to validate upgrade
  await upgrades.validateUpgrade(PROXY, V2, {kind: 'transparent'});

  // upgrade
  // await upgrades.upgradeProxy(PROXY, V2, {unsafeSkipStorageCheck: true});
  // console.log('GhostMarketERC1155 upgraded');

  // init new methods
  // await execute('GhostMarketERC1155', {from: PROXY.address, log: true}, '__Mint1155Validator_init_unchained');
  // console.log('__Mint1155Validator_init_unchained executed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
