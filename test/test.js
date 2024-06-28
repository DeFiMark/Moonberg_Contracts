// We import Chai to use its asserting functions here.
// import { expect } from "chai";
// const { expect } = require("chai");
// const { expect } = require("chai");
const { ethers, waffle, BigNumber } = require("hardhat");

describe("MoonBerg Test", function () {
  
  // Needed for DEX
  let Router;
  let Factory;
  let WETH;

  // MoonBerg Token Contracts
  let MoonBerg;
  let SaylorSweep;

  // Liquidity Address
  let pair;

  // addresses for testing
  let owner;
  let addr1;
  let addr2;
  let addrs;

  // constant values for readability
  const ONE = "10000000000000000";
  const ONE_HUNDRED = "1000000000000000000";
  const ONE_THOUSAND = "10000000000000000000";
  const ONE_HUNDRED_THOUSAND = "1000000000000000000000";

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    
    // addresses
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Create WETH And BUSD
    let WETHContract = await ethers.getContractFactory("contracts/DEX/WETH.sol:WBNB");
    WETH = await WETHContract.deploy();

    // Set Router And Factory
    let FactoryContract = await ethers.getContractFactory("contracts/DEX/Factory.sol:DEXFactory");
    let RouterContract = await ethers.getContractFactory("contracts/DEX/Router.sol:DEXRouter");
    Factory = await FactoryContract.deploy(owner.address);
    await Factory.setFeeTo(owner.address);
    Router = await RouterContract.deploy(Factory.address, WETH.address);

    // MoonBerg Contracts
    let MoonBergContract = await ethers.getContractFactory("contracts/MoonBerg/Moonberg.sol:Moonberg");
    let SaylorSweepContract = await ethers.getContractFactory("contracts/MoonBerg/SaylorSweep.sol:SaylorSweep");

    // Deploy Contracts
    MoonBerg = await MoonBergContract.deploy(owner.address);
    SaylorSweep = await SaylorSweepContract.deploy(MoonBerg.address, [WETH.address])

    // Create pair on router
    await Factory.createPair(MoonBerg.address, WETH.address);
    // await sleep(5000);

    // fetch pair from factory
    pair = await Factory.getPair(MoonBerg.address, WETH.address);

    // approve router for liquidity
    await MoonBerg.approve(Router.address, ONE_HUNDRED_THOUSAND);

    // Add Liquidity
    await Router.addLiquidityETH(
      MoonBerg.address,
      ONE,
      ONE,
      ONE,
      owner.address,
      ONE_HUNDRED_THOUSAND,
      {
        value: ONE,
        from: owner.address
      }
    );
  });


  describe("Deployment", function () {
    it("Should be able to deploy", async function() {
        // console.log(MoonBerg.address.length > 0 ? 'Success' : 'Fail')
    });
    it("Should have constructor arguements stored in storage", async function() {
      const ownerAddress = await MoonBerg.getOwner();
      // console.log(ownerAddress == owner.address ? 'Success' : 'Fail')
    });
  });
  describe("Can Be Transfered Between Addresses", function () {
    it("Can Be Transferred", async function() {

      // Send some tokens to the other addresses
      await MoonBerg.transfer(addr1.address, ONE_HUNDRED_THOUSAND)
      await MoonBerg.transfer(addr2.address, ONE_THOUSAND)

      const addr1Balance = await MoonBerg.balanceOf(addr1.address);
      const addr2Balance = await MoonBerg.balanceOf(addr2.address);

      // console.log(ethers.utils.formatEther(addr1Balance) == ONE_HUNDRED_THOUSAND ? 'Success' : 'Fail')
      // console.log(ethers.utils.formatEther(addr2Balance) == ONE_THOUSAND ? 'Success' : 'Fail')
    });
  });
  describe("Buy and Sells Work As Expected", function () {
    it("Can Be Sold", async function() {
      // console.log(owner.address, MoonBerg.address, Router.address, WETH.address)
      const balBefore = await MoonBerg.balanceOf(owner.address);

      await MoonBerg.approve(Router.address, ONE_HUNDRED_THOUSAND);
      await Router.swapExactTokensForETH(
        ONE_HUNDRED_THOUSAND,
        0,
        [ MoonBerg.address, WETH.address ],
        owner.address,
        ONE_HUNDRED_THOUSAND
      );

      const balAfter = await MoonBerg.balanceOf(owner.address)      
      // console.log(parseFloat(ethers.utils.formatEther(balAfter)) < parseFloat(ethers.utils.formatEther(balBefore)) ? 'Success' : 'Fail')
      
    });
    it("Can Be Bought", async function() {

      const ownerBalanceBefore = await MoonBerg.balanceOf(owner.address);

      await Router.swapExactETHForTokens(
        0,
        [WETH.address, MoonBerg.address],
        owner.address,
        ONE_HUNDRED_THOUSAND,
        {
          value: ONE,
          from: owner.address
        }
      );
      const ownerBalanceAfter = await MoonBerg.balanceOf(owner.address);
      
      // console.log(parseFloat(ethers.utils.formatEther(ownerBalanceAfter)) > parseFloat(ethers.utils.formatEther(ownerBalanceBefore)) ? 'Success' : 'Fail')
    });
  });
  describe("Can Be Redeemed With Saylor Sweep", function () {
    it("Can Be Burned For BTC", async function() {

      // mint some WETH
      await WETH.deposit({ value: ONE_THOUSAND, from: owner.address })

      // Send some WETH to saylor sweep
      await WETH.transfer(SaylorSweep.address, ONE_THOUSAND)

      // Send some tokens to the other addresses
      await MoonBerg.approve(SaylorSweep.address, ONE_HUNDRED_THOUSAND)
      await SaylorSweep.sweep(ONE_HUNDRED_THOUSAND)
    });
  });
});