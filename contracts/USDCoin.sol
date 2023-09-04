// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * Created on 2023-03-07
 *
 * @title USDC like test token
 * @author Gianluigi Tiesi <sherpya@gmail.com>
 */

import {MintableToken} from "./MintableToken.sol";

contract USDCoin is MintableToken {
    constructor() MintableToken("USD Coin Like", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
