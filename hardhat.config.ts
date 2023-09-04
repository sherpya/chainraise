import { parseArgs } from 'node:util';
import { HardhatUserConfig } from 'hardhat/config';
import { HARDHAT_NETWORK_MNEMONIC } from 'hardhat/internal/core/config/default-config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'hardhat-deploy';

import * as dotenv from 'dotenv';
dotenv.config();

const options = { network: { type: 'string' as 'string' } };
global.network = String(parseArgs({ options: options, strict: false }).values.network || 'localhost');

if (network) {
  dotenv.config({ path: `.env.${global.network}`, override: true });
}

const BUILDBEAR_CONTAINER_NAME = process.env.BUILDBEAR_CONTAINER_NAME || 'invalid';

const bscGasApi = process.env.BSCSCAN_API_KEY ?
  `https://api.bscscan.com/api?module=proxy&action=eth_gasPrice&apiKey=${process.env.BSCSCAN_PRICE_API}`
  : undefined;

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.21',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      }
    }
  },
  namedAccounts: {
    deployer: 0,
    creator: 1,
    funder: 2
  },
  gasReporter: {
    enabled: (process.env.REPORT_GAS) ? true : false,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    excludeContracts: ['TetherToken', 'USDCoin', 'ERC20'],
    //token: 'BNB',
    //gasPriceApi: bscGasApi
  },
  networks: {
    mainnet: {
      url: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      gasPrice: 20000000000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined
    },
    testnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      gasPrice: 20000000000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined
    },
    hardhat: {
      accounts: {
        mnemonic: process.env.HARDHAT_MNEMONIC || HARDHAT_NETWORK_MNEMONIC
      },
      deploy: ['deploy', 'deploy-tokens']
    },
    sepolia: {
      url: 'https://rpc.sepolia.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
      deploy: ['deploy', 'deploy-tokens']
    },
    buildbear: {
      url: `https://rpc.buildbear.io/${BUILDBEAR_CONTAINER_NAME}`,
      accounts: {
        mnemonic: process.env.BUILDBEAR_MNEMONIC || HARDHAT_NETWORK_MNEMONIC
      },
      verify: {
        etherscan: {
          apiKey: 'verifyContract',
          apiUrl: `https://rpc.buildbear.io/verify/etherscan/${BUILDBEAR_CONTAINER_NAME}`,
        }
      }

    }
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.BSCSCAN_API_KEY || '',
      testnet: process.env.BSCSCAN_API_KEY || '',
      sepolia: process.env.ETHERSCAN_API_KEY || '',
      buildbear: 'verifyContract'
    },
    customChains: [
      {
        network: 'buildbear',
        chainId: parseInt(process.env.BUILDBEAR_CHAINID || '1', 10),
        urls: {
          apiURL: `https://rpc.buildbear.io/verify/etherscan/${BUILDBEAR_CONTAINER_NAME}`,
          browserURL: `https://explorer.buildbear.io/${BUILDBEAR_CONTAINER_NAME}`,
        },
      },
    ],
  }
};

export default config;
