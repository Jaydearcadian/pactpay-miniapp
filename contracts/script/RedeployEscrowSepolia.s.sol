// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PactPayEscrow} from "../src/PactPayEscrow.sol";

contract RedeployEscrowSepolia is Script {
    function run() external returns (PactPayEscrow escrow) {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        vm.startBroadcast(deployer);
        escrow = new PactPayEscrow();
        vm.stopBroadcast();

        console2.log("Deployer:", deployer);
        console2.log("PactPayEscrow:", address(escrow));
    }
}
