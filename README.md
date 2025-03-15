# Token Factory (ERC20 & ERC721)

A versatile Ethereum smart contract system that enables users to deploy both ERC20 and ERC721 tokens without writing any code. This factory pattern makes token creation accessible to everyone with just a few simple parameters.

## Overview

The Token Factory consists of multiple Solidity contracts:

1. **ERC20Token**: A standard ERC20 implementation extending OpenZeppelin's ERC20 contract
2. **ERC20Factory**: A factory contract that deploys new ERC20Token instances
3. **ERC721Token**: A standard NFT implementation extending OpenZeppelin's ERC721 contract
4. **ERC721Factory**: A factory contract that deploys new ERC721Token instances

## Features

### ERC20 (Fungible Tokens)
- Create custom ERC20 tokens with name, symbol, and total supply
- All tokens are automatically tracked by the factory
- Token ownership is assigned to the creator's address
- Standard 18 decimal places for all created tokens

### ERC721 (Non-Fungible Tokens)
- Create custom NFT collections with name, symbol, and base URI
- Mint unique NFTs with specific tokenIDs and metadata
- Full support for metadata standards
- Optional royalty mechanisms

### General Features
- Gas-efficient implementation using OpenZeppelin's battle-tested contracts
- Clean, simple interface for token creation
- All deployed tokens tracked in the respective factories

## Requirements

- Node.js and npm
- Hardhat, Truffle, or similar Ethereum development framework
- An Ethereum wallet (MetaMask, etc.)
- Some ETH for gas fees on your target network

## Installation

1. Clone this repository or copy the contract code:

```bash
git clone https://github.com/Anuoluwapo25/LaunchPad_Smart_Contract
cd LaunchPad_Smart_Contract
```

2. Install dependencies:

```bash
npm install @openzeppelin/contracts
```

## Usage

### ERC20 Fungible Tokens

#### Deploying the ERC20 Factory

1. Deploy the `ERC20Factory` contract to your chosen Ethereum network
2. Save the factory contract address for future use

#### Creating a New ERC20 Token

Call the `createToken` function on the deployed ERC20 factory with:

- `_name`: The name of your token (e.g., "My Token")
- `_symbol`: The symbol/ticker of your token (e.g., "MTK")
- `_totalSupply`: The total supply of your token (e.g., 1000000)

Example using ethers.js:

```javascript
const erc20Factory = new ethers.Contract(erc20FactoryAddress, ERC20Factory.abi, signer);
await erc20Factory.createToken("My Token", "MTK", 1000000);
```

### ERC721 Non-Fungible Tokens

#### Deploying the ERC721 Factory

1. Deploy the `ERC721Factory` contract to your chosen Ethereum network
2. Save the factory contract address for future use

#### Creating a New ERC721 Collection

Call the `createCollection` function on the deployed ERC721 factory with:

- `_name`: The name of your NFT collection (e.g., "My NFT Collection")
- `_symbol`: The symbol of your collection (e.g., "MNFT")
- `_baseURI`: The base URI for token metadata (e.g., "https://metadata.example.com/")

Example using ethers.js:

```javascript
const erc721Factory = new ethers.Contract(erc721FactoryAddress, ERC721Factory.abi, signer);
await erc721Factory.createCollection("My NFT Collection", "MNFT", "https://metadata.example.com/");
```

#### Minting NFTs from Your Collection

After creating a collection, you can mint new NFTs by calling the mint function on your deployed ERC721 contract:

```javascript
const myNFTCollection = new ethers.Contract(deployedNFTAddress, ERC721Token.abi, signer);
await myNFTCollection.mint(recipientAddress, tokenId);
```

### Retrieving Deployed Tokens

To get a list of all tokens deployed through your factories:

```javascript
// For ERC20 tokens
const deployedERC20Tokens = await erc20Factory.getDeployedTokens();

// For ERC721 collections
const deployedERC721Collections = await erc721Factory.getDeployedCollections();
```

## Contract Details

### ERC20Token

The `ERC20Token` contract inherits from OpenZeppelin's ERC20 implementation with:
- Custom constructor for setting initial parameters
- Total supply minted to the specified owner address
- Standard 18 decimal places

### ERC721Token

The `ERC721Token` contract inherits from OpenZeppelin's ERC721 implementation with:
- Support for metadata via baseURI
- Minting functionality for the owner
- Optional enumerable extension for on-chain enumeration

## Events

The factory contracts emit the following events:

- `TokenDeployed(address tokenAddress, string name, string symbol)`: For ERC20 tokens
- `CollectionDeployed(address collectionAddress, string name, string symbol, string baseURI)`: For ERC721 collections

## Security Considerations

- The contracts use OpenZeppelin's audited implementations
- Token creation is permissionless - anyone can create tokens through the factories
- All ERC20 tokens created have standard 18 decimals
- Token ownership is assigned to the creator's address
- No backdoors or admin privileges on the created tokens

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
