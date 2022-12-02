import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const voters = [deployer,deployer,deployer,deployer] // TODO improve

  await deploy('OBV', {
    from: deployer,
    args: ['1000000000000000', voters]
  });

}

export default func;
func.tags = ['Vesting'];