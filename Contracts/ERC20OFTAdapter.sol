// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC20OFTAdapter
 * @dev Adapter to make any existing ERC20 token compatible with LayerZero OFT standard
 * This allows bridging of existing tokens without minting new ones
 */
contract ERC20OFTAdapter is OFTAdapter {
    constructor(
        address _token,         // The existing ERC20 token address
        address _lzEndpoint,    // LayerZero endpoint on this chain
        address _delegate       // Owner/admin address
    ) OFTAdapter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}
}