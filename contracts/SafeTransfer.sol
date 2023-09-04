// SPDX-License-Identifier: MIT
/**
 *  @title SafeTransfer
 *  @author: [@sherpya]
 *  @notice: Optimized Native Token / ERC20 transfers with error check
 */

pragma solidity ^0.8.21;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library SafeTransfer {
    IERC20 public constant NATIVE_TOKEN = IERC20(address(0));

    error TransferFailed(address recipient, IERC20 token, uint256 amount);

    /** @dev To be emitted if a transfer to a party fails.
     *  @param recipient The target of the failed operation.
     *  @param token The token address.
     *  @param amount The amount.
     */
    event SendFailed(address indexed recipient, IERC20 indexed token, uint256 amount);

    /** @dev Send amount to recipent, emit a log when fails.
     *  @param to To address to send to.
     *  @param amount Transaction amount.
     *  @param revertOnError Whether the operation should revert on error.
     */
    function sendETH(address to, uint256 amount, bool revertOnError) internal {
        bool success;

        /// @solidity memory-safe-assembly
        assembly {
            success := call(gas(), to, amount, 0, 0, 0, 0)
        }

        if (success) {
            return;
        }

        if (revertOnError) {
            revert TransferFailed(to, NATIVE_TOKEN, amount);
        }

        emit SendFailed(to, NATIVE_TOKEN, amount);
    }

    /** @dev Send tokens to recipent, emit a log when fails.
     *  @param to To address to send to.
     *  @param token The token address.
     *  @param amount The amount to be transferred.
     *  @param revertOnError Whether the operation should revert on error.
     */
    function sendToken(address to, IERC20 token, uint256 amount, bool revertOnError) internal {
        bool success;

        /// @solidity memory-safe-assembly
        assembly {
            switch token
            case 0 {
                // Native Token
                success := call(gas(), to, amount, 0, 0, 0, 0)
            }
            default {
                let args := mload(0x40)

                // bytes4(keccak256("transfer(address,uint256)")) // Function signature
                // unfortunately yul cannot refer constants
                mstore(args, 0xa9059cbb00000000000000000000000000000000000000000000000000000000)
                mstore(add(args, 0x04), and(to, 0xffffffffffffffffffffffffffffffffffffffff))
                mstore(add(args, 0x24), amount)

                success := call(gas(), token, 0, args, 0x44, 0, 0)

                if iszero(iszero(success)) {
                    switch returndatasize()
                    case 0x00 {
                        // This is a non-standard ERC-20
                        success := true
                    }
                    case 0x20 {
                        // This is a complaint ERC-20
                        returndatacopy(0, 0, 0x20)
                        success := mload(0) // Set `success = returndata` of external call
                    }
                    default {
                        // This is an excessively non-compliant ERC-20
                        success := false
                    }
                }
            }
        }

        if (success) {
            return;
        }

        if (revertOnError) {
            revert TransferFailed(to, token, amount);
        }

        emit SendFailed(to, token, amount);
    }

    /** @dev Send tokens from recipent, emit a log when fails.
     *  @param token The token address.
     *  @param from From address (previously approved).
     *  @param to To address to send to.
     *  @param amount The amount to be transferred.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal returns (bool success) {
        /// @solidity memory-safe-assembly
        assembly {
            let args := mload(0x40)

            // bytes4(keccak256("transferFrom(address,address,uint256)")) // Function signature
            // unfortunately yul cannot refer constants
            mstore(args, 0x23b872dd00000000000000000000000000000000000000000000000000000000)
            mstore(add(args, 0x04), and(from, 0xffffffffffffffffffffffffffffffffffffffff))
            mstore(add(args, 0x24), and(to, 0xffffffffffffffffffffffffffffffffffffffff))
            mstore(add(args, 0x44), amount)

            success := call(gas(), token, 0, args, 0x64, 0, 0)

            // Bubble reason
            if iszero(success) {
                returndatacopy(args, 0, returndatasize())
                revert(args, returndatasize())
            }

            switch returndatasize()
            case 0x00 {
                // This is a non-standard ERC-20
                success := true
            }
            case 0x20 {
                // This is a complaint ERC-20
                returndatacopy(0, 0, 0x20)
                success := mload(0) // Set `success = returndata` of external call
            }
            default {
                // This is an excessively non-compliant ERC-20
                success := false
            }
        }
    }
}
