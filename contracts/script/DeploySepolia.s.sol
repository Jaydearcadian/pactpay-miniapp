// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PactPayEscrow} from "../src/PactPayEscrow.sol";
import {PactPayDemoUSDC} from "../src/PactPayDemoUSDC.sol";

contract DeploySepolia is Script {
    uint256 internal constant INITIAL_SUPPLY = 1_000_000 * 1e6;

    function run() external returns (PactPayDemoUSDC token, PactPayEscrow escrow) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        token = new PactPayDemoUSDC(deployer, INITIAL_SUPPLY);
        escrow = new PactPayEscrow();
        vm.stopBroadcast();

        console2.log("Deployer:", deployer);
        console2.log("PactPayDemoUSDC:", address(token));
        console2.log("PactPayEscrow:", address(escrow));
        console2.log("Initial pUSDC supply:", INITIAL_SUPPLY);
    }
}
