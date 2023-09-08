// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./GhostMarketERC1155Storage.sol";
import "./Mint1155Validator.sol";

/// @notice GhostMarket ERC1155 contract with minting, burning, pause, royalties & lock content functions.
contract GhostMarketERC1155 is GhostMarketERC1155Storage, Mint1155Validator {
    // events
    /// @notice This event is emitted when a token locked content is viewed
    /// @param msgSender user that triggered it
    /// @param tokenId token id queried
    /// @param lockedContent locked content queried
    event LockedContentViewed(address indexed msgSender, uint256 indexed tokenId, string lockedContent);

    /// @notice This event is emitted when a token is minted
    /// @param toAddress recipient of the mint
    /// @param tokenId token id of the mint
    /// @param tokenURI token uri of the token minted
    /// @param amount amount of token minted
    event Minted(address indexed toAddress, uint256 indexed tokenId, string tokenURI, uint256 amount);

    /// @notice This event is emitted when a lazy minted token is burned
    /// @param operator operator used to burn
    /// @param account address used to burn
    /// @param id token id of token burned
    /// @param amount amount of token burned
    event BurnLazy(address indexed operator, address indexed account, uint256 id, uint256 amount);

    /// @notice This event is emitted when multiple lazy minted tokens are burned
    /// @param operator operator used to burn
    /// @param account address used to burn
    /// @param ids token ids of tokens burned
    /// @param amounts amounts of tokens burned
    event BurnLazyBatch(address indexed operator, address indexed account, uint256[] ids, uint256[] amounts);

    using CountersUpgradeable for CountersUpgradeable.Counter;

    /// @notice Initialize the contract
    /// @param _name contract name
    /// @param _symbol contract symbol
    /// @param uri contract uri
    function initialize(string memory _name, string memory _symbol, string memory uri) public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __AccessControlEnumerable_init_unchained();
        __ERC1155_init_unchained(uri);
        __ERC1155Burnable_init_unchained();
        __Pausable_init_unchained();
        __ERC1155Pausable_init_unchained();
        __ERC1155PresetMinterPauser_init_unchained();
        __Ownable_init_unchained();
        _registerInterface(_GHOSTMARKET_NFT_ROYALTIES);
        name = _name;
        symbol = _symbol;
        _tokenIdTracker.increment();
        __Mint1155Validator_init_unchained();
    }

    /// @notice Return interface support for an interface id
    /// @dev See {IERC165-supportsInterface}.
    /// @param interfaceId interface id to query
    /// @return status interface id support status
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Return if msg.sender is owner of token id
    /// @return owner status of token id
    function _ownerOf(uint256 tokenId) internal view returns (bool) {
        return balanceOf(msg.sender, tokenId) != 0;
    }

    /// @notice Set a token royalties
    /// @dev fee basis points 10000 = 100%
    /// @param tokenId token to set
    /// @param royalties royalties to set
    function _saveRoyalties(uint256 tokenId, LibPart.Part[] memory royalties) internal {
        uint256 totalValue;
        uint length = royalties.length;
        for (uint256 i; i < length; ++i) {
            require(royalties[i].recipient != address(0x0), "Recipient should be present");
            require(royalties[i].value > 0, "Royalties value should be positive");
            totalValue += royalties[i].value;
            _royalties[tokenId].push(royalties[i]);
        }
        require(totalValue <= 5000, "Royalty total value should be < 50%");
    }

    /// @notice Set a token locked content
    /// @param tokenId token to set
    function _setLockedContent(uint256 tokenId, string memory content) internal {
        require(bytes(content).length < 200, "Lock content bytes length should be < 200");
        _lockedContent[tokenId] = content;
    }

    /// @notice Increment a token locked content view count
    /// @param tokenId token to set
    function _incrementCurrentLockedContentViewTracker(uint256 tokenId) internal {
        _lockedContentViewTracker[tokenId] = _lockedContentViewTracker[tokenId] + 1;
    }

    /// @notice Transfer (if exists) or mint (if non existing) token(s)
    /// @param data lazyMintData for token
    /// @param from source for token
    /// @param to recipient for token
    /// @param amount amount of token
    function transferFromOrMint(
        LibERC1155LazyMint.Mint1155Data memory data,
        address from,
        address to,
        uint256 amount
    ) external {
        uint balance = balanceOf(from, data.tokenId);
        uint left = amount;
        if (balance != 0) {
            uint transfer = amount;
            if (balance < amount) {
                transfer = balance;
            }
            safeTransferFrom(from, to, data.tokenId, transfer, "");
            left = amount - transfer;
        }
        if (left > 0) {
            require(from == data.minter, "wrong order maker");
            mintAndTransfer(data, to, left);
        }
    }

    /// @notice Lazy mint token
    /// @param lazyMintData lazyMintData for token(s)
    /// @param to recipient for token(s)
    /// @param _amount amount of token(s)
    function mintAndTransfer(
        LibERC1155LazyMint.Mint1155Data memory lazyMintData,
        address to,
        uint256 _amount
    ) public virtual {
        require(
            keccak256(abi.encodePacked(lazyMintData.tokenURI)) != keccak256(abi.encodePacked("")),
            "tokenURI can't be empty"
        );
        address minter = address(uint160(lazyMintData.tokenId >> 96));
        address sender = _msgSender();
        require(minter == sender || isApprovedForAll(minter, sender), "ERC1155: transfer caller is not approved");
        require(_amount > 0, "amount incorrect");

        if (lazyMintData.minter != _msgSender()) {
            validate(lazyMintData.minter, LibERC1155LazyMint.hash(lazyMintData), lazyMintData.signature);
        }
        if (lazyMintData.royalties.length > 0) {
            _saveRoyalties(lazyMintData.tokenId, lazyMintData.royalties);
        }
        _saveSupply(lazyMintData.tokenId, lazyMintData.amount);

        mint(to, lazyMintData.tokenId, _amount, "");

        if (minter != to && minter != address(0)) {
            emit TransferSingle(sender, address(0), minter, lazyMintData.tokenId, _amount);
            emit TransferSingle(sender, minter, to, lazyMintData.tokenId, _amount);
        } else {
            emit TransferSingle(sender, address(0), to, lazyMintData.tokenId, _amount);
        }
        emit Minted(to, lazyMintData.tokenId, lazyMintData.tokenURI, _amount);
    }

    /// @notice Mint token(s)
    /// @param to recipient for token(s)
    /// @param amount royalties for token(s)
    /// @param data royalties for token(s)
    /// @param royalties royalties for token(s)
    /// @param tokenURI tokenURI for token(s)
    /// @param lockedcontent lockedcontent for token(s)
    function mintGhost(
        address to,
        uint256 amount,
        bytes memory data,
        LibPart.Part[] memory royalties,
        string memory tokenURI,
        string memory lockedcontent
    ) external payable nonReentrant {
        require(to != address(0x0), "to can't be empty");
        require(keccak256(abi.encodePacked(tokenURI)) != keccak256(abi.encodePacked("")), "tokenURI can't be empty");
        mint(to, _tokenIdTracker.current(), amount, data);
        if (royalties.length > 0) {
            _saveRoyalties(_tokenIdTracker.current(), royalties);
        }
        if (keccak256(abi.encodePacked(lockedcontent)) != keccak256(abi.encodePacked(""))) {
            _setLockedContent(_tokenIdTracker.current(), lockedcontent);
        }
        emit TransferSingle(_msgSender(), address(0), to, _tokenIdTracker.current(), amount);
        emit Minted(to, _tokenIdTracker.current(), tokenURI, amount);
        _tokenIdTracker.increment();
    }

    /// @notice Bulk burn tokens
    /// @param account account used to burn
    /// @param ids tokens to burn
    /// @param amounts amounts of tokens to burn
    function burnBatch(address account, uint256[] memory ids, uint256[] memory amounts) public virtual override {
        require(ids.length == amounts.length, "ids != amounts");
        uint256[] memory leftToBurns = new uint256[](ids.length);
        uint256[] memory lazyToBurns = new uint256[](ids.length);
        for (uint i = 0; i < ids.length; ++i) {
            (leftToBurns[i], lazyToBurns[i]) = ERC1155Upgradeable._burnLazy(ids[i], amounts[i]);
        }
        ERC1155BurnableUpgradeable.burnBatch(account, ids, leftToBurns);
        emit BurnLazyBatch(_msgSender(), account, ids, lazyToBurns);
    }

    /// @notice Burn token
    /// @param account account used to burn
    /// @param id token to burn
    /// @param amount amount of tokens to burn
    function burn(address account, uint256 id, uint256 amount) public virtual override {
        (uint256 leftToBurn, uint256 lazyToBurn) = ERC1155Upgradeable._burnLazy(id, amount);
        if (leftToBurn > 0) {
            ERC1155BurnableUpgradeable.burn(account, id, leftToBurn);
        }
        if (lazyToBurn > 0) {
            emit BurnLazy(_msgSender(), account, id, lazyToBurn);
        }
    }

    /// @notice Trigger locked content event for a token
    /// @param tokenId token to query
    function getLockedContent(uint256 tokenId) external {
        require(_ownerOf(tokenId), "Caller must be the owner of the token");
        _incrementCurrentLockedContentViewTracker(tokenId);
        emit LockedContentViewed(msg.sender, tokenId, _lockedContent[tokenId]);
    }

    /// @notice Return locked content view count for a token
    /// @param tokenId token to query
    /// @return locked content view count
    function getCurrentLockedContentViewTracker(uint256 tokenId) external view returns (uint256) {
        return _lockedContentViewTracker[tokenId];
    }

    /// @notice Return royalties for a token
    /// @param tokenId token to query
    /// @return token royalties details
    function getRoyalties(uint256 tokenId) external view returns (LibPart.Part[] memory) {
        return _royalties[tokenId];
    }

    /// @notice Return royalties recipients for a token
    /// @param tokenId token to query
    /// @return token royalties recipients details
    function getRoyaltiesRecipients(uint256 tokenId) external view returns (address payable[] memory) {
        LibPart.Part[] memory royalties = _royalties[tokenId];
        address payable[] memory result = new address payable[](royalties.length);
        uint length = royalties.length;
        for (uint256 i; i < length; ++i) {
            result[i] = royalties[i].recipient;
        }
        return result;
    }

    /// @notice Return royalties bps for a token
    /// @dev fee basis points 10000 = 100%
    /// @param tokenId token to query
    /// @return token royalties bps details
    function getRoyaltiesBps(uint256 tokenId) external view returns (uint256[] memory) {
        LibPart.Part[] memory royalties = _royalties[tokenId];
        uint256[] memory result = new uint256[](royalties.length);
        uint length = royalties.length;
        for (uint256 i; i < length; ++i) {
            result[i] = royalties[i].value;
        }
        return result;
    }

    /// @notice Return current token counter
    /// @return current token conter
    function getCurrentCounter() external view returns (uint256) {
        return _tokenIdTracker.current();
    }
}
