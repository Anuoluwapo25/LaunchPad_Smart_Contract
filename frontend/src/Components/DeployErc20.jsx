import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ethers } from "ethers";
import FactoryABI from "../abis/FactoryABI.json";
import "./DeployErc20.css";

const FACTORY_ADDRESS = "0x981A4465A74D467dDd3F28308B255de98F157d72";

function Home() {
  const { address, isConnected } = useAccount();
  const [tokenName, setTokenName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("");
  const [error, setError] = useState("");
  const [deployedTokenAddress, setDeployedTokenAddress] = useState("");
  const [totalSupply, setTotalSupply] = useState(BigInt(0));
  const [tokenDeployedEventSignature, setTokenDeployedEventSignature] = useState("");

  // Calculate event signature on component mount
  useEffect(() => {
    // Get the event signature using ethers.js
    // This calculates the keccak256 hash of "TokenDeployed(address,string,string)"
    const signature = ethers.id("TokenDeployed(address,string,string)");
    setTokenDeployedEventSignature(signature);
    console.log("Calculated TokenDeployed event signature:", signature);
  }, []);

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
    onSuccess: (receipt) => {
      try {
        console.log("Transaction receipt:", receipt);
        console.log("All logs:", receipt.logs);
        console.log("Factory address:", FACTORY_ADDRESS.toLowerCase());
        console.log("Using event signature:", tokenDeployedEventSignature);
        
        // Method 1: Try to find the event using the calculated signature
        const tokenDeployedEvent = receipt?.logs?.find(
          (log) =>
            log.address?.toLowerCase() === FACTORY_ADDRESS.toLowerCase() &&
            log.topics &&
            log.topics[0] === tokenDeployedEventSignature
        );
        
        console.log("Found token deployed event with signature?", !!tokenDeployedEvent);
        
        if (tokenDeployedEvent) {
          console.log("Token deployed event data:", tokenDeployedEvent);
          // If the address is in the topics (indexed parameter)
          if (tokenDeployedEvent.topics && tokenDeployedEvent.topics.length > 1) {
            const tokenAddress = `0x${tokenDeployedEvent.topics[1].slice(-40)}`;
            setDeployedTokenAddress(tokenAddress);
          } 
          // If the address is in the data (non-indexed parameter)
          else if (tokenDeployedEvent.data && tokenDeployedEvent.data.length >= 42) {
            const tokenAddress = `0x${tokenDeployedEvent.data.slice(-40)}`;
            setDeployedTokenAddress(tokenAddress);
          }
        } else {
          console.log("Trying fallback method...");
          // Method 2: Find any event from the factory contract as fallback
          const factoryEvents = receipt.logs.filter(
            log => log.address?.toLowerCase() === FACTORY_ADDRESS.toLowerCase()
          );
          
          console.log("Factory events:", factoryEvents);
          
          if (factoryEvents.length > 0) {
            const lastEvent = factoryEvents[factoryEvents.length - 1];
            console.log("Using last factory event:", lastEvent);
            
            // Extract from data if it contains an address
            if (lastEvent.data && lastEvent.data.length >= 42) {
              // Parse data - we need to extract the token address from the encoded data
              // This is tricky without knowing the exact encoding, but we'll attempt
              // For a non-indexed address parameter, the last 20 bytes should be the address
              const tokenAddress = `0x${lastEvent.data.slice(-40)}`;
              console.log("Extracted token address from data:", tokenAddress);
              setDeployedTokenAddress(tokenAddress);
            } 
            // Try to extract from topics if available
            else if (lastEvent.topics && lastEvent.topics.length > 1) {
              const tokenAddress = `0x${lastEvent.topics[1].slice(-40)}`;
              console.log("Extracted token address from topics:", tokenAddress);
              setDeployedTokenAddress(tokenAddress);
            }
            // Last resort - look for contract creation in logs
            else {
              console.log("Looking for contract creation in transaction...");
              // If this is a contract creation transaction, try to extract the created contract address
              if (receipt.contractAddress) {
                console.log("Found contract address from creation:", receipt.contractAddress);
                setDeployedTokenAddress(receipt.contractAddress);
              } else {
                console.warn("Couldn't extract token address from events");
              }
            }
          } else {
            console.warn("No events from factory contract found in transaction logs");
          }
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
      writeContract({
        address: FACTORY_ADDRESS,
        abi: FactoryABI.abi,
        functionName: "createToken",
        args: [tokenName, symbol, totalSupply],
      });
    } catch (e) {
      console.error("Error submitting transaction:", e);
      setError(`Transaction error: ${e.message}`);
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
            <p className="text-sm mt-1">
              <a
                href={`https://sepolia.etherscan.io/token/${deployedTokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View on Etherscan →
              </a>
            </p>
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