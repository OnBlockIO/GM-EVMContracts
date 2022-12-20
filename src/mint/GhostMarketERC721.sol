// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./ERC721PresetMinterPauserAutoIdUpgradeableCustom.sol";
import "./Mint721Validator.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";

/// @notice GhostMarket ERC721 contract with minting, burning, pause, royalties & lock content functions.
contract GhostMarketERC721 is
    Initializable,
    ERC721PresetMinterPauserAutoIdUpgradeableCustom,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    ERC165StorageUpgradeable,
    Mint721Validator
{
    // dev @deprecated
    struct Royalty {
        address payable recipient;
        uint256 value;
    }

    // tokenId => royalties array
    mapping(uint256 => LibPart.Part[]) internal _royalties;

    // tokenId => locked content array
    mapping(uint256 => string) internal _lockedContent;

    // tokenId => locked content view counter array
    mapping(uint256 => uint256) internal _lockedContentViewTracker;

    // @dev deprecated
    mapping(uint256 => string) internal _metadataJson;

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
    event Minted(address indexed toAddress, uint256 indexed tokenId, string tokenURI);

    // @dev deprecated
    uint256 internal _payedMintFeesBalance;

    // @dev deprecated
    uint256 internal _ghostmarketMintFees;

    // @dev deprecated
    bytes4 public constant _INTERFACE_ID_ERC721_GHOSTMARKET = bytes4(keccak256("_INTERFACE_ID_ERC721_GHOSTMARKET"));

    /**
     * bytes4(keccak256(_GHOSTMARKET_NFT_ROYALTIES)) == 0xe42093a6
     */
    bytes4 public constant _GHOSTMARKET_NFT_ROYALTIES = bytes4(keccak256("_GHOSTMARKET_NFT_ROYALTIES"));

    /// @notice Initialize the contract
    /// @param name contract name
    /// @param symbol contract symbol
    /// @param uri contract uri
    function initialize(string memory name, string memory symbol, string memory uri) public override initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __AccessControlEnumerable_init_unchained();
        __ERC721Enumerable_init_unchained();
        __ERC721Burnable_init_unchained();
        __Pausable_init_unchained();
        __ERC721Pausable_init_unchained();
        __ERC721URIStorage_init_unchained();
        __ERC721_init_unchained(name, symbol);
        __ERC721PresetMinterPauserAutoId_init_unchained(uri);
        __Ownable_init_unchained();
        _registerInterface(_GHOSTMARKET_NFT_ROYALTIES);
        __Mint721Validator_init_unchained();
    }

    /// @notice Return interface support for an interface id
    /// @dev See {IERC165-supportsInterface}.
    /// @param interfaceId interface id to query
    /// @return interface id support status
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721PresetMinterPauserAutoIdUpgradeableCustom, ERC165StorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Set a token royalties
    /// @dev fee basis points 10000 = 100%
    /// @param tokenId token to set
    /// @param royalties royalties to set
    function _saveRoyalties(uint256 tokenId, LibPart.Part[] memory royalties) internal {
        require(_exists(tokenId), "ERC721: approved query for nonexistent token");
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

    /// @notice Transfer (if exists) or mint (if non existing) a token
    /// @param data lazyMintData for token
    /// @param from source for token
    /// @param to recipient for token
    function transferFromOrMint(LibERC721LazyMint.Mint721Data memory data, address from, address to) external {
        if (_exists(data.tokenId)) {
            safeTransferFrom(from, to, data.tokenId);
        } else {
            require(from == data.minter, "wrong order maker");
            mintAndTransfer(data, to);
        }
    }

    /// @notice Lazy mint token
    /// @param lazyMintData lazyMintData for token
    /// @param to recipient for token
    function mintAndTransfer(LibERC721LazyMint.Mint721Data memory lazyMintData, address to) public virtual {
        require(
            keccak256(abi.encodePacked(lazyMintData.tokenURI)) != keccak256(abi.encodePacked("")),
            "tokenURI can't be empty"
        );
        address minter = address(uint160(lazyMintData.tokenId >> 96));
        address sender = _msgSender();
        require(
            minter == sender || isApprovedForAll(minter, sender),
            "ERC721: transfer caller is not owner nor approved"
        );

        _mint(to, lazyMintData.tokenId);
        if (lazyMintData.minter != _msgSender()) {
            validate(lazyMintData.minter, LibERC721LazyMint.hash(lazyMintData), lazyMintData.signature);
        }
        if (lazyMintData.royalties.length > 0) {
            _saveRoyalties(lazyMintData.tokenId, lazyMintData.royalties);
        }
        emit Minted(to, lazyMintData.tokenId, lazyMintData.tokenURI);
    }

    /// @notice Mint token
    /// @param to recipient for token
    /// @param royalties royalties for token
    /// @param tokenURI tokenURI for token
    /// @param lockedcontent lockedcontent for token
    function mintGhost(
        address to,
        LibPart.Part[] memory royalties,
        string memory tokenURI,
        string memory lockedcontent
    ) external payable nonReentrant {
        require(to != address(0x0), "to can't be empty");
        require(keccak256(abi.encodePacked(tokenURI)) != keccak256(abi.encodePacked("")), "tokenURI can't be empty");
        mint(to);
        uint256 tokenId = getLastTokenID();
        if (royalties.length > 0) {
            _saveRoyalties(tokenId, royalties);
        }
        if (keccak256(abi.encodePacked(lockedcontent)) != keccak256(abi.encodePacked(""))) {
            _setLockedContent(tokenId, lockedcontent);
        }
        emit Minted(to, tokenId, tokenURI);
    }

    /// @notice Bulk burn tokens
    /// @param tokensId tokens to burn
    function burnBatch(uint256[] memory tokensId) external {
        uint length = tokensId.length;
        for (uint256 i; i < length; ++i) {
            burn(tokensId[i]);
        }
    }

    /// @notice Trigger locked content event for a token
    /// @param tokenId token to query
    function getLockedContent(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Caller must be the owner of the token");
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

    uint256[50] private __gap;
}
