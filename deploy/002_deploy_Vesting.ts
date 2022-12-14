import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getUnnamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const users = await getUnnamedAccounts();

  // to replace by custom voters before deploy - [address1, address2, address3, address4]
  const VOTERS = users.slice(0, 4);
  const VAULT_FEE = '1000000000000000';

  await deploy('OnBlockVesting', {
    contract: 'OnBlockVesting',
    from: deployer,
    args: [VAULT_FEE, VOTERS],
  });
};

export default func;
func.tags = ['OnBlockVesting'];
