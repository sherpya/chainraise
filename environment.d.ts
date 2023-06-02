
declare global {
    var network: string;
    namespace NodeJS {
        interface ProcessEnv {
            BSCSCAN_API_KEY: string;
            BSCSCAN_PRICE_API: string;
            BUILDBEAR_CHAINID: string;
            BUILDBEAR_CONTAINER_NAME: string;
            BUILDBEAR_MNEMONIC: string;
            COINMARKETCAP_API_KEY: string;
            ETHERSCAN_API_KEY: string;
            HARDHAT_MNEMONIC: string;
            PRIVATE_KEY: string;
            REPORT_GAS: string;
        }
    }
}

export { };
