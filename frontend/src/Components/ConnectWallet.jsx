import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import './ConnectWallet.css';

const WalletConnect = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  
  const handleConnect = async () => {
    try {
      await connect({ connector: injected() });
    } catch (error) {
      console.error("Connection error:", error);
    }
  };
  
  if (isConnected && address) {
    return (
      <div className="wallet-container">
        <div className="address">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <button 
          className="disconnect-button" 
          onClick={() => disconnect()}
        >
          Disconnect
        </button>
      </div>
    );
  }
  
  return (
    <button 
      className="connect-button" 
      onClick={handleConnect}
    >
      Connect Wallet
    </button>
  );
};

export default WalletConnect;