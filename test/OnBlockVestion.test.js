const suite = require('../node_modules/erc20-test-suite/lib/suite');
const timeHelper = require('../src/helper.js');
const OnBlockVesting = artifacts.require("OnBlockVesting");
const GhostMarket = artifacts.require("GhostMarket");

const {
  BN,           // Big Number support
  constants,    // Common constants, like the zero address and largest integers
  expectRevert, // Assertions for transactions that should fail
  expectEvent,  // Assertions for emitted events
  ether
} = require('@openzeppelin/test-helpers');

const TEN_SECONDS_FROM_NOW = Date.now() / 1000 + 10 | 0

contract("OnBlockVesting", async accounts => {
    it("should match owner", async () => {
        const obv = await OnBlockVesting.deployed();
        const owner = await obv.owner.call();
        assert.equal(owner, accounts[0]);
    });

    it("should match vault fee", async () => {
        const obv = await OnBlockVesting.deployed();
        const fee = await obv.getVaultFee.call();
        assert.equal(fee, '10000000');
    });

    it("should match updated vault fee", async () => {
        const obv = await OnBlockVesting.deployed();
        await obv.setVaultFee(new BN('2000000000'));
        const fee = await obv.getVaultFee.call();
        assert.equal(fee, '2000000000');
    });

    it("should fail, because not the owner", async () => {
        const obv = await OnBlockVesting.deployed();
        await expectRevert(obv.setVaultFee(new BN('2000000000'), { from: accounts[2] }),
        "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner"
        );
        const fee = await obv.getVaultFee.call();
        assert.equal(fee, '2000000000');
    });

    it("should transfer ownership", async () => {
        const obv = await OnBlockVesting.deployed();
        await obv.transferOwnership(accounts[4]);
        const owner = await obv.owner.call();
        assert.equal(owner, accounts[4])
        await obv.transferOwnership(accounts[0], { from: accounts[4] });
        const ownerAfter = await obv.owner.call();
        assert.equal(ownerAfter, accounts[0])
    });

    it("should create new vesting vault", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const receipt = await obv.createVault(gm.address, { value: '2000000000'})
        const fee = await obv.getVaultFee.call();
        expectEvent(receipt, 'VaultCreated', { vaultId: new BN('1'), token: gm.address, fee: fee});
    });

    it("should verify fee balance", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const feeBalance = await obv.feeBalance.call()
        const fee = await obv.getVaultFee.call();
        assert.equal(feeBalance.toString(), fee.toString());
    });

    it("should withdraw fee", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const balanceBefore = web3.utils.toBN(await web3.eth.getBalance(accounts[5]));
        const feeBefore = web3.utils.toBN(await obv.feeBalance.call());
        await obv.withdrawVaultFee(accounts[5])

        const feeAfter = await obv.feeBalance.call();
        assert.equal(feeAfter.toString(), '0');
        const balanceAfter = web3.utils.toBN(await web3.eth.getBalance(accounts[5]));
        assert.equal(balanceBefore.add(feeBefore).toString(), balanceAfter.toString());
    });

    it("should revert because vault exists already", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        await expectRevert(obv.createVault(gm.address),
        "Vault exists already -- Reason given: Vault exists already"
        );
    });

    it("should fail adding beneficiary, no allowance", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        await expectRevert(obv.addBeneficiary(gm.address, accounts[1], 100,
            TEN_SECONDS_FROM_NOW, 86400 * 100 /* 100 days */, 0, 1),
        "Token allowance check failed -- Reason given: Token allowance check failed"
        );
    });

    it("should add beneficiary, fixed", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        await gm.approve(obv.address, 100);

        const time = TEN_SECONDS_FROM_NOW;
        const receipt = await obv.addBeneficiary(gm.address, accounts[1], 100,
            time, 1000 /* 1000 seconds */, 0, 0);
        expectEvent(receipt, 'AddedBeneficiary', { vaultId: new BN('1'), account: accounts[1], amount: new BN('100'),
            startTime: new BN(time), duration: new BN(1000), lockType: '0' });
    });

    it("should add beneficiary, linear", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        await gm.approve(obv.address, 200);

        const allowance = await gm.allowance.call(accounts[0], obv.address);
        const time = TEN_SECONDS_FROM_NOW;
        const receipt = await obv.addBeneficiary(gm.address, accounts[2], 200,
            time, 1000 /* 1000 seconds */, 0, 1);
        expectEvent(receipt, 'AddedBeneficiary', { vaultId: new BN('1'), account: accounts[2], amount: new BN('200'),
            startTime: new BN(time), duration: new BN(1000), lockType: '1' });
    });

    it("should match no releaseable amount, fixed", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const snapshot = await timeHelper.takeSnapshot();
        try {
            await timeHelper.advanceTimeAndBlock(1000);
            const beneficiary = await obv.readBeneficiary.call(gm.address, accounts[1]);

            const block = await web3.eth.getBlock("latest")
            const amount = await obv.releasableAmount.call(gm.address, accounts[1]);

            assert.equal(amount.toString(), '0');

        } finally {
            await timeHelper.revertToSnapShot(snapshot['result']);
        }

    });

    it("should match full releaseable amount, fixed", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const snapshot = await timeHelper.takeSnapshot();
        try {
            await timeHelper.advanceTimeAndBlock(1010);
            const beneficiary = await obv.readBeneficiary.call(gm.address, accounts[1]);

            const block = await web3.eth.getBlock("latest")
            const amount = await obv.releasableAmount.call(gm.address, accounts[1]);
            const calculatedAmount = Math.trunc(beneficiary.amount * (block.timestamp - beneficiary.startTime) / beneficiary.duration);

            assert.equal(amount.toString(), '100');

        } finally {
            await timeHelper.revertToSnapShot(snapshot['result']);
        }

    });

    it("should match releaseable amount, linear", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const snapshot = await timeHelper.takeSnapshot();
        try {
            await timeHelper.advanceTimeAndBlock(1000);
            const beneficiary = await obv.readBeneficiary.call(gm.address, accounts[2]);

            const block = await web3.eth.getBlock("latest")
            const calculatedAmount = Math.trunc(beneficiary.amount * (block.timestamp - beneficiary.startTime) / beneficiary.duration);

            const amount = await obv.releasableAmount.call(gm.address, accounts[2]);

            assert.equal(amount.toString(), calculatedAmount.toString());

        } finally {
            await timeHelper.revertToSnapShot(snapshot['result']);
        }

    });

    it("should match full releaseable amount, linear", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const time = TEN_SECONDS_FROM_NOW;
        const snapshot = await timeHelper.takeSnapshot();
        try {
            await timeHelper.advanceTimeAndBlock(10000000000);
            const beneficiary = await obv.readBeneficiary.call(gm.address, accounts[2]);

            const block = await web3.eth.getBlock("latest")
            const amount = await obv.releasableAmount.call(gm.address, accounts[2]);

            assert.equal(amount.toString(), beneficiary.amount);

        } finally {
            await timeHelper.revertToSnapShot(snapshot['result']);
        }

    });

    it("should add beneficiary with cliff, linear", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        await gm.approve(obv.address, 200);

        const allowance = await gm.allowance.call(accounts[0], obv.address);
        const time = TEN_SECONDS_FROM_NOW;
        const receipt = await obv.addBeneficiary(gm.address, accounts[3], 200,
            time, 1000 /* 1000 seconds */, 100, 1);
        expectEvent(receipt, 'AddedBeneficiary', { vaultId: new BN('1'), account: accounts[3], amount: new BN('200'),
            startTime: new BN(time), duration: new BN(1000), lockType: '1' });
    });

    it("should match no releaseable amount, before cliff, linear", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const time = TEN_SECONDS_FROM_NOW;
        const snapshot = await timeHelper.takeSnapshot();
        try {
            await timeHelper.advanceTimeAndBlock(99);
            const beneficiary = await obv.readBeneficiary.call(gm.address, accounts[3]);

            const block = await web3.eth.getBlock("latest")
            const amount = await obv.releasableAmount.call(gm.address, accounts[3]);
            assert.equal(amount.toString(), '0');

        } finally {
            await timeHelper.revertToSnapShot(snapshot['result']);
        }
    });


    it("should match releaseable amount, after cliff, linear", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();
        const beneficiary = await obv.readBeneficiary.call(gm.address, accounts[3]);

        const snapshot = await timeHelper.takeSnapshot();
        try {
            await timeHelper.advanceTimeAndBlock(110); // 100s cliff & now + 10s = startTime = 110

            const block = await web3.eth.getBlock("latest")
            const calculatedAmount = Math.trunc(beneficiary.amount * (block.timestamp - beneficiary.startTime) / beneficiary.duration);
            const amount = await obv.releasableAmount.call(gm.address, accounts[3]);

            assert.equal(amount.toString(), calculatedAmount.toString());

        } finally {
            await timeHelper.revertToSnapShot(snapshot['result']);
        }
    });

    it("should release vested amount, fixed", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();
        const beneficiary = await obv.readBeneficiary.call(gm.address, accounts[1]);

        const contractAmountBefore = await gm.balanceOf.call(obv.address);
        const snapshot = await timeHelper.takeSnapshot();
        try {
            await timeHelper.advanceTimeAndBlock(1010); // 100s cliff & now + 10s = startTime = 110

            const block = await web3.eth.getBlock("latest")
            const calculatedAmount = Math.trunc(beneficiary.amount * (block.timestamp - beneficiary.startTime) / beneficiary.duration);

            const receipt = await obv.release(gm.address, accounts[1]);
            expectEvent(receipt, 'Release', { vaultId: new BN('1'), account: accounts[1], amount: new BN(calculatedAmount),
                released: new BN(calculatedAmount) });

            const amount = await gm.balanceOf.call(accounts[1]);
            assert.equal(amount.toString(), calculatedAmount.toString());
            const contractAmountAfter = await gm.balanceOf.call(obv.address);
            assert.equal(contractAmountAfter, contractAmountBefore - amount);

            const releaseable = await obv.releasableAmount.call(gm.address, accounts[1]);

        } finally {
            await timeHelper.revertToSnapShot(snapshot['result']);
        }
    });

    it("should release vested amount, linear", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();
        const beneficiary = await obv.readBeneficiary.call(gm.address, accounts[2]);

        const contractAmountBefore = await gm.balanceOf.call(obv.address);
        const snapshot = await timeHelper.takeSnapshot();
        try {
            await timeHelper.advanceTimeAndBlock(1000);
            const block = await web3.eth.getBlock("latest")
            const calculatedAmount = Math.trunc(beneficiary.amount * (block.timestamp - beneficiary.startTime) / beneficiary.duration);

            const receipt = await obv.release(gm.address, accounts[2]);
            expectEvent(receipt, 'Release', { vaultId: new BN('1'), account: accounts[2], amount: new BN(calculatedAmount),
                released: new BN(calculatedAmount) });

            const amount = await gm.balanceOf.call(accounts[2]);
            assert.equal(amount.toString(), calculatedAmount.toString());
            const contractAmountAfter = await gm.balanceOf.call(obv.address);
            assert.equal(contractAmountAfter, contractAmountBefore - amount);

            // advance time again
            await timeHelper.advanceTimeAndBlock(1000);

            const releaseable = await obv.releasableAmount.call(gm.address, accounts[2]);
            const beneficiary2 = await obv.readBeneficiary.call(gm.address, accounts[2]);
            assert.equal(parseInt(releaseable) + parseInt(beneficiary2.released), beneficiary.amount);

            const receipt2 = await obv.release(gm.address, accounts[2]);
            expectEvent(receipt2, 'Release', { vaultId: new BN('1'), account: accounts[2], amount: new BN(2),
                released: beneficiary.amount });

            const releaseable2 = await obv.releasableAmount.call(gm.address, accounts[2]);
            const beneficiary3 = await obv.readBeneficiary.call(gm.address, accounts[2]);
            assert.equal(parseInt(releaseable2) + parseInt(beneficiary3.released), beneficiary.amount);

        } finally {
            await timeHelper.revertToSnapShot(snapshot['result']);
        }
    });

    it("should release vested amount, with cliff, linear", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();
        const beneficiary = await obv.readBeneficiary.call(gm.address, accounts[3]);

        const contractAmountBefore = await gm.balanceOf.call(obv.address);
        const snapshot = await timeHelper.takeSnapshot();
        try {
            await timeHelper.advanceTimeAndBlock(1000);
            const block = await web3.eth.getBlock("latest")
            const calculatedAmount = Math.trunc(beneficiary.amount * (block.timestamp - beneficiary.startTime) / beneficiary.duration);

            const receipt = await obv.release(gm.address, accounts[3]);
            expectEvent(receipt, 'Release', { vaultId: new BN('1'), account: accounts[3], amount: new BN(calculatedAmount),
                released: new BN(calculatedAmount) });

            const amount = await gm.balanceOf.call(accounts[3]);
            assert.equal(amount.toString(), calculatedAmount.toString());
            const contractAmountAfter = await gm.balanceOf.call(obv.address);
            assert.equal(contractAmountAfter, contractAmountBefore - amount);

        } finally {
            await timeHelper.revertToSnapShot(snapshot['result']);
        }
    });

    it("should return all active vaults", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const vaults = await obv.getActiveVaults.call();
        assert.equal(vaults.length, 1)
    });
});
