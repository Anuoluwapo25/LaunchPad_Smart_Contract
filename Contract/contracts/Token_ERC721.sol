// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC721.sol"; 

contract ERC721Factory {
    address[] public deployedNFTs;  

    event NFTDeployed(address indexed contractAddress, string name, string symbol);

    function deployERC721(string memory _name, string memory _symbol) external {
        CustomERC721 newNFT = new CustomERC721(_name, _symbol);
        deployedNFTs.push(address(newNFT));
        emit NFTDeployed(address(newNFT), _name, _symbol);
    }

    function getDeployedNFTs() external view returns (address[] memory) {
        return deployedNFTs;
    }
}
