/* eslint-disable */
const {ethers} = require('hardhat');

// Governance
let MoonBerg;
let SaylorSweep;
let Presale;
let VestingSchedule;

const ownerAddress = "0x44aC83925523b5B7c4bE6440191C65Ee75681DF2";
const WRAPPED_BTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
const PRESALE_DESTINATION = "0x44aC83925523b5B7c4bE6440191C65Ee75681DF2";

async function verify(address, args) {
  try {
    // verify the token contract code
    await hre.run('verify:verify', {
      address: address,
      constructorArguments: args,
    });
  } catch (e) {
    console.log('error verifying contract', e);
  }
  await sleep(1000);
}

function getNonce() {
  return baseNonce + nonceOffset++;
}

async function deployContract(name = 'Contract', path, args) {
  const Contract = await ethers.getContractFactory(path);

  const Deployed = await Contract.deploy(...args, {nonce: getNonce()});
  console.log(name, ': ', Deployed.address);
  await sleep(5000);

  return Deployed;
}

async function fetchContract(path, address) {
    // Fetch Deployed Factory
    const Contract = await ethers.getContractAt(path, address);
    console.log('Fetched Contract: ', Contract.address, '\nVerify Against: ', address, '\n');
    await sleep(3000);
    return Contract;
}

async function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      return resolve();
    }, ms);
  });
}

/**
  FIRST DEPLOY:

  MoonBerg Token :  0xC64F9b3eE7217D2Fb3CBAd8b046978De6f470Ef2
  SaylorSweep :  0xBc169A1b8117A62b2F685e892A84f38BC52CB95d
  Presale :  0xb8301Eef17B6280fa2b9E0F0a26342bbDB52d4b4
  Vesting Schedule :  0xFa7a9A251400B5BB3b7c8d36da24352d6eD5c38A
 */

async function main() {
    console.log('Starting Deploy');

    // addresses
    [owner] = await ethers.getSigners();

    // fetch data on deployer
    console.log('Deploying contracts with the account:', owner.address);
    console.log('Account balance:', (await owner.getBalance()).toString());

    // manage nonce
    baseNonce = await ethers.provider.getTransactionCount(owner.address);
    nonceOffset = 0;
    console.log('Account nonce: ', baseNonce);

    // Deploy Governance Manager
    MoonBerg = await deployContract('MoonBerg Token', 'contracts/MoonBerg/Moonberg.sol:Moonberg', [ownerAddress]);
    SaylorSweep = await deployContract('SaylorSweep', 'contracts/MoonBerg/SaylorSweep.sol:SaylorSweep', [MoonBerg.address, [WRAPPED_BTC]]);
    Presale = await deployContract('Presale', 'contracts/MoonBerg/Presale.sol:Presale', [PRESALE_DESTINATION]);
    VestingSchedule = await deployContract('Vesting Schedule', 'contracts/MoonBerg/MoonbergVesting.sol:MoonbergVesting', [MoonBerg.address]);

    // Verify Contracts
    await verify(MoonBerg.address, [ownerAddress]);
    await verify(SaylorSweep.address, [MoonBerg.address, [WRAPPED_BTC]]);
    await verify(Presale.address, [PRESALE_DESTINATION]);
    await verify(VestingSchedule.address, [MoonBerg.address]);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
