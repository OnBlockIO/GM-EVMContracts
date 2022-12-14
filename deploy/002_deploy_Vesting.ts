import {deployments, getNamedAccounts, getUnnamedAccounts} from 'hardhat';

async function main() {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const users = await getUnnamedAccounts();

  // to replace by custom voters before deploy - [address1, address2, address3, address4]
  const VOTERS = users.slice(0, 4);
  const VAULT_FEE = '1000000000000000';

  const vesting = await deploy('OnBlockVesting', {
    contract: 'OnBlockVesting',
    from: deployer,
    args: [VAULT_FEE, VOTERS],
  });
  console.log('OnBlockVesting deployed at: ', vesting.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
