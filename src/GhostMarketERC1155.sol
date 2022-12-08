// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ERC1155PresetMinterPauserUpgradeableCustom.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";

/**
 * @dev ERC1155 token with minting, burning, pause, royalties & lock content functions.
 */

contract GhostMarketERC1155 is
    Initializable,
    ERC1155PresetMinterPauserUpgradeableCustom,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    ERC165StorageUpgradeable
{
    string public name;
    string public symbol;

    // struct for royalties fees
    struct Royalty {
        address payable recipient;
        uint256 value;
    }

    // tokenId => royalties array
    mapping(uint256 => Royalty[]) internal _royalties;

    // tokenId => locked content array
    mapping(uint256 => string) internal _lockedContent;

    // tokenId => locked content view counter array
    mapping(uint256 => uint256) internal _lockedContentViewTracker;

    // tokenId => attributes array
    mapping(uint256 => string) internal _metadataJson;

    // events
    event LockedContentViewed(address indexed msgSender, uint256 indexed tokenId, string lockedContent);
    event Minted(address toAddress, uint256 tokenId, string externalURI, uint256 amount);

    // @dev deprecated
    uint256 internal _payedMintFeesBalance;

    // @dev deprecated
    uint256 internal _ghostmarketMintFees;

    /**
     * bytes4(keccak256(_INTERFACE_ID_ERC1155_GHOSTMARKET)) == 0x94407210
     */
    bytes4 public constant _INTERFACE_ID_ERC1155_GHOSTMARKET = bytes4(keccak256("_INTERFACE_ID_ERC1155_GHOSTMARKET"));

    /**
     * bytes4(keccak256(_GHOSTMARKET_NFT_ROYALTIES)) == 0xe42093a6
     */
    bytes4 public constant _GHOSTMARKET_NFT_ROYALTIES = bytes4(keccak256("_GHOSTMARKET_NFT_ROYALTIES"));

    function initialize(string memory _name, string memory _symbol, string memory uri) public virtual initializer {
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
        _registerInterface(_INTERFACE_ID_ERC1155_GHOSTMARKET);
        _registerInterface(_GHOSTMARKET_NFT_ROYALTIES);
        name = _name;
        symbol = _symbol;
        _tokenIdTracker.increment();
    }

    using CountersUpgradeable for CountersUpgradeable.Counter;

    // _tokenIdTracker to generate automated token IDs
    CountersUpgradeable.Counter private _tokenIdTracker;

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC1155PresetMinterPauserUpgradeableCustom, ERC165StorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev check if msg.sender is owner of NFT id
     */
    function _ownerOf(uint256 tokenId) internal view returns (bool) {
        return balanceOf(msg.sender, tokenId) != 0;
    }

    /**
     * @dev set a NFT royalties fees & recipients
     * fee basis points 10000 = 100%
     */
    function _saveRoyalties(uint256 tokenId, Royalty[] memory royalties) internal {
        uint length = royalties.length;
        for (uint256 i; i < length; ++i) {
            require(royalties[i].recipient != address(0x0), "Recipient should be present");
            require(royalties[i].value > 0, "Royalties value should be positive");
            require(royalties[i].value <= 5000, "Royalties value should not be more than 50%");
            _royalties[tokenId].push(royalties[i]);
        }
    }

    /**
     * @dev set a NFT custom attributes to contract storage
     */
    function _setMetadataJson(uint256 tokenId, string memory metadataJson) internal {
        _metadataJson[tokenId] = metadataJson;
    }

    /**
     * @dev set a NFT locked content as string
     */
    function _setLockedContent(uint256 tokenId, string memory content) internal {
        require(bytes(content).length < 200, "Lock content bytes length should be < 200");
        _lockedContent[tokenId] = content;
    }

    /**
     * @dev increment a NFT locked content view tracker
     */
    function _incrementCurrentLockedContentViewTracker(uint256 tokenId) internal {
        _lockedContentViewTracker[tokenId] = _lockedContentViewTracker[tokenId] + 1;
    }

    /**
     * @dev mint NFT, set royalties, set metadata json, set lockedcontent
     * emits Minted event
     */
    function mintGhost(
        address to,
        uint256 amount,
        bytes memory data,
        Royalty[] memory royalties,
        string memory externalURI,
        string memory metadata,
        string memory lockedcontent
    ) external payable nonReentrant {
        require(to != address(0x0), "to can't be empty");
        require(
            keccak256(abi.encodePacked(externalURI)) != keccak256(abi.encodePacked("")),
            "externalURI can't be empty"
        );
        mint(to, _tokenIdTracker.current(), amount, data);
        if (royalties.length > 0) {
            _saveRoyalties(_tokenIdTracker.current(), royalties);
        }
        if (keccak256(abi.encodePacked(metadata)) != keccak256(abi.encodePacked(""))) {
            _setMetadataJson(_tokenIdTracker.current(), metadata);
        }
        if (keccak256(abi.encodePacked(lockedcontent)) != keccak256(abi.encodePacked(""))) {
            _setLockedContent(_tokenIdTracker.current(), lockedcontent);
        }
        emit Minted(to, _tokenIdTracker.current(), externalURI, amount);
        _tokenIdTracker.increment();
    }

    /**
     * @dev get locked content for a NFT
     * emits LockedContentViewed event
     */
    function getLockedContent(uint256 tokenId) external {
        require(_ownerOf(tokenId), "Caller must be the owner of the NFT");
        _incrementCurrentLockedContentViewTracker(tokenId);
        emit LockedContentViewed(msg.sender, tokenId, _lockedContent[tokenId]);
    }

    /**
     * @dev get a NFT current locked content view tracker
     */
    function getCurrentLockedContentViewTracker(uint256 tokenId) external view returns (uint256) {
        return _lockedContentViewTracker[tokenId];
    }

    /**
     * @dev get a NFT custom attributes
     */
    function getMetadataJson(uint256 tokenId) external view returns (string memory) {
        return _metadataJson[tokenId];
    }

    /**
     * @dev get royalties array
     */
    function getRoyalties(uint256 tokenId) external view returns (Royalty[] memory) {
        return _royalties[tokenId];
    }

    /**
     * @dev get a NFT royalties recipients
     */
    function getRoyaltiesRecipients(uint256 tokenId) external view returns (address payable[] memory) {
        Royalty[] memory royalties = _royalties[tokenId];
        address payable[] memory result = new address payable[](royalties.length);
        uint length = royalties.length;
        for (uint256 i; i < length; ++i) {
            result[i] = royalties[i].recipient;
        }
        return result;
    }

    /**
     * @dev get a NFT royalties fees
     * fee basis points 10000 = 100%
     */
    function getRoyaltiesBps(uint256 tokenId) external view returns (uint256[] memory) {
        Royalty[] memory royalties = _royalties[tokenId];
        uint256[] memory result = new uint256[](royalties.length);
        uint length = royalties.length;
        for (uint256 i; i < length; ++i) {
            result[i] = royalties[i].value;
        }
        return result;
    }

    /**
     * @dev current _tokenIdTracker
     */
    function getCurrentCounter() external view returns (uint256) {
        return _tokenIdTracker.current();
    }

    uint256[50] private __gap;
}
