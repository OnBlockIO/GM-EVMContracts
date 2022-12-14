import {deployments, getNamedAccounts} from 'hardhat';

async function main() {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const NAME = 'GhostMarket Token';
  const SYMBOL = 'GM';
  const SUPPLY = '10000000000000000';
  const DECIMALS = '8';

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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
