// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PactPayDemoUSDC} from "../src/PactPayDemoUSDC.sol";

contract PactPayDemoUSDCTest is Test {
    PactPayDemoUSDC internal token;

    address internal holder = makeAddr("holder");
    address internal spender = makeAddr("spender");
    address internal recipient = makeAddr("recipient");

    uint256 internal constant INITIAL_SUPPLY = 1_000_000 * 1e6;

    function setUp() public {
        token = new PactPayDemoUSDC(holder, INITIAL_SUPPLY);
    }

    function testInitialSupplyUsesSixDecimals() public view {
        assertEq(token.decimals(), 6);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(holder), INITIAL_SUPPLY);
        assertEq(token.faucetAdmin(), holder);
    }

    function testApprovedSpenderCanTransferFromHolder() public {
        uint256 amount = 250 * 1e6;

        vm.prank(holder);
        bool approved = token.approve(spender, amount);
        assertTrue(approved);

        vm.prank(spender);
        bool transferred = token.transferFrom(holder, recipient, amount);
        assertTrue(transferred);

        assertEq(token.balanceOf(recipient), amount);
        assertEq(token.allowance(holder, spender), 0);
    }

    function testOnlyFaucetAdminCanMintDemoTokens() public {
        vm.expectRevert(PactPayDemoUSDC.Unauthorized.selector);
        token.faucet(recipient, 100 * 1e6);

        vm.prank(holder);
        token.faucet(recipient, 100 * 1e6);

        assertEq(token.balanceOf(recipient), 100 * 1e6);
        assertEq(token.totalSupply(), INITIAL_SUPPLY + 100 * 1e6);
    }
}
