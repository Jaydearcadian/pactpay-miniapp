// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PactPayDemoUSDC {
    string public constant name = "PactPay Demo USDC";
    string public constant symbol = "pUSDC";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    address public immutable faucetAdmin;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    error InvalidAddress();
    error InsufficientBalance();
    error InsufficientAllowance();
    error Unauthorized();

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    constructor(address initialHolder, uint256 initialSupply) {
        if (initialHolder == address(0)) revert InvalidAddress();
        faucetAdmin = initialHolder;
        _mint(initialHolder, initialSupply);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance < amount) revert InsufficientAllowance();

        if (currentAllowance != type(uint256).max) {
            allowance[from][msg.sender] = currentAllowance - amount;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }

        _transfer(from, to, amount);
        return true;
    }

    function faucet(address recipient, uint256 amount) external {
        if (msg.sender != faucetAdmin) revert Unauthorized();
        if (recipient == address(0)) revert InvalidAddress();
        _mint(recipient, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert InvalidAddress();
        if (balanceOf[from] < amount) revert InsufficientBalance();

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address recipient, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[recipient] += amount;
        emit Transfer(address(0), recipient, amount);
    }
}
