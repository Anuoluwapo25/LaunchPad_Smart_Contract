import { createConfig, configureChains, mainnet } from "wagmi";
import { publicProvider } from "wagmi/providers/public";

const { chains, publicClient } = configureChains([mainnet], [publicProvider()]);

export const wagmiClient = createConfig({
  autoConnect: true,
  publicClient,
});
