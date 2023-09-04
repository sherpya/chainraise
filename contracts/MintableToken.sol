// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * Created on 2023-03-12
 *
 * @title Mintable test token
 * @author Gianluigi Tiesi <sherpya@gmail.com>
 */

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract MintableToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(uint256 amount) external returns (bool) {
        _mint(msg.sender, amount);
        return true;
    }
}
