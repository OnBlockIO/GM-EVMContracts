// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @notice GhostMarket Token Contract
contract GhostMarketToken is Initializable, ERC20Upgradeable, OwnableUpgradeable, PausableUpgradeable {
    /// @notice decimals of the contract
    uint8 private _decimals;

    /// @notice Initialize the contract
    /// @param name contract name
    /// @param symbol contract symbol
    /// @param initialSupply contract supply
    /// @param __decimals contract decimals
    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 __decimals
    ) public virtual initializer {
        __Ownable_init_unchained();
        __Pausable_init_unchained();
        __ERC20_init(name, symbol);
        _mint(_msgSender(), initialSupply);
        _decimals = __decimals;
    }

    /// @notice Pause the contract
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract
    function unpause() public onlyOwner {
        _unpause();
    }

    /// @notice Override for before token transfer
    /// @param from from address
    /// @param to to address
    /// @param amount amount
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /// @notice Return decimals of the contract
    /// @return decimals of the contract
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
