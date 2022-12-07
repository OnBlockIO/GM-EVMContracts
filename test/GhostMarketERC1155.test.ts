import {expect} from '../utils/chai-setup';
import {ethers, upgrades} from 'hardhat';
import {GhostMarketERC1155} from '../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {BigNumber} from 'ethers';

describe('GhostMarket ERC1155 Test', function () {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const DATA = '0x';
  const MINT_AMOUNT = 2;
  const TOKEN_NAME = 'GhostMarket';
  const TOKEN_SYMBOL = 'GHOST';
  const BASE_URI = 'https://ghostmarket.io/';
  const METADATA_JSON =
    '{"name":"My NFT Name","description":"My NFT Name","image":"ipfs://QmWpUHUKjcYbhqGtxHnH39F5tLepfztGQAcYtsnHtWfgjD","external_url":"extURI","attributes":[{"type":"AttrT1","value":"AttrV1","display":""},{"type":"AttrT2","value":"AttrV2","display":""}],"properties":{"has_locked":true,"creator":"0x9e1bd73820a607b06086b5b5173765a61ceee7dc","royalties":0,"type":2}}';
  let erc1155_proxy: GhostMarketERC1155;
  let owner: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let testingAsSigner1: GhostMarketERC1155;
  let testingAsSigner3: GhostMarketERC1155;

  /*before('Deploy Contracts', async() => {
  })*/

  beforeEach(async function () {
    const ERC1155 = await ethers.getContractFactory('GhostMarketERC1155');
    [owner, ...addrs] = await ethers.getSigners();
    erc1155_proxy = <GhostMarketERC1155>await upgrades.deployProxy(ERC1155, [TOKEN_NAME, TOKEN_SYMBOL, BASE_URI], {
      initializer: 'initialize',
      unsafeAllowCustomTypes: true,
    });
    await erc1155_proxy.deployed();
    testingAsSigner1 = erc1155_proxy.connect(addrs[1]);
    testingAsSigner3 = erc1155_proxy.connect(addrs[3]);
  });

  it('should have name ' + TOKEN_NAME, async function () {
    expect((await erc1155_proxy.name()).toString()).to.equal(TOKEN_NAME);
  });

  it('should have symbol ' + TOKEN_SYMBOL, async function () {
    expect((await erc1155_proxy.symbol()).toString()).to.equal(TOKEN_SYMBOL);
  });

  it('should support interface _INTERFACE_ID_ERC1155_GHOSTMARKET', async function () {
    expect((await erc1155_proxy.supportsInterface(ethers.utils.hexlify('0x94407210'))).toString()).to.equal('true');
  });

  it('should support interface _GHOSTMARKET_NFT_ROYALTIES', async function () {
    expect((await erc1155_proxy.supportsInterface(ethers.utils.hexlify('0xe42093a6'))).toString()).to.equal('true');
  });

  it('should have initial counter = 1', async function () {
    expectEqualStringValues(await erc1155_proxy.getCurrentCounter(), 1);
  });

  it('should transfer ownership of contract', async function () {
    await erc1155_proxy.transferOwnership(addrs[1].address);
    expect(await erc1155_proxy.owner()).to.equal(addrs[1].address);
  });

  it('should upgrade contract', async function () {
    const GhostMarketERC1155_ContractFactory = await ethers.getContractFactory('GhostMarketERC1155');
    const GhostMarketERC1155V2_ContractFactory = await ethers.getContractFactory('GhostMarketERC1155V2');

    const ghostMarketERC1155 = await upgrades.deployProxy(
      GhostMarketERC1155_ContractFactory,
      [TOKEN_NAME, TOKEN_SYMBOL, BASE_URI],
      {initializer: 'initialize', unsafeAllowCustomTypes: true}
    );

    //upgrade
    const ghostMarketERC1155V2 = await upgrades.upgradeProxy(
      ghostMarketERC1155.address,
      GhostMarketERC1155V2_ContractFactory
    );

    //test new function
    expect(await ghostMarketERC1155V2.getSomething()).to.equal(10);

    //name and symbol should be the same
    expect((await ghostMarketERC1155V2.name()).toString()).to.equal(TOKEN_NAME);
    expect((await ghostMarketERC1155V2.symbol()).toString()).to.equal(TOKEN_SYMBOL);
  });

  it('should be able to pause/unpause contract', async () => {
    let paused = await erc1155_proxy.paused();
    expect(paused).to.equal(false);
    await erc1155_proxy.pause();
    paused = await erc1155_proxy.paused();
    expect(paused).to.equal(true);
    await erc1155_proxy.unpause();
    paused = await erc1155_proxy.paused();
    expect(paused).to.equal(false);
  });

  it('should mint token and have base uri', async function () {
    await erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT, DATA, [], 'ext_uri', '', '');
    const tokenId = await getLastTokenID(erc1155_proxy);
    expect(await erc1155_proxy.uri(tokenId)).to.equal(BASE_URI);
  });

  it('should mint token and have new base uri', async function () {
    const newUri = 'gggghost/api/{id}.json';
    erc1155_proxy.setURI(newUri);
    await erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT, DATA, [], 'ext_uri', '', '');
    const tokenId = await getLastTokenID(erc1155_proxy);
    expect(await erc1155_proxy.uri(tokenId)).to.equal(newUri);
  });

  describe('burn NFT', function () {
    it('should burn a single NFT', async function () {
      await erc1155_proxy.mintGhost(owner.address, MINT_AMOUNT, DATA, [], 'ext_uri', '', '');
      //confirm its minted
      const tokenId = await getLastTokenID(erc1155_proxy);
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId), MINT_AMOUNT);
      await erc1155_proxy.burn(owner.address, tokenId, MINT_AMOUNT);
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId), 0);
    });

    it('should revert if not-owner tries to burn a NFT', async function () {
      await erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT, DATA, [], 'ext_uri', '', '');
      //confirm its minted
      const tokenId = await getLastTokenID(erc1155_proxy);
      expectEqualStringValues(await erc1155_proxy.balanceOf(addrs[0].address, tokenId), MINT_AMOUNT);

      await expect(
        testingAsSigner1.burn(addrs[1].address, tokenId, MINT_AMOUNT, {from: addrs[1].address})
      ).revertedWith('ERC1155: burn amount exceeds balance');
    });

    it('should burn multiple NFTs', async function () {
      const MINT_AMOUNT = ethers.BigNumber.from(20);
      const MINT_AMOUNT2 = ethers.BigNumber.from(30);
      const burnAmounts = [ethers.BigNumber.from(20), ethers.BigNumber.from(10)];

      await erc1155_proxy.mintGhost(owner.address, MINT_AMOUNT, DATA, [], 'ext_uri', '', '');
      const tokenId = await getLastTokenID(erc1155_proxy);
      await erc1155_proxy.mintGhost(owner.address, MINT_AMOUNT2, DATA, [], 'ext_uri', '', '');
      const tokenId2 = await getLastTokenID(erc1155_proxy);

      //confirm its minted
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId), MINT_AMOUNT);
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId2), MINT_AMOUNT2);

      const tokenBatchIds = [tokenId, tokenId2];
      await erc1155_proxy.burnBatch(owner.address, tokenBatchIds, burnAmounts);
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId), MINT_AMOUNT.sub(burnAmounts[0]));
      expectEqualStringValues(await erc1155_proxy.balanceOf(owner.address, tokenId2), MINT_AMOUNT2.sub(burnAmounts[1]));
      expect(await erc1155_proxy.balanceOf(owner.address, tokenId)).to.equal(MINT_AMOUNT.sub(burnAmounts[0]));
      expect(await erc1155_proxy.balanceOf(owner.address, tokenId2)).to.equal(MINT_AMOUNT2.sub(burnAmounts[1]));
    });

    it('should revert if not-owner tries to burn a NFTs', async function () {
      const MINT_AMOUNT = ethers.BigNumber.from(20);
      const MINT_AMOUNT2 = ethers.BigNumber.from(30);
      const burnAmounts = [ethers.BigNumber.from(20), ethers.BigNumber.from(10)];
      await erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT, DATA, [], 'ext_uri', '', '');
      const tokenId = await getLastTokenID(erc1155_proxy);
      await erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT2, DATA, [], 'ext_uri', '', '');
      const tokenId2 = await getLastTokenID(erc1155_proxy);
      //confirm its minted
      expectEqualStringValues(await erc1155_proxy.balanceOf(addrs[0].address, tokenId), MINT_AMOUNT);
      expectEqualStringValues(await erc1155_proxy.balanceOf(addrs[0].address, tokenId2), MINT_AMOUNT2);
      const tokenBatchIds = [tokenId, tokenId2];

      await expect(
        testingAsSigner3.burnBatch(addrs[0].address, tokenBatchIds, burnAmounts, {from: addrs[3].address})
      ).revertedWith('ERC1155: caller is not owner nor approved');
    });
  });

  describe('mint with royalty', function () {
    it('should set royalties', async function () {
      const royaltyValue = 100;
      await erc1155_proxy.mintGhost(
        addrs[1].address,
        MINT_AMOUNT,
        DATA,
        [{recipient: addrs[2].address, value: royaltyValue}],
        'ext_uri',
        '',
        ''
      );
      const tokenId = await getLastTokenID(erc1155_proxy);
      const royalties = await erc1155_proxy.getRoyalties(tokenId);
      expect(royalties.length).to.equal(1);
      expectEqualStringValues(royalties[0].recipient, addrs[2].address);
      expectEqualStringValues(royalties[0].value, royaltyValue);
    });

    it('should mint tokens with royalty fee and address', async function () {
      const value = 40;
      const counter = parseInt((await erc1155_proxy.getCurrentCounter()).toString());
      const result = erc1155_proxy.mintGhost(
        addrs[1].address,
        MINT_AMOUNT,
        DATA,
        [{recipient: addrs[0].address, value: value}],
        'ext_uri',
        '',
        ''
      );
      const tokenId = await getLastTokenID(erc1155_proxy);
      await expect(result)
        .to.emit(erc1155_proxy, 'TransferSingle')
        .withArgs(owner.address, ZERO_ADDRESS, addrs[1].address, tokenId, MINT_AMOUNT);
      expect(parseInt((await erc1155_proxy.getCurrentCounter()).toString())).to.equal(counter + 1);

      const values = await erc1155_proxy.getRoyaltiesBps(tokenId);
      const royaltyRecipient = await erc1155_proxy.getRoyaltiesRecipients(tokenId);
      expect(values.length).to.equal(1);
      expectEqualStringValues(values[0], value);
      expectEqualStringValues(royaltyRecipient[0], addrs[0].address);

      await expect(result).to.emit(erc1155_proxy, 'Minted').withArgs(addrs[1].address, tokenId, 'ext_uri', MINT_AMOUNT);
    });

    it('should revert if royalty is more then 50%', async function () {
      const value = 5001;
      await expect(
        erc1155_proxy.mintGhost(
          addrs[1].address,
          MINT_AMOUNT,
          DATA,
          [{recipient: addrs[0].address, value: value}],
          'ext_uri',
          '',
          ''
        )
      ).revertedWith('Royalties value should not be more than 50%');
    });
  });

  it('everyone can mint', async function () {
    testingAsSigner1.mintGhost(addrs[1].address, MINT_AMOUNT, DATA, [], 'ext_uri', '', '', {from: addrs[2].address});
  });

  it('should mint with json string', async function () {
    await erc1155_proxy.mintGhost(addrs[0].address, MINT_AMOUNT, DATA, [], 'ext_uri', METADATA_JSON, '');
    const tokenId = await getLastTokenID(erc1155_proxy);
    expect(await erc1155_proxy.getMetadataJson(tokenId)).to.equal(METADATA_JSON);
  });

  describe('mint with locked content', function () {
    const MINT_AMOUNT = ethers.BigNumber.from(1);
    const hiddencontent = 'top secret';
    it('should set and get locked content for nft', async function () {
      await erc1155_proxy.mintGhost(addrs[1].address, MINT_AMOUNT, DATA, [], 'ext_uri', '', hiddencontent);
      const tokenId = await getLastTokenID(erc1155_proxy);

      const result = testingAsSigner1.getLockedContent(tokenId, {from: addrs[1].address});
      await expect(result)
        .to.emit(erc1155_proxy, 'LockedContentViewed')
        .withArgs(addrs[1].address, tokenId, hiddencontent);
    });

    it('should revert if other then token owner tries to fetch locked content', async function () {
      await erc1155_proxy.mintGhost(owner.address, MINT_AMOUNT, DATA, [], 'ext_uri', '', hiddencontent);
      const tokenId = await getLastTokenID(erc1155_proxy);
      //caller is the minter
      await erc1155_proxy.getLockedContent(tokenId);
      await expect(testingAsSigner3.getLockedContent(tokenId, {from: addrs[3].address})).revertedWith(
        'Caller must be the owner of the NFT'
      );
    });

    it('should increment locked content view count', async function () {
      const hiddencontent = 'top secret';
      await erc1155_proxy.mintGhost(owner.address, MINT_AMOUNT, DATA, [], 'ext_uri', '', hiddencontent);
      const tokenId = await getLastTokenID(erc1155_proxy);
      const currentCounter = await erc1155_proxy.getCurrentLockedContentViewTracker(tokenId);
      // call two times the getLockedContent function, counter should increment by 2
      await erc1155_proxy.getLockedContent(tokenId);
      await erc1155_proxy.getLockedContent(tokenId);
      expectEqualStringValues(await erc1155_proxy.getCurrentLockedContentViewTracker(tokenId), currentCounter.add(2));
      //another NFT
      await testingAsSigner1.mintGhost(addrs[1].address, MINT_AMOUNT, DATA, [], 'ext_uri', '', 'top secret2');
      const tokenId2 = await getLastTokenID(erc1155_proxy);
      const currentCounter2 = await erc1155_proxy.getCurrentLockedContentViewTracker(tokenId2);

      await testingAsSigner1.getLockedContent(tokenId2, {from: addrs[1].address});
      expectEqualStringValues(await erc1155_proxy.getCurrentLockedContentViewTracker(tokenId2), currentCounter2.add(1));
    });
  });

  function expectEqualStringValues(value1: BigNumber | number | string, value2: BigNumber | number | string) {
    expect(value1.toString()).to.equal(value2.toString());
  }

  async function getLastTokenID(token: GhostMarketERC1155): Promise<BigNumber> {
    const counter = await token.getCurrentCounter();
    if (ethers.BigNumber.from(counter).eq(ethers.BigNumber.from(0))) {
      return ethers.BigNumber.from(counter);
    } else return ethers.BigNumber.from(counter).sub(1);
  }
});
