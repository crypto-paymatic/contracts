import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as string;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY as string;
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY as string;
const BASESCAN_API_KEY= process.env.BASESCAN_API_KEY as string;

const config: HardhatUserConfig = {
  solidity: "0.8.27",
  ignition: {
    strategyConfig: {
      create2: {
        // To learn more about salts, see the CreateX documentation
        salt: "0x7061796d617469637061796d656e747631313200000000000000000000000000",
      },
    },
  },
  etherscan: {
    apiKey: {
      etherscan: ETHERSCAN_API_KEY,
      mainnet: ETHERSCAN_API_KEY,
      arb_sepolia: ARBISCAN_API_KEY,
      base_sepolia: BASESCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
      arbitrumOne: ARBISCAN_API_KEY,
      base: BASESCAN_API_KEY
    },
    customChains: [
      {
        network: "arb_sepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/"
        }
      },
      {
        network: "base_sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org/"
        }
      }
    ]
  },
  networks: {
    sepolia: {
      url: 'https://sepolia.drpc.org',
      accounts: [DEPLOYER_PRIVATE_KEY]
    },
    arb_sepolia: {
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: [DEPLOYER_PRIVATE_KEY]
    },
    arb_one: {
      url: 'https://arb1.arbitrum.io/rpc',
      accounts: [DEPLOYER_PRIVATE_KEY]
    },
    base: {
      url: 'https://mainnet.base.org',
      accounts: [DEPLOYER_PRIVATE_KEY]
    },
    base_sepolia: {
      url: 'https://sepolia.base.org',
      accounts: [DEPLOYER_PRIVATE_KEY]
    },
    eth: {
      url: 'https://1rpc.io/eth',
      accounts: [DEPLOYER_PRIVATE_KEY]
    }
  }
};

export default config;
