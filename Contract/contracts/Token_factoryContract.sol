// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Token is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        address _owner
    ) ERC20(_name, _symbol) {
        _mint(_owner, _totalSupply * (10**decimals()));
    }
}

contract ERC20Factory {
    address[] public deployedTokens;

    event TokenDeployed(address tokenAddress, string name, string symbol);

    function createToken(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply
    ) public {
        ERC20Token newToken = new ERC20Token(_name, _symbol, _totalSupply, msg.sender);
        deployedTokens.push(address(newToken));
        emit TokenDeployed(address(newToken), _name, _symbol);
    }

    function getDeployedTokens() public view returns (address[] memory) {
        return deployedTokens;
    }
}
