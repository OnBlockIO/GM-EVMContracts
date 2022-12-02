import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const chain = 'polygon'
  const blocksPerDayConfig = {
    bsc: 28800,
    bsct: 28800,
    eth: 6400,
    etht: 6400,
    polygon: 43200,
    polygont: 43200,
    avalanche: 43200,
    avalanchet: 43200,
  }
  const startBlockConfig = {
    bsc: 20311984,
    bsct: 0,
    eth: 0,
    etht: 0,
    polygon: 31726839,
    polygont: 0,
    avalanche: 18450573,
    avalanchet: 0,
  }
  const stakedTokenConfig = {
    bsc: '0x83895b0512c88f03c2513751475a3ea9cbec4fbe',
    bsct: '',
    eth: '',
    etht: '',
    polygon: '0x66eae4669e5bc9a391d97d8aa2bffd7dffb2690e',
    polygont: '',
    avalanche: '0xef61490aa6316d06d5375164f0db7d472cd0029f',
    avalanchet: '',
  }
  const gmTokenConfig = {
    bsc: '0x0B53b5dA7d0F275C31a6A182622bDF02474aF253',
    bsct: '0xf3fd0f360ace3b0e83843221a763fec857291060',
    eth: '0x35609dC59E15d03c5c865507e1348FA5abB319A8',
    etht: '0x54cd0f7627597b8ea25dfc1dd0cc81f952c2d900',
    polygon: '0x6a335AC6A3cdf444967Fe03E7b6B273c86043990',
    polygont: '0x957404188EA8804eFF6dc052e6B35c58aE351357',
    avalanche: '0x0B53b5dA7d0F275C31a6A182622bDF02474aF253',
    avalanchet: '0x7D35e9D90bD91BA82dAe43d7e03cF1e04c14aea8',
  }
  
  const totalRewards = 500000 // 500k per pool
  const duration = 90 // 90 days
  const decimals = 10 ** 8 // gm decimals
  const _rewardPerBlock = parseInt((totalRewards / duration / blocksPerDayConfig[chain] * decimals).toString()) // 192901234
  const _endBlock = startBlockConfig[chain] + (duration * blocksPerDayConfig[chain])

  console.log(`chain: ${chain}`)
  console.log(`_rewardPerBlock: ${_rewardPerBlock}`)
  console.log(`_endBlock: ${_endBlock}`)

  await deploy('StakingPoolForDexTokens', {
    from: deployer,
    proxy: {
      owner: deployer,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [stakedTokenConfig[chain], gmTokenConfig[chain], _rewardPerBlock, startBlockConfig[chain], _endBlock]
        },
      },
    },
    log: true,
  });
};

export default func;
func.tags = ['LPStake'];

