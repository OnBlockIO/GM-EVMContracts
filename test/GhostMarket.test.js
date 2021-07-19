const suite = require('../node_modules/erc20-test-suite/lib/suite');
const GhostMarket = artifacts.require("GhostMarket");
const {
  constants,    // Common constants, like the zero address and largest integers
  expectRevert, // Assertions for transactions that should fail
  ether
} = require('@openzeppelin/test-helpers');

contract("GhostMarket", async accounts => {
    it("Owner is set", async () => {
        let instance = await GhostMarket.deployed();
        let owner = await instance.owner.call();
        assert.equal(owner, accounts[0]);
    });

    it("Owner balance after deploy", async () => {
        let instance = await GhostMarket.deployed();
        let owner = await instance.owner.call();
        let ownerBalance = await instance.balanceOf.call(owner);
        assert.equal(ownerBalance.toString(), '10000000000000000');
    });

    it("Owner balance after deploy", async () => {
        let instance = await GhostMarket.deployed();
        let balance = await instance.balanceOf.call(accounts[0]);
        assert.equal(balance.toString(), '10000000000000000');
    });

    it("Name", async () => {
        let instance = await GhostMarket.deployed();
        let name = await instance.name.call();
        assert.equal(name, 'GhostMarket');
    });

    it("Symbol", async () => {
        let instance = await GhostMarket.deployed();
        let symbol = await instance.symbol.call();
        assert.equal(symbol, 'GM');
    });

    it("Decimals", async () => {
        let instance = await GhostMarket.deployed();
        let decimals = await instance.decimals.call();
        assert.equal(decimals, 8);
    });

    it("Pause/unpause contract", async () => {
        let instance = await GhostMarket.deployed();
        let paused = await instance.paused.call();
        assert.equal(paused, false);

        await instance.pause();

        paused = await instance.paused.call();
        assert.equal(paused, true);

        await instance.unpause();
        paused = await instance.paused.call();
        assert.equal(paused, false);
    });

    it("Transfer tokens to another wallet", async () => {
        let instance = await GhostMarket.deployed();
        let transferred = await instance.transfer(accounts[1], 1000);
        let balance = await instance.balanceOf.call(accounts[1]);
        assert.equal(balance.toString(), '1000');

        await expectRevert(instance.transfer(accounts[3], '9999999999999999999999999'),
        "ERC20: transfer amount exceeds balance -- Reason given: ERC20: transfer amount exceeds balance."
        );
    });

    it("Transfer ownership", async () => {
        let instance = await GhostMarket.deployed();
        await instance.transferOwnership(accounts[1]);
        let owner = await instance.owner.call();
        assert.equal(owner, accounts[1]);
    });

    it("Total supply", async () => {
        let instance = await GhostMarket.deployed();
        let total = await instance.totalSupply.call();
        assert.equal(total.toString(), '10000000000000000');
    });

    it("Approve/Allowance/TransferFrom", async () => {
        let instance = await GhostMarket.deployed();
        await instance.approve(accounts[2], 2000);

        let allowance = await instance.allowance.call(accounts[0], accounts[2])
        assert.equal(allowance.toString(), '2000');

        await instance.transferFrom(accounts[0], accounts[2], 2000, { from: accounts[2] })
        assert.equal(allowance.toString(), '2000');

        let balance = await instance.balanceOf.call(accounts[2]);
        assert.equal(balance.toString(), '2000')

        await expectRevert(instance.transferFrom(accounts[0], accounts[2], 2000, { from: accounts[2] }),
        "ERC20: transfer amount exceeds allowance -- Reason given: ERC20: transfer amount exceeds allowance."
        );

        await expectRevert(instance.transferFrom(accounts[0], accounts[2], 2000, { from: accounts[1] }),
        "ERC20: transfer amount exceeds allowance -- Reason given: ERC20: transfer amount exceeds allowance."
        );
    });
});
