// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;
pragma abicoder v2;

import "../interfaces/ITransferProxy.sol";
import "../interfaces/IERC721LazyMint.sol";
import "../librairies/LibERC721LazyMint.sol";
import "../OperatorRole.sol";

contract ERC721LazyMintTransferProxyTest is OperatorRole, ITransferProxy {
    function transfer(LibAsset.Asset memory asset, address from, address to) external override onlyOperator {
        require(asset.value == 1, "ERC721 value error");
        (address token, LibERC721LazyMint.Mint721Data memory data) = abi.decode(
            asset.assetType.data,
            (address, LibERC721LazyMint.Mint721Data)
        );
        IERC721LazyMint(token).transferFromOrMint(data, from, to);
    }
}
