const suite = require('../node_modules/erc20-test-suite/lib/suite');
const timeHelper = require('../src/helper.js');
const OnBlockVesting = artifacts.require("OnBlockVesting");
const GhostMarket = artifacts.require("GhostMarket");
const DeflationaryToken = artifacts.require("DeflationaryToken");

const {
  BN,           // Big Number support
  constants,    // Common constants, like the zero address and largest integers
  expectRevert, // Assertions for transactions that should fail
  expectEvent,  // Assertions for emitted events
  ether
} = require('@openzeppelin/test-helpers');

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

contract("OnBlockVesting", async accounts => {
    it("should have 4 voters", async () => {
        const obv = await OnBlockVesting.deployed();

        for (let i=0; i < 4; i++) {
            const success = await obv.isVoter.call(accounts[i]);
            assert.isTrue(success);
        }
    });

    it("should match vault fee", async () => {
        const obv = await OnBlockVesting.deployed();
        const fee = await obv.getVaultFee.call();
        assert.equal(fee, '10000000');
    });

    it("should fail, because is not voter", async () => {
        const obv = await OnBlockVesting.deployed();
        await expectRevert(obv.setVaultFee(new BN('2000000000'), { from: accounts[5] }),
        "Sender is not an active voter -- Reason given: Sender is not an active voter."
        );
        const fee = await obv.getVaultFee.call();
        assert.equal(fee, '10000000');
    });


    it("should fail without vote", async () => {
        const obv = await OnBlockVesting.deployed();
        await expectRevert(obv.setVaultFee(new BN('9999'), { from: accounts[2] }),
        "Vote was not successful yet -- Reason given: Vote was not successful yet."
        );
        const fee = await obv.getVaultFee.call();
        assert.equal(fee, '10000000');
    });

    it("should fail, because fee to high", async () => {
        const obv = await OnBlockVesting.deployed();
        await expectRevert(obv.setVaultFee(new BN('9000000000000000000'), { from: accounts[2] }),
        "Vault fee is too high -- Reason given:  Vault fee is too high."
        );
        const fee = await obv.getVaultFee.call();
        assert.equal(fee, '10000000');
    });

    it("should create new fee update vote", async () => {
        const obv = await OnBlockVesting.deployed();
        const receipt = await obv.requestVote(new BN('3'), ZERO_ADDRESS, new BN('20000000'), { from: accounts[1] });
        expectEvent(receipt, 'VoteRequested', {
            requester: accounts[1],
            onVote: ZERO_ADDRESS,
            newFee: new BN('20000000'),
            action: new BN('3')
        });
    });

    it("should vote on new fee update vote and finish", async () => {
        const obv = await OnBlockVesting.deployed();
        const createReceipt = await obv.requestVote(new BN('3'), ZERO_ADDRESS, new BN('20000000'), { from: accounts[1] });
        expectEvent(createReceipt, 'VoteRequested', {
            requester: accounts[1],
            onVote: ZERO_ADDRESS,
            newFee: new BN('20000000'),
            action: new BN('3')
        });

        const voteReceipt = await obv.vote(new BN('3'), accounts[1], ZERO_ADDRESS, new BN('20000000'), { from: accounts[2] });
        expectEvent(voteReceipt, 'Voted', {
            sender: accounts[2],
            onVote: ZERO_ADDRESS,
            voteAddress: ZERO_ADDRESS,
            voteFee: new BN('20000000'),
            action: new BN('3')
        });

        const voteStateReceipt = await obv.isVoteDone(new BN('3'), ZERO_ADDRESS, new BN('20000000'), { from: accounts[1] });
        expectEvent(voteStateReceipt, 'VoteState', {
            sender: accounts[1],
            voteAddress: ZERO_ADDRESS,
            voteCount: new BN(2),
            minVotes: new BN(3),
            voteFee: new BN('20000000'),
            action: new BN("3")
        });

        const voteState = await obv.isVoteDone.call(new BN('3'), ZERO_ADDRESS, new BN('20000000'), { from: accounts[1] });
        assert.isFalse(voteState);

        const voteReceipt2 = await obv.vote(new BN('3'), accounts[1], ZERO_ADDRESS, new BN('20000000'), { from: accounts[3] });
        expectEvent(voteReceipt2, 'Voted', {
            sender: accounts[3],
            onVote: ZERO_ADDRESS,
            voteAddress: ZERO_ADDRESS,
            voteFee: new BN('20000000'),
            action: new BN('3')
        });

        const voteStateFinal = await obv.isVoteDone.call(new BN('3'), ZERO_ADDRESS, new BN('20000000'), { from: accounts[1] });
        assert.isTrue(voteStateFinal);

        // vote concluded set new fee now, but be sneaky, try to set a different fee

        await expectRevert(obv.setVaultFee(new BN('9999'), { from: accounts[2] }),
        "Vote was not successful yet -- Reason given: Vote was not successful yet."
        );

        // ok let's be serious now
        const setFeeReceipt = await obv.setVaultFee(new BN('20000000'), { from: accounts[2] });
        expectEvent(setFeeReceipt, 'FeeUpdated', {
            updater: accounts[2],
            newFee: new BN('20000000')
        });

        const voteStateAfterDone = await obv.isVoteDone.call(new BN('3'), ZERO_ADDRESS, new BN('20000000'), { from: accounts[1] });
        assert.isFalse(voteStateAfterDone);

    });

    it("should create new withdraw vote", async () => {
        const obv = await OnBlockVesting.deployed();
        const receipt = await obv.requestVote(new BN('0'), accounts[5], new BN('0'), { from: accounts[1] });
        expectEvent(receipt, 'VoteRequested', {
            requester: accounts[1],
            onVote: accounts[5],
            newFee: new BN('0'),
            action: new BN('0')
        });
    });

    it("should vote on new withdraw vote and finish", async () => {
        const obv = await OnBlockVesting.deployed();
        const createReceipt = await obv.requestVote(new BN('0'), accounts[5], new BN('0'), { from: accounts[1] });
        expectEvent(createReceipt, 'VoteRequested', {
            requester: accounts[1],
            onVote: accounts[5],
            newFee: new BN('0'),
            action: new BN('0')
        });

        const voteReceipt = await obv.vote(new BN('0'), accounts[1], accounts[5], new BN('0'), { from: accounts[2] });
        expectEvent(voteReceipt, 'Voted', {
            sender: accounts[2],
            onVote: accounts[5],
            voteAddress: accounts[5],
            voteFee: new BN('0'),
            action: new BN('0')
        });

        const voteStateReceipt = await obv.isVoteDone(new BN('0'), accounts[5], new BN('0'), { from: accounts[1] });
        expectEvent(voteStateReceipt, 'VoteState', {
            sender: accounts[1],
            voteAddress: accounts[5],
            voteCount: new BN(2),
            minVotes: new BN(3),
            action: new BN(0)
        });

        const voteState = await obv.isVoteDone.call(new BN('0'), accounts[5], new BN('0'), { from: accounts[1] });
        assert.isFalse(voteState);

        const voteReceipt2 = await obv.vote(new BN('0'), accounts[1], accounts[5], new BN('0'), { from: accounts[3] });
        expectEvent(voteReceipt2, 'Voted', {
            sender: accounts[3],
            onVote: accounts[5],
            voteAddress: accounts[5],
            voteFee: new BN('0'),
            action: new BN('0')
        });

        const voteStateReceipt2 = await obv.isVoteDone(new BN('0'), accounts[5], new BN('0'), { from: accounts[1] });
        expectEvent(voteStateReceipt2, 'VoteState', {
            sender: accounts[1],
            voteAddress: accounts[5],
            voteCount: new BN(3),
            minVotes: new BN(3),
            action: new BN(0)
        });

        const voteStateFinal = await obv.isVoteDone.call(new BN('0'), accounts[5], new BN('0'), { from: accounts[1] });
        assert.isTrue(voteStateFinal);
    });

    it("should create new vesting vault", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const fee = await obv.getVaultFee.call();
        const receipt = await obv.createVault(gm.address, { value: fee})
        expectEvent(receipt, 'VaultCreated', { vaultId: new BN('1'), token: gm.address, fee: fee});
    });

    it("should create new vesting vault for deflationary", async () => {
        const obv = await OnBlockVesting.deployed();
        const dft = await DeflationaryToken.deployed();

        const fee = await obv.getVaultFee.call();
        const receipt = await obv.createVault(dft.address, { value: fee})
        expectEvent(receipt, 'VaultCreated', { vaultId: new BN('2'), token: dft.address, fee: fee});
    });

    it("should fail adding beneficiary, deflationary token", async () => {
        const obv = await OnBlockVesting.deployed();
        const dft = await DeflationaryToken.deployed();

        await dft.approve(obv.address, 100);
        const block = await web3.eth.getBlock("latest")
        const time = block.timestamp + 10;

        await expectRevert(obv.addBeneficiary(dft.address, accounts[1], 100,
            time, 86400 * 100 /* 100 days */, 0, 1),
        "SafeERC20: low-level call failed -- Reason given: Deflationary tokens are not supported!."
        );
    });

    it("should verify fee balance", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const feeBalance = await obv.feeBalance.call()
        const vaults = await obv.getActiveVaults.call();
        const fee = (await obv.getVaultFee.call()) * vaults.length;
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

        const block = await web3.eth.getBlock("latest")
        const time = block.timestamp + 10;
        await expectRevert(obv.addBeneficiary(gm.address, accounts[1], 100,
            time, 86400 * 100 /* 100 days */, 0, 1),
        "Token allowance check failed -- Reason given: Token allowance check failed"
        );
    });

    it("should add beneficiary, fixed", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        await gm.approve(obv.address, 100);

        const block = await web3.eth.getBlock("latest")
        const time = block.timestamp + 10;
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
        const block = await web3.eth.getBlock("latest")
        const time = block.timestamp + 10;
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

        const block = await web3.eth.getBlock("latest")
        const time = block.timestamp + 10;
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
        const block = await web3.eth.getBlock("latest")
        const time = block.timestamp + 10;
        const receipt = await obv.addBeneficiary(gm.address, accounts[3], 200,
            time, 1000 /* 1000 seconds */, 100, 1);
        expectEvent(receipt, 'AddedBeneficiary', { vaultId: new BN('1'), account: accounts[3], amount: new BN('200'),
            startTime: new BN(time), duration: new BN(1000), lockType: '1' });
    });

    it("should match no releaseable amount, before cliff, linear", async () => {
        const obv = await OnBlockVesting.deployed();
        const gm = await GhostMarket.deployed();

        const block = await web3.eth.getBlock("latest")
        const time = block.timestamp + 10;
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
        assert.equal(vaults.length, 2)
    });
});
