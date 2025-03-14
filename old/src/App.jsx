import logo from './logo.svg';
import GetToken from './Components/user';
import WalletConnect from './Components/ConnectWallet';
import Home from './Components/DeployNft';
import { WagmiProvider } from "wagmi";
import { wagmiClient } from "./wagmiClient";
import './App.css';

function App() {
  return (
    <WagmiProvider config={wagmiClient}>
      <div className="app">
        <header className="app-header">
          <img src={logo} className="app-logo" alt="logo" />
          <h1>Token LaunchPad 🚀</h1>
          <div className="wallet">
            <WalletConnect />
          </div>
        </header>
        <div className="container">
          <div className="wallet">
            <WalletConnect />
          </div>
          <div className="card">
            <Home />
          </div>
        </div>
      </div>
    </WagmiProvider>
  );
}


export default App;