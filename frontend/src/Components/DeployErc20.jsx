import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ethers } from "ethers";
import FactoryABI from "../abis/FactoryABI.json";
import "./DeployErc20.css";
import toast from "react-hot-toast";

const FACTORY_ADDRESS = "0x981A4465A74D467dDd3F28308B255de98F157d72";

function Home() {
  const { address, isConnected } = useAccount();
  const [tokenName, setTokenName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("");
  const [error, setError] = useState("");
  const [deployedTokenAddress, setDeployedTokenAddress] = useState("");
  const [totalSupply, setTotalSupply] = useState(BigInt(0));
  
  const hasGetAllTokens = FactoryABI.abi.some(item => 
    item.type === "function" && item.name === "getAllTokens"
  );

  const { data: userTokens, refetch: fetchUserTokens } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FactoryABI.abi,
    functionName: "getAllTokens",
    enabled: hasGetAllTokens
  });

  const handleSupplyChange = (value) => {
    if (/^\d*$/.test(value)) {
      setSupply(value);
      try {
        setTotalSupply(value.trim() ? BigInt(value) : BigInt(0));
      } catch (e) {
        console.error("Error converting to BigInt:", e);
        setTotalSupply(BigInt(0));
      }
    }
  };

  const isValidInput = Boolean(tokenName && symbol && totalSupply > BigInt(0));

  const { writeContract, data: txData, error: writeError, isPending: isWriteLoading } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({
    hash: txData,
    onSuccess: async (receipt) => {
      try {
        console.log("Transaction receipt:", receipt);
        
        if (hasGetAllTokens) {
          await fetchUserTokens();
          if (userTokens && Array.isArray(userTokens)) {
            const tokens = userTokens;
            const userToken = tokens.find(token => 
              token.creator && token.creator.toLowerCase() === address.toLowerCase()
            );
            
            if (userToken && userToken.tokenAddress) {
              setDeployedTokenAddress(userToken.tokenAddress);
              console.log("Found token address from getAllTokens:", userToken.tokenAddress);
              return;
            }
          }
        }
        
        if (receipt.contractAddress) {
          console.log("Found contract address from creation:", receipt.contractAddress);
          setDeployedTokenAddress(receipt.contractAddress);
          return;
        }
        
        const tokenDeployedSignature = ethers.id("TokenDeployed(address,string,string)");
        const tokenCreatedSignature = ethers.id("TokenCreated(address,address,string,string)");
        
        const tokenEvent = receipt?.logs?.find(
          (log) =>
            log.address?.toLowerCase() === FACTORY_ADDRESS.toLowerCase() &&
            log.topics &&
            (log.topics[0] === tokenDeployedSignature || log.topics[0] === tokenCreatedSignature)
        );
        
        if (tokenEvent) {
          console.log("Found token event:", tokenEvent);
          if (tokenEvent.topics && tokenEvent.topics.length > 1) {
            const tokenAddress = `0x${tokenEvent.topics[1].slice(-40)}`;
            setDeployedTokenAddress(tokenAddress);
          } else if (tokenEvent.data) {
            const tokenAddress = `0x${tokenEvent.data.slice(26, 66)}`;
            setDeployedTokenAddress(tokenAddress);
          }
        } else {
          console.warn("Could not find token address from transaction logs");
          toast.error("Transaction succeeded but couldn't get token address. Check your wallet for the new token.");
        }
      } catch (e) {
        console.error("Error processing receipt:", e);
        setError(`Error processing receipt: ${e.message}`);
      }
    },
  });

  const isLoading = isWriteLoading || isConfirming;
  const displayError =
    error ||
    (writeError && `Write error: ${writeError.message}`) ||
    (confirmError && `Confirmation error: ${confirmError.message}`);

  // Deploy token function
  const deployToken = async () => {
    if (!isConnected) {
      setError("Connect your wallet first");
      return;
    }
    if (!isValidInput) {
      setError("Please fill in all fields with valid values");
      return;
    }
    setError("");
    setDeployedTokenAddress("");
    try {
      // Check if the factory supports decimals (like your friend's code)
      const hasDecimals = FactoryABI.abi.some(item => 
        item.type === "function" && 
        item.name === "createToken" && 
        item.inputs.some(input => input.name === "decimals")
      );
      
      if (hasDecimals) {
        // Use the version with decimals (like your friend's contract)
        writeContract({
          address: FACTORY_ADDRESS,
          abi: FactoryABI.abi,
          functionName: "createToken",
          args: [tokenName, symbol, 18, totalSupply, address],
        });
      } else {
        // Use the simpler version (like your contract)
        writeContract({
          address: FACTORY_ADDRESS,
          abi: FactoryABI.abi,
          functionName: "createToken",
          args: [tokenName, symbol, totalSupply],
        });
      }
    } catch (e) {
      console.error("Error submitting transaction:", e);
      setError(`Transaction error: ${e.message}`);
    }
  };

  // Add to wallet function
  const addTokenToWallet = async () => {
    if (!deployedTokenAddress) return;
    
    try {
      // @ts-ignore
      const provider = window.ethereum;
      if (provider) {
        await provider.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: deployedTokenAddress,
              symbol: symbol,
              decimals: 18,
              image: '', // Add a token image URL if available
            },
          },
        });
      }
    } catch (error) {
      console.error('Error adding token to wallet:', error);
      toast.error('Failed to add token to wallet');
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Deploy Your ERC20 Token</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Token Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="Token Name"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="Symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Total Supply</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="Total Supply (without decimals)"
            value={supply}
            onChange={(e) => handleSupplyChange(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 mt-1">Enter the number of tokens. Decimals are handled by the contract.</p>
        </div>
        {displayError && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{displayError}</div>}
        {isConfirmed && deployedTokenAddress && (
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            <p className="font-medium">Token deployed successfully!</p>
            <p className="text-sm font-mono break-all">Address: {deployedTokenAddress}</p>
            <div className="flex space-x-2 mt-2">
              <a
                href={`https://sepolia.etherscan.io/token/${deployedTokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                View on Etherscan →
              </a>
              <button
                onClick={addTokenToWallet}
                className="text-blue-600 hover:underline text-sm"
              >
                Add to Wallet
              </button>
            </div>
          </div>
        )}
        <button
          className={`w-full p-2 rounded font-medium ${
            isLoading ? "bg-gray-400" : isValidInput ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-300"
          }`}
          onClick={deployToken}
          disabled={isLoading || !isValidInput}
        >
          {isWriteLoading ? "Submitting Transaction..." : isConfirming ? "Waiting for Confirmation..." : "Deploy Token"}
        </button>
      </div>
    </div>
  );
}

export default Home;