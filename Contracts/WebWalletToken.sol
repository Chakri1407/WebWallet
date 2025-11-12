// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WebWallet is ERC20 {
    constructor() ERC20("Web Wallet Token", "WWT") {
        _mint(msg.sender, 1000000 * 10**18); // Mint 1 million tokens
    }
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
} 