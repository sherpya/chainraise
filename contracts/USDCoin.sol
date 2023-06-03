// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/**
 * Created on 2023-03-07
 *
 * @title USDC like test token
 * @author Gianluigi Tiesi <sherpya@gmail.com>
 */

import {MintableToken} from "./MintableToken.sol";

contract USDCoin is MintableToken {
    constructor() MintableToken("USD Coin Like", "USDC") {}
}
