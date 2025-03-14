import { useState } from "react";
import { useAccount, useWriteContract, usePrepareContractWrite, useWaitForTransaction } from "wagmi";
import FactoryABI from "../abis/FactoryABI.json";
import './DeployNft.css';

const FACTORY_ADDRESS = "0x981A4465A74D467dDd3F28308B255de98F157d72";

function Home() {
  const { address, isConnected } = useAccount();
  const [tokenName, setTokenName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("");
  const [error, setError] = useState("");
  const [deployedTokenAddress, setDeployedTokenAddress] = useState("");

  const totalSupply = supply ? BigInt(supply) : BigInt(0);
  const isValidInput = Boolean(tokenName && symbol && totalSupply > 0);

  const { config, error: prepareError } = usePrepareContractWrite({
    address: FACTORY_ADDRESS,
    abi: FactoryABI.abi,
    functionName: "createToken",
    args: [tokenName, symbol, totalSupply],
    enabled: isValidInput,
    onError: (err) => {
      console.error("Prepare error:", err);
      setError(`Preparation error: ${err.message}`);
    }
  });

  const { 
    write, 
    data: txData, 
    error: writeError, 
    isLoading: isWriteLoading 
  } = useWriteContract({
    ...config,
    onError: (err) => {
      console.error("Write error:", err);
      setError(`Transaction error: ${err.message}`);
    }
  });

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed, 
    error: confirmError 
  } = useWaitForTransaction({
    hash: txData?.hash,
    onSuccess: (receipt) => {
      console.log("Transaction confirmed:", receipt);
      try {
        const tokenDeployedEvent = receipt.logs.find(log => 
          log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase() &&
          log.topics && log.topics[0] === "0x..."  // Replace with correct event signature
        );
        
        if (tokenDeployedEvent) {
          const tokenAddress = `0x${tokenDeployedEvent.data.slice(-40)}`;
          setDeployedTokenAddress(tokenAddress);
        }
      } catch (e) {
        console.error("Error processing receipt:", e);
      }
    }
  });

  const isLoading = isWriteLoading || isConfirming;

  const displayError = error || 
                     (prepareError && `Prepare error: ${prepareError.message}`) || 
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
    write?.();
  };

  const getExplorerUrl = (hash) => `https://etherscan.io/tx/${hash}`;

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
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) {
                setSupply(e.target.value);
              }
            }}
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter the number of tokens (e.g., 1000 for 1000 tokens). Decimals are handled by the contract.
          </p>
        </div>
        
        {isWriteLoading && (
          <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p className="font-medium">Transaction submitted...</p>
            {txData?.hash && (
              <a 
                href={getExplorerUrl(txData.hash)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 break-all hover:underline"
              >
                {txData.hash}
              </a>
            )}
          </div>
        )}
        
        {displayError && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {displayError}
          </div>
        )}
        
        {isConfirmed && (
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            <p className="font-medium">Token deployed successfully!</p>
            {txData?.hash && (
              <a 
                href={getExplorerUrl(txData.hash)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 break-all hover:underline"
              >
                {txData.hash}
              </a>
            )}
            {deployedTokenAddress && (
              <p className="text-sm font-mono break-all">{deployedTokenAddress}</p>
            )}
          </div>
        )}
        
        <button 
          className={`w-full p-2 rounded font-medium ${
            isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          onClick={deployToken}
          disabled={isLoading || !isValidInput}
        >
          {isWriteLoading ? 'Submitting Transaction...' : 
           isConfirming ? 'Waiting for Confirmation...' : 
           'Deploy Token'}
        </button>
      </div>
    </div>
  );
}

export default Home;
