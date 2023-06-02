import { HardhatUserConfig } from "hardhat/config";
import { HARDHAT_NETWORK_MNEMONIC } from 'hardhat/internal/core/config/default-config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'hardhat-deploy';

import * as dotenv from 'dotenv';
dotenv.config();

const bscGasApi = process.env.BSCSCAN_API_KEY ?
  `https://api.bscscan.com/api?module=proxy&action=eth_gasPrice&apiKey=${process.env.BSCSCAN_PRICE_API}`
  : undefined;

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.18',
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
    token: 'BNB',
    gasPriceApi: bscGasApi
  },
  networks: {
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [process.env.PRIVATE_KEY!],
      verify: {
        etherscan: {
          apiKey: process.env.BSCSCAN_API_KEY
        }
      }
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [process.env.PRIVATE_KEY!],
      verify: {
        etherscan: {
          apiKey: process.env.BSCSCAN_API_KEY
        }
      }
    },
    hardhat: {
      accounts: {
        mnemonic: process.env.HARDHAT_MNEMONIC || HARDHAT_NETWORK_MNEMONIC
      },
      deploy: ['deploy', 'deploy/hardhat']
    }
  }
};

export default config;
