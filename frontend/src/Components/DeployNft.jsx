import { useState } from "react";
import { useAccount } from "wagmi";
import "./NFTCreation.css";

function CreateNFT() {
  const { address, isConnected } = useAccount();
  const [nftName, setNftName] = useState("");
  const [nftSymbol, setNftSymbol] = useState("");
  const [baseURI, setBaseURI] = useState("");
  const [royaltyPercentage, setRoyaltyPercentage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [deployedNFTAddress, setDeployedNFTAddress] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleRoyaltyChange = (value) => {
   
    if (/^\d*$/.test(value) && (!value || parseInt(value) <= 15)) {
      setRoyaltyPercentage(value);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const isValidInput = Boolean(
    nftName && 
    nftSymbol && 
    (baseURI || uploadedFile) && 
    royaltyPercentage !== "" && 
    parseInt(royaltyPercentage) >= 0
  );

  const uploadMetadata = async () => {
    if (!uploadedFile) return baseURI;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('name', nftName);
      formData.append('symbol', nftSymbol);
      
      // API call to upload the file/metadata to your backend
      // Your backend should handle storing this and returning a URI
      const response = await fetch('/api/upload-nft-metadata/', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload metadata');
      }
      
      const data = await response.json();
      return data.metadataURI; 
    } catch (error) {
      console.error("Error uploading metadata:", error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const deployNFT = async () => {
    if (!isConnected) {
      setError("Connect your wallet first");
      return;
    }
    if (!isValidInput) {
      setError("Please fill in all required fields");
      return;
    }
    
    setIsLoading(true);
    setError("");
    setDeployedNFTAddress("");
    
    try {
      // If file is uploaded, process it first
      let finalBaseURI = baseURI;
      if (uploadedFile) {
        finalBaseURI = await uploadMetadata();
      }
      
      const response = await fetch('/api/deploy-nft/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nftName,
          symbol: nftSymbol,
          baseURI: finalBaseURI,
          royaltyPercentage: parseInt(royaltyPercentage),
          ownerAddress: address,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTxHash(data.tx_hash);
        
        if (data.status === 'success' && data.contract_address) {
          setDeployedNFTAddress(data.contract_address);
        } else if (data.status === 'pending') {
          // Poll for transaction status if it's pending
          pollTransactionStatus(data.tx_hash);
        }
      } else {
        setError(data.error || 'Failed to deploy NFT contract');
      }
    } catch (e) {
      console.error("Error deploying NFT:", e);
      setError(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const pollTransactionStatus = async (hash) => {
    try {
      let attempts = 0;
      const maxAttempts = 30;
      const interval = setInterval(async () => {
        attempts++;
        
        if (attempts > maxAttempts) {
          clearInterval(interval);
          setError("Transaction confirmation timed out. Please check Etherscan for status.");
          return;
        }
        
        const response = await fetch(`/api/transaction-status/${hash}/?type=nft`);
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
          clearInterval(interval);
          setDeployedNFTAddress(data.contract_address);
        } else if (data.status === 'error') {
          clearInterval(interval);
          setError(data.message || 'Error processing transaction');
        }
      }, 3000);
    } catch (e) {
      console.error("Error polling transaction status:", e);
      setError(`Polling error: ${e.message}`);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Create Your NFT Collection</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Collection Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="My Awesome NFTs"
            value={nftName}
            onChange={(e) => setNftName(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="MNFT"
            value={nftSymbol}
            onChange={(e) => setNftSymbol(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Metadata URI (Optional if uploading file)</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="ipfs://... or https://..."
            value={baseURI}
            onChange={(e) => setBaseURI(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 mt-1">Base URI for your NFT metadata</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Upload NFT Sample/Metadata (Optional)</label>
          <input
            type="file"
            className="w-full p-2 border rounded"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          {isUploading && (
            <div className="mt-2">
              <div className="h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-full bg-blue-600 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-1">Uploading: {uploadProgress}%</p>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Royalty Percentage (0-15%)</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="2.5"
            value={royaltyPercentage}
            onChange={(e) => handleRoyaltyChange(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 mt-1">Percentage of secondary sales you'll receive</p>
        </div>
        
        {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
        
        {txHash && !deployedNFTAddress && (
          <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p className="font-medium">Transaction submitted!</p>
            <p className="text-sm font-mono break-all">Hash: {txHash}</p>
            <p className="text-sm mt-1">
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View on Etherscan →
              </a>
            </p>
          </div>
        )}
        
        {deployedNFTAddress && (
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            <p className="font-medium">NFT Collection deployed successfully!</p>
            <p className="text-sm font-mono break-all">Contract Address: {deployedNFTAddress}</p>
            <p className="text-sm mt-1">
              <a
                href={`https://sepolia.etherscan.io/token/${deployedNFTAddress}`}
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
            isLoading || isUploading ? "bg-gray-400" : isValidInput ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-300"
          }`}
          onClick={deployNFT}
          disabled={isLoading || isUploading || !isValidInput}
        >
          {isUploading ? "Uploading Metadata..." : isLoading ? "Deploying Collection..." : "Create NFT Collection"}
        </button>
      </div>
    </div>
  );
}

export default CreateNFT;