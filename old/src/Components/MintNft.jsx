import { useState } from "react";
import { ethers } from "ethers";
import NFTABI from "./NFTABI.json"; // Import your ERC721 contract ABI

const MintNFT = ({ nftAddress }) => {
  const [recipient, setRecipient] = useState("");

  const mintNFT = async () => {
    if (!window.ethereum) {
      alert("Please install Metamask");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const nftContract = new ethers.Contract(nftAddress, NFTABI, signer);

    try {
      const tx = await nftContract.mint(recipient);
      await tx.wait();
      alert("NFT Minted!");
    } catch (error) {
      console.error(error);
      alert("Error minting NFT");
    }
  };

  return (
    <div>
      <h3>Mint NFT for {nftAddress}</h3>
      <input type="text" placeholder="Recipient Address" onChange={(e) => setRecipient(e.target.value)} />
      <button onClick={mintNFT}>Mint NFT</button>
    </div>
  );
};

export default MintNFT;
