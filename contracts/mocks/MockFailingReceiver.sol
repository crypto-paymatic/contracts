// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockFailingReceiver {
    // This contract will reject all ETH sent to it
    receive() external payable {
        revert("I reject all ETH");
    }
}
