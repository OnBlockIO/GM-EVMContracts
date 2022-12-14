import {getSettings} from '../.config';
import hre, {ethers, upgrades} from 'hardhat';

async function main() {
  const CHAIN = hre.network.name;
  const PROXY = getSettings(CHAIN).erc1155_token_proxy;

  const V2 = await ethers.getContractFactory('GhostMarketERC1155');
  await upgrades.upgradeProxy(PROXY, V2);

  // __Mint1155Validator_init_unchained();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
