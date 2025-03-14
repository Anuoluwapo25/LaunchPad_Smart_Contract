import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy ERC20 Factory
  const ERC20Factory = await ethers.getContractFactory("ERC20Factory");
  const erc20Factory = await ERC20Factory.deploy();
  await erc20Factory.waitForDeployment(); // ✅ Fix applied
  console.log("ERC20 Factory deployed at:", await erc20Factory.getAddress());

  // Deploy ERC721 Factory
  const ERC721Factory = await ethers.getContractFactory("ERC721Factory");
  const erc721Factory = await ERC721Factory.deploy();
  await erc721Factory.waitForDeployment(); // ✅ Fix applied
  console.log("ERC721 Factory deployed at:", await erc721Factory.getAddress());

  // Deploy Custom ERC721 Contract
  const ERC721Custom = await ethers.getContractFactory("CustomERC721");
  const erc721Custom = await ERC721Custom.deploy("MyNFT", "NFT");
  await erc721Custom.waitForDeployment(); // ✅ Fix applied
  console.log("Custom ERC721 deployed at:", await erc721Custom.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
