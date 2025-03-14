import React from 'react';
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiClient } from "./wagmiClient";
import WalletConnect from './Components/ConnectWallet';
import Home from './Components/DeployErc20';
import DeployNft from './Components/DeployNft';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={wagmiClient}>
      <QueryClientProvider client={queryClient}>
        <div className="app-header">
          <div className="header-content">
            <h1>Token LaunchPad 🚀</h1>
            <p>Deploy your own ERC20 token in seconds</p>
          </div>
          <div className="wallet">
            <WalletConnect />
          </div>
        </div>
        <div className="container">
          <div className="cards-container">
            <div className="card">
              <Home />
            </div>
            <div className="card">
              <DeployNft />
            </div>
          </div>
          <footer className="footer">
            <p>© 2025 Token Launchpad - Create Custom ERC20 & ERC721 Tokens with Ease</p>
        </footer>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;