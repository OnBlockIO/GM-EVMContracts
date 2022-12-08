// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./LibPart.sol";

library LibERC721LazyMint {
    bytes4 public constant ERC721_LAZY_ASSET_CLASS = bytes4(keccak256("ERC721_LAZY"));

    struct Mint721Data {
        uint tokenId;
        string tokenURI;
        address minter;
        bytes signature;
    }

    bytes32 public constant MINT_AND_TRANSFER_TYPEHASH =
        keccak256("Mint721(uint256 tokenId,string tokenURI,address minter)");

    function hash(Mint721Data memory data) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(MINT_AND_TRANSFER_TYPEHASH, data.tokenId, keccak256(bytes(data.tokenURI)), data.minter)
            );
    }
}
