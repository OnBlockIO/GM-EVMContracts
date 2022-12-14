import hre, {deployments, getNamedAccounts} from 'hardhat';

async function main() {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  /*
  const erc721LazyMintTransferProxy = await ERC721LazyMintTransferProxy.deployed();
  await erc721LazyMintTransferProxy.addOperator(exchangeV2.address)
  await exchangeV2.setTransferProxy(ERC721_LAZY, erc721LazyMintTransferProxy.address)

  const erc1155LazyMintTransferProxy = await ERC1155LazyMintTransferProxy.deployed();
  await erc1155LazyMintTransferProxy.addOperator(exchangeV2.address)
  await exchangeV2.setTransferProxy(ERC1155_LAZY, erc1155LazyMintTransferProxy.address)
  */

  // __Mint721Validator_init_unchained();
  // __Mint1155Validator_init_unchained();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
