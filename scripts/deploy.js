/* eslint-disable */
const {ethers} = require('hardhat');

// is Testnet or Mainnet Deploy
const isTestnet = false

// Governance
let GovernanceManager;
let FeeReceiver;

const newOwner = "0x44aC83925523b5B7c4bE6440191C65Ee75681DF2";

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

    console.log('Deploying on', isTestnet ? 'Testnet!' : 'Mainnet!');
    await sleep(1000);

    // Deploy Governance Manager
    GovernanceManager = await fetchContract('contracts/GovernanceManager/GovernanceManager.sol:GovernanceManager', '0x22164a57446aD5dE1DBE831784D8029773941678');
    FeeReceiver = await fetchContract('contracts/GovernanceManager/FeeRecipient.sol:FeeReceiver', '0x76cD821f8C173C0d7E0a29fc65ceB49De107f698');
    // GovernanceManager = await deployContract('Governance Manager', 'contracts/GovernanceManager/GovernanceManager.sol:GovernanceManager', [
    //     owner.address,
    //     newOwner
    // ]);
    // FeeReceiver = await deployContract('Fee Receiver', 'contracts/GovernanceManager/FeeRecipient.sol:FeeReceiver', [GovernanceManager.address]);

    // await GovernanceManager.setFeeReceiver(FeeReceiver.address, { nonce: getNonce() });
    // await sleep(2000);
    // console.log('Set Fee Receiver In Manager')

    await FeeReceiver.changeOwner(newOwner, { nonce: getNonce() });
    await sleep(2000);
    console.log('Set Owner In Fee Receiver');

    // Verify Contracts
    await verify(GovernanceManager.address, [owner.address, newOwner]);
    await verify(FeeReceiver.address, [GovernanceManager.address]);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
