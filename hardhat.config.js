require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
let secret = require("./secret");
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      chainId: 97//137
    },
    bscTestnet: {
      url: 'https://data-seed-prebsc-2-s1.binance.org:8545/',
      accounts: [secret.key]
    },
    bscMainnet: {
      url: 'https://bsc-dataseed.binance.org',
      accounts: [secret.key]
    },
    polygonTestnet: {
      url: 'https://polygon-mumbai-bor-rpc.publicnode.com/',
      accounts: [secret.key]
    },
    polygonMainnet: {
      url: 'https://polygon-rpc.com/',//'https://polygon-bor-rpc.publicnode.com',
      accounts: [secret.key],
      // chainId: 137
    }
  },
  etherscan: {
    apiKey: secret.bscscanAPI//polygonAPI
  },
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  }
};
