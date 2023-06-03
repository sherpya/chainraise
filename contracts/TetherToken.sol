// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/**
 * Created on 2023-03-05
 *
 * @title USDT like test token
 * @author Gianluigi Tiesi <sherpya@gmail.com>
 */

import {MintableToken} from "./MintableToken.sol";

contract TetherToken is MintableToken {
    constructor() MintableToken("Tether USD Like", "USDT") {}
}
