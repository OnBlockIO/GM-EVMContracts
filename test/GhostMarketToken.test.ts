import {expect} from '../utils/chai-setup';
import {ethers, upgrades} from 'hardhat';
import {GhostMarketToken} from '../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

describe('GhostMarket Token Test', function () {
  let owner: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let gm_proxy: GhostMarketToken;

  /*before('Deploy Contracts', async() => {
  })*/

  beforeEach(async function () {
    const GM = await ethers.getContractFactory('GhostMarketToken');
    [owner, ...addrs] = await ethers.getSigners();
    gm_proxy = <GhostMarketToken>await upgrades.deployProxy(GM, ['GhostMarket Token', 'GM', '10000000000000000', '8']);
    await gm_proxy.deployed();
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await gm_proxy.owner()).to.equal(owner.address);
    });

    it('Should be upgradable', async function () {
      const newTokenProxy = await ethers.getContractFactory('GhostMarketToken');
      const upgraded_token_proxy: GhostMarketToken = <GhostMarketToken>(
        await upgrades.upgradeProxy(gm_proxy.address, newTokenProxy)
      );
      expect(await upgraded_token_proxy.owner()).to.equal(owner.address);
      expect(await upgraded_token_proxy.address).to.equal(gm_proxy.address);
    });
  });

  describe('Contract', function () {
    it('Owner is set', async () => {
      const owner = await gm_proxy.owner();
      expect(owner).to.equal(owner);
    });

    it('Owner balance after deploy', async () => {
      const ownerBalance = await gm_proxy.balanceOf(owner.address);
      expect(ownerBalance).to.equal('10000000000000000');
    });

    it('Name', async () => {
      const name = await gm_proxy.name();
      expect(name).to.equal('GhostMarket Token');
    });

    it('Symbol', async () => {
      const symbol = await gm_proxy.symbol();
      expect(symbol).to.equal('GM');
    });

    it('Decimals', async () => {
      const decimals = await gm_proxy.decimals();
      expect(decimals).to.equal(8);
    });

    it('Pause/unpause contract', async () => {
      let paused = await gm_proxy.paused();
      expect(paused).to.equal(false);
      await gm_proxy.pause();
      paused = await gm_proxy.paused();
      expect(paused).to.equal(true);
      await gm_proxy.unpause();
      paused = await gm_proxy.paused();
      expect(paused).to.equal(false);
    });

    it('Transfer tokens to another wallet', async () => {
      await gm_proxy.transfer(addrs[1].address, 1000);
      const balance = await gm_proxy.balanceOf(addrs[1].address);
      expect(balance).to.equal(1000);
      await expect(gm_proxy.transfer(addrs[3].address, '9999999999999999999999999')).to.revertedWith(
        'ERC20: transfer amount exceeds balance'
      );
    });

    it('Transfer ownership', async () => {
      await gm_proxy.transferOwnership(addrs[1].address);
      const owner = await gm_proxy.owner();
      expect(owner).to.equal(addrs[1].address);
    });

    it('Total supply', async () => {
      const total = await gm_proxy.totalSupply();
      expect(total).to.equal('10000000000000000');
    });

    it('Approve/Allowance/TransferFrom', async () => {
      await gm_proxy.approve(addrs[2].address, 2000);
      const allowance = await gm_proxy.allowance(owner.address, addrs[2].address);
      expect(allowance).to.equal(2000);
      const testingAsSigner1 = gm_proxy.connect(addrs[2]);
      await testingAsSigner1.transferFrom(owner.address, addrs[2].address, 2000);
      const balance = await gm_proxy.balanceOf(addrs[2].address);
      expect(balance).to.equal(2000);
      await expect(gm_proxy.transferFrom(owner.address, addrs[2].address, 2000)).to.revertedWith(
        'ERC20: transfer amount exceeds allowance'
      );
    });
  });
});
