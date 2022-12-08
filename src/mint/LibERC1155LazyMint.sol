// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./LibPart.sol";

library LibERC1155LazyMint {
    bytes4 public constant ERC1155_LAZY_ASSET_CLASS = bytes4(keccak256("ERC1155_LAZY"));

    struct Mint1155Data {
        uint tokenId;
        string tokenURI;
        uint amount;
        address minter;
        bytes signature;
    }

    bytes32 public constant MINT_AND_TRANSFER_TYPEHASH =
        keccak256("Mint1155(uint256 tokenId,string tokenURI,uint256 amount,address minter)");

    function hash(Mint1155Data memory data) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    MINT_AND_TRANSFER_TYPEHASH,
                    data.tokenId,
                    keccak256(bytes(data.tokenURI)),
                    data.amount,
                    data.minter
                )
            );
    }
}
