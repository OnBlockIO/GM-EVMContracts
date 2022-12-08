import {expect} from '../utils/chai-setup';
import {ethers, upgrades} from 'hardhat';
import {GhostMarketERC721} from '../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {BigNumber} from 'ethers';

describe('GhostMarket ERC721 Test', function () {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const TOKEN_NAME = 'GhostMarket';
  const TOKEN_SYMBOL = 'GHOST';
  const BASE_URI = 'https://ghostmarket.io/';
  const METADATA_JSON =
    '{"name":"My NFT Name","description":"My NFT Name","image":"ipfs://QmWpUHUKjcYbhqGtxHnH39F5tLepfztGQAcYtsnHtWfgjD","external_url":"extURI","attributes":[{"type":"AttrT1","value":"AttrV1","display":""},{"type":"AttrT2","value":"AttrV2","display":""}],"properties":{"has_locked":true,"creator":"0x9e1bd73820a607b06086b5b5173765a61ceee7dc","royalties":0,"type":2}}';
  let erc721_proxy: GhostMarketERC721;
  let owner: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let testingAsSigner1: GhostMarketERC721;

  /*before('Deploy Contracts', async() => {
    })*/

  beforeEach(async function () {
    const ERC721 = await ethers.getContractFactory('GhostMarketERC721');
    [owner, ...addrs] = await ethers.getSigners();
    erc721_proxy = <GhostMarketERC721>await upgrades.deployProxy(ERC721, [TOKEN_NAME, TOKEN_SYMBOL, BASE_URI], {
      initializer: 'initialize',
      unsafeAllowCustomTypes: true,
    });
    await erc721_proxy.deployed();
    testingAsSigner1 = erc721_proxy.connect(addrs[1]);
  });

  it('name should be ' + TOKEN_NAME, async function () {
    expect((await erc721_proxy.name()).toString()).to.equal(TOKEN_NAME);
  });

  it('symbol should be ' + TOKEN_SYMBOL, async function () {
    expect((await erc721_proxy.symbol()).toString()).to.equal(TOKEN_SYMBOL);
  });

  it('should support interface _INTERFACE_ID_ERC721_GHOSTMARKET', async function () {
    expect((await erc721_proxy.supportsInterface('0xee40ffc1')).toString()).to.equal('true');
  });

  it('should support interface _GHOSTMARKET_NFT_ROYALTIES', async function () {
    expect((await erc721_proxy.supportsInterface('0xe42093a6')).toString()).to.equal('true');
  });

  it('should upgrade contract', async function () {
    const GhostMarketERC721_ContractFactory = await ethers.getContractFactory('GhostMarketERC721');
    const GhostMarketERC721V2_ContractFactory = await ethers.getContractFactory('GhostMarketERC721V2');

    const ghostMarketERC721 = await upgrades.deployProxy(
      GhostMarketERC721_ContractFactory,
      [TOKEN_NAME, TOKEN_SYMBOL, BASE_URI],
      {initializer: 'initialize', unsafeAllowCustomTypes: true}
    );

    //upgrade
    const ghostMarketERC721V2 = await upgrades.upgradeProxy(
      ghostMarketERC721.address,
      GhostMarketERC721V2_ContractFactory
    );

    //test new function
    expect(await ghostMarketERC721V2.getSomething()).to.equal(10);

    //name and symbol should be the same
    expect((await ghostMarketERC721V2.name()).toString()).to.equal(TOKEN_NAME);
    expect((await ghostMarketERC721V2.symbol()).toString()).to.equal(TOKEN_SYMBOL);
  });

  it('should transfer ownership of contract', async function () {
    await erc721_proxy.transferOwnership(addrs[1].address);
    expect(await erc721_proxy.owner()).to.equal(addrs[1].address);
  });

  it('should have base uri + token uri', async function () {
    await erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '', '');
    const tokenId = await erc721_proxy.getLastTokenID();
    expect(await erc721_proxy.tokenURI(tokenId)).to.equal(BASE_URI + tokenId);
  });

  it('should have tokenId = 1', async function () {
    await erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '', '');
    const tokenId = await erc721_proxy.getLastTokenID();
    expectEqualStringValues(tokenId, 1);
  });

  it('should revert if externalURI is empty', async function () {
    await expect(erc721_proxy.mintGhost(addrs[0].address, [], '', '', '')).revertedWith("externalURI can't be empty");
  });

  it('should mintGhost with new URI', async function () {
    const newURI = 'new.app/';
    await erc721_proxy.setBaseTokenURI(newURI);
    await erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '', '');
    const tokenId = await erc721_proxy.getLastTokenID();
    expect(await erc721_proxy.tokenURI(tokenId)).to.equal(newURI + tokenId);
  });

  it('should mintGhost with URI', async function () {
    await erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '', '');
    const tokenId = await erc721_proxy.getLastTokenID();
    expect(await erc721_proxy.tokenURI(tokenId)).to.equal(BASE_URI + tokenId);
  });

  describe('burn NFT', function () {
    it('should burn a single NFT', async function () {
      await erc721_proxy.mintGhost(owner.address, [], 'ext_uri', '', '');
      //confirm its minted
      const tokenId = await erc721_proxy.getLastTokenID();
      expectEqualStringValues(await erc721_proxy.balanceOf(owner.address), 1);
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(owner.address);

      await erc721_proxy.burn(tokenId);
      //token should not exists anymore
      await expect(erc721_proxy.ownerOf(tokenId)).revertedWith('ERC721: owner query for nonexistent token');
    });

    it('should burn multiple NFTs', async function () {
      const tokenIDs = [1, 2, 3, 4, 5];
      for (let i = 0; i < tokenIDs.length; i++) {
        await erc721_proxy.mintGhost(owner.address, [], 'ext_uri', '', '');
      }

      //confirm minted tokens
      expectEqualStringValues(await erc721_proxy.balanceOf(owner.address), tokenIDs.length);
      for (const i of tokenIDs) {
        expect(await erc721_proxy.ownerOf(i)).to.equal(owner.address);
      }
      await erc721_proxy.burnBatch(tokenIDs);
      for (const i of tokenIDs) {
        await expect(erc721_proxy.ownerOf(i)).revertedWith('ERC721: owner query for nonexistent token');
      }
    });

    it('should revert if not-owner tries to burn a NFTs', async function () {
      const tokenIDs = [1, 2];
      for (let i = 0; i < tokenIDs.length; i++) {
        await erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '', '');
      }

      //confirm minted tokens
      expectEqualStringValues(await erc721_proxy.balanceOf(addrs[0].address), tokenIDs.length);
      for (const i of tokenIDs) {
        expect(await erc721_proxy.ownerOf(i)).to.equal(addrs[0].address);
      }

      await expect(testingAsSigner1.burnBatch(tokenIDs, {from: addrs[1].address})).revertedWith(
        'ERC721Burnable: caller is not owner nor approved'
      );
    });
  });

  describe('mint NFT', function () {
    it('should mint tokens, nft owner = contract deployer', async function () {
      await expect(erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '', ''))
        .to.emit(erc721_proxy, 'Minted')
        .withArgs(addrs[0].address, 1, 'ext_uri');

      expectEqualStringValues(await erc721_proxy.balanceOf(addrs[0].address), 1);
      const tokenId = await erc721_proxy.getLastTokenID();
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[0].address);
    });

    it('should mint tokens, nft owner = addrs[1].address', async function () {
      await erc721_proxy.mintGhost(addrs[1].address, [], 'ext_uri', '', '');
      expectEqualStringValues(await erc721_proxy.balanceOf(addrs[1].address), 1);
      const tokenId = await erc721_proxy.getLastTokenID();
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[1].address);
    });

    it('should set royalties', async function () {
      const royaltyValue = 100;
      await erc721_proxy.mintGhost(
        addrs[0].address,
        [{recipient: addrs[2].address, value: royaltyValue}],
        'ext_uri',
        '',
        ''
      );
      const tokenId = await erc721_proxy.getLastTokenID();
      const royalties = await erc721_proxy.getRoyalties(tokenId);
      expect(royalties.length).to.equal(1);
      expectEqualStringValues(royalties[0].recipient, addrs[2].address);
      expectEqualStringValues(royalties[0].value, royaltyValue);
    });

    it('should mint tokens with royalty fees', async function () {
      const royaltyValue = ethers.BigNumber.from(100);
      const minterAccountNFTbalance = parseInt((await erc721_proxy.balanceOf(addrs[0].address)).toString());
      const result = erc721_proxy.mintGhost(
        addrs[0].address,
        [{recipient: addrs[2].address, value: royaltyValue}],
        'ext_uri',
        '',
        ''
      );
      const tokenId = (await erc721_proxy.getLastTokenID()).toString();

      await expect(result).to.emit(erc721_proxy, 'Transfer').withArgs(ZERO_ADDRESS, addrs[0].address, tokenId);
      expect(parseInt((await erc721_proxy.balanceOf(addrs[0].address)).toString())).to.equal(
        minterAccountNFTbalance + 1
      );
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[0].address);
      const royaltyValues = await erc721_proxy.getRoyaltiesBps(tokenId);
      const royaltyRecepient = await erc721_proxy.getRoyaltiesRecipients(tokenId);
      expect(royaltyValues.length).to.equal(1);
      expect(royaltyRecepient[0]).to.equal(addrs[2].address);
      expect(royaltyValues[0]).to.equal(royaltyValue);
    });

    it('should revert if royalty is more then 50%', async function () {
      const royaltyValue = 5001;
      await expect(
        erc721_proxy.mintGhost(
          addrs[0].address,
          [{recipient: addrs[2].address, value: royaltyValue}],
          'ext_uri',
          '',
          ''
        )
      ).revertedWith('Royalties value should not be more than 50%');
    });

    it('should mint tokens WITHOUT royalty fees', async function () {
      const minterAccountNFTbalance = parseInt((await erc721_proxy.balanceOf(addrs[0].address)).toString());
      const result = erc721_proxy.mintGhost(addrs[0].address, [], 'ext_uri', '', '');
      const tokenId = (await erc721_proxy.getLastTokenID()).toString();

      await expect(result).to.emit(erc721_proxy, 'Transfer').withArgs(ZERO_ADDRESS, addrs[0].address, tokenId);
      expect(parseInt((await erc721_proxy.balanceOf(addrs[0].address)).toString())).to.equal(
        minterAccountNFTbalance + 1
      );
      expect(await erc721_proxy.ownerOf(tokenId)).to.equal(addrs[0].address);
      const values = await erc721_proxy.getRoyaltiesBps(tokenId);
      expect(values).to.be.empty;
    });

    it('should mint with json string', async function () {
      await erc721_proxy.mintGhost(addrs[1].address, [], 'ext_uri', METADATA_JSON, '');
      const tokenId = await erc721_proxy.getLastTokenID();
      expect(await erc721_proxy.getMetadataJson(tokenId)).to.equal(METADATA_JSON);
    });

    it('everybody can mint', async function () {
      erc721_proxy.mintGhost(addrs[1].address, [], 'ext_uri', '', '', {from: addrs[3].address});
    });
  });

  describe('locked content', function () {
    const hiddencontent = 'top secret';
    it('should set and get locked content for nft', async function () {
      erc721_proxy.mintGhost(addrs[1].address, [], 'ext_uri', '', hiddencontent);
      const tokenId = await erc721_proxy.getLastTokenID();
      const result = testingAsSigner1.getLockedContent(tokenId, {from: addrs[1].address});
      await expect(result)
        .to.emit(erc721_proxy, 'LockedContentViewed')
        .withArgs(addrs[1].address, tokenId, hiddencontent);
    });

    it('should revert if other then token owner tries to fetch locked content', async function () {
      erc721_proxy.mintGhost(addrs[1].address, [], 'ext_uri', '', hiddencontent);
      const tokenId = await erc721_proxy.getLastTokenID();
      await expect(erc721_proxy.getLockedContent(tokenId)).revertedWith('Caller must be the owner of the NFT');
    });

    it('should revert if lock content is too long', async function () {
      const hiddenLongcontent =
        'top secret top secret top secret top secret top secret top secret top secret top secret top secret top top secret top secret top secret top secret top secret top secret top secret top secret top secret top'; // 205 bytes
      await expect(erc721_proxy.mintGhost(addrs[1].address, [], 'ext_uri', '', hiddenLongcontent)).revertedWith(
        'Lock content bytes length should be < 200'
      );
    });

    it('should increment locked content view count', async function () {
      erc721_proxy.mintGhost(owner.address, [], 'ext_uri', '', hiddencontent);
      const tokenId = await erc721_proxy.getLastTokenID();
      const currentCounter = await erc721_proxy.getCurrentLockedContentViewTracker(tokenId);
      // call two times the getLockedContent function, counter should increment by 2
      await erc721_proxy.getLockedContent(tokenId);
      await erc721_proxy.getLockedContent(tokenId);
      expect(await erc721_proxy.getCurrentLockedContentViewTracker(tokenId)).to.equal(currentCounter.add(2));
      // mint another NFT
      erc721_proxy.mintGhost(owner.address, [], 'ext_uri', '', 'top secret2');
      const tokenId2 = await erc721_proxy.getLastTokenID();
      const currentCounter2 = await erc721_proxy.getCurrentLockedContentViewTracker(tokenId2);
      await erc721_proxy.getLockedContent(tokenId2);
      expect(await erc721_proxy.getCurrentLockedContentViewTracker(tokenId2)).to.equal(currentCounter2.add(1));
    });
  });

  function expectEqualStringValues(value1: BigNumber | number | string, value2: BigNumber | number | string) {
    expect(value1.toString()).to.equal(value2.toString());
  }
});
