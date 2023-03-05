// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * Created on 2023-03-05
 *
 * @title USDT like test token
 * @author Gianluigi Tiesi <sherpya@gmail.com>
 */

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TetherToken is ERC20 {
    constructor() ERC20("Tether USD Like", "USDT") {}

    function claim(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
