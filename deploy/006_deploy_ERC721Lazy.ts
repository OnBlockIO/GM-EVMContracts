import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('GhostMarketERC721', {
    contract: 'GhostMarketERC721',
    from: deployer,
    proxy: {
      owner: deployer,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: ['GhostMarket ERC721', 'GHOST', 'https://api.ghostmarket.io/metadata/avalanche/'],
        },
      },
    },
    log: true,
  });
};
export default func;
func.tags = ['GhostMarketERC721'];

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
