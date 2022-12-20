// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @notice Operator Role Contract
contract OperatorRole is OwnableUpgradeable {
    mapping(address => bool) public operators;

    /// @notice Initialize the contract
    function __OperatorRole_init() external initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
    }

    /// @notice Add an operator
    /// @param operator address of operator to add
    function addOperator(address operator) external onlyOwner {
        operators[operator] = true;
    }

    /// @notice Remove an operator
    /// @param operator address of operator to remove
    function removeOperator(address operator) external onlyOwner {
        operators[operator] = false;
    }

    /// @notice Modifier for admin functions
    modifier onlyOperator() {
        require(operators[_msgSender()], "OperatorRole: caller is not the operator");
        _;
    }
}
