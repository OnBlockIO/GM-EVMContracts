// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./ERC1155PresetMinterPauserUpgradeableCustom.sol";
import "./Mint1155Validator.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";

/// @notice GhostMarket ERC1155 contract with minting, burning, pause, royalties & lock content functions.
contract GhostMarketERC1155Storage is
    Initializable,
    ERC1155PresetMinterPauserUpgradeableCustom,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    ERC165StorageUpgradeable
{
    /// @notice contract name
    string public name;

    /// @notice contract symbol
    string public symbol;

    // dev @deprecated
    struct Royalty {
        address payable recipient;
        uint256 value;
    }

    /// @notice tokenId to royalties mapping
    mapping(uint256 => LibPart.Part[]) internal _royalties;

    /// @notice tokenId to locked content mapping
    mapping(uint256 => string) internal _lockedContent;

    /// @notice tokenId to locked content view counter mapping
    mapping(uint256 => uint256) internal _lockedContentViewTracker;

    // @dev deprecated
    mapping(uint256 => string) internal _metadataJson;

    // @dev deprecated
    uint256 internal _payedMintFeesBalance;

    // @dev deprecated
    uint256 internal _ghostmarketMintFees;

    // @dev deprecated
    bytes4 public constant _INTERFACE_ID_ERC1155_GHOSTMARKET = bytes4(keccak256("_INTERFACE_ID_ERC1155_GHOSTMARKET"));

    /**
     * bytes4(keccak256(_GHOSTMARKET_NFT_ROYALTIES)) == 0xe42093a6
     */
    bytes4 public constant _GHOSTMARKET_NFT_ROYALTIES = bytes4(keccak256("_GHOSTMARKET_NFT_ROYALTIES"));

    using CountersUpgradeable for CountersUpgradeable.Counter;

    // _tokenIdTracker to generate automated token IDs
    CountersUpgradeable.Counter internal _tokenIdTracker;

    /// @notice Return interface support for an interface id
    /// @dev See {IERC165-supportsInterface}.
    /// @param interfaceId interface id to query
    /// @return status interface id support status
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

    uint256[50] private __gap;
}
