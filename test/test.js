// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const { ethers, waffle, BigNumber } = require("hardhat");

describe("RVL Test", function () {
  
  let Router;
  let RouterContract;
  let Factory;
  let FactoryContract;
  
  let RVL;
  let RVLContract;
  let BuyReceiver;
  let BuyReceiverContract;
  let SellReceiver;
  let SellReceiverContract;
  let TransferReceiver;
  let TransferReceiverContract;

  let RVLSwapper;
  let RVLSwapperContract;

  let RVLMAXI;
  let RVLMAXIContract;

  let RewardDistributor;
  let RewardDistributorContract;

  let WETHContract;
  let WETH;

  let BUSDContract;
  let BUSD;

  let BUSDSwapperContract;
  let BUSDSwapper;

  let MAXISwapper;
  let MAXISwapperContract;

  let pair;

  let owner;
  let addr1;
  let addr2;
  let addrs;

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
    WETHContract = await ethers.getContractFactory("contracts/DEX/WETH.sol:WBNB");
    WETH = await WETHContract.deploy();

    BUSDContract = await ethers.getContractFactory("contracts/HelperContracts/BUSD.sol:BEP20Token");
    BUSD = await BUSDContract.deploy();

    // Set Router And Factory
    FactoryContract = await ethers.getContractFactory("contracts/DEX/Factory.sol:DEXFactory");
    RouterContract = await ethers.getContractFactory("contracts/DEX/Router.sol:DEXRouter");
    Factory = await FactoryContract.deploy(owner.address);
    await Factory.setFeeTo(owner.address);
    Router = await RouterContract.deploy(Factory.address, WETH.address);

    // BUSD Swapper
    BUSDSwapperContract = await ethers.getContractFactory("contracts/HelperContracts/BUSDSwapper.sol:BUSDSwapper");
    BUSDSwapper = await BUSDSwapperContract.deploy(BUSD.address, Router.address);

    // RVL Contracts
    RVLContract = await ethers.getContractFactory("contracts/RVL/RVLToken.sol:RVL");
    RVLSwapperContract = await ethers.getContractFactory("contracts/RVL/RVLSwapper.sol:RVLSwapper");
    BuyReceiverContract = await ethers.getContractFactory("contracts/RVL/BuyReceiver.sol:BuyReceiver");
    SellReceiverContract = await ethers.getContractFactory("contracts/RVL/SellReceiver.sol:SellReceiver");
    RVLMAXIContract = await ethers.getContractFactory("contracts/RVL/RVLMAXI.sol:RevivalMAXI");
    RewardDistributorContract = await ethers.getContractFactory("contracts/RVL/RewardDistributor.sol:RewardDistributor");
    MAXISwapperContract = await ethers.getContractFactory("contracts/RVL/MAXISwapper.sol:RVLMAXISwapper");

    // Deploy Contracts
    RVL = await RVLContract.deploy();
    RVLSwapper = await RVLSwapperContract.deploy(RVL.address, Router.address);
    RVLMAXI = await RVLMAXIContract.deploy(RVL.address, RVL.address);
    BuyReceiver = await BuyReceiverContract.deploy(RVL.address, RVLMAXI.address);
    SellReceiver = await SellReceiverContract.deploy(RVL.address, RVLMAXI.address, Router.address);
    RewardDistributor = await RewardDistributorContract.deploy(RVLMAXI.address, BUSD.address, BUSDSwapper.address);
    MAXISwapper = await MAXISwapperContract.deploy(RVL.address, RVLMAXI.address, Router.address);

    // set rvl maxi
    await RVLMAXI.setTokenSwapper(MAXISwapper.address);

    // Fee Exempt MAXI
    await RVL.setFeeExempt(RVLMAXI.address, true);

    // Set RVL Receivers
    await RVL.setBuyFeeRecipient(BuyReceiver.address);
    await RVL.setSellFeeRecipient(SellReceiver.address);
    await RVL.setTransferFeeRecipient(BuyReceiver.address);
    await RVL.setSwapper(RVLSwapper.address);

    // Create pair on router
    await Factory.createPair(RVL.address, WETH.address);
    pair = await Factory.getPair(RVL.address, WETH.address);

    // Add AMM
    await RVL.registerAutomatedMarketMaker(pair);

    // Set RVL MAXI State
    await RVLMAXI.setRewardDistributor(RewardDistributor.address);

    // approve router for liquidity
    await RVL.approve(Router.address, ONE_HUNDRED_THOUSAND);

    // Add Liquidity
    await Router.addLiquidityETH(
      RVL.address,
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
    
    // Add And Approve BUSD + WETH LP
    await BUSD.approve(Router.address, ONE_THOUSAND);
    await Router.addLiquidityETH(
      BUSD.address,
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

    await RVL.approve(RVLMAXI.address, ONE_THOUSAND);
    await RVLMAXI.deposit(ONE_THOUSAND);

    await RVL.setEmissionBountyPercent(20);

    await RVL.setEmissionRecipient(RVLMAXI.address);
    await RVL.startEmissions();
  });


  describe("Deployment", function () {
    it("Should be able to deploy", async function() {
        expect(RVL.address).to.not.be.null;
        expect(RVLSwapper.address).to.not.be.null;
        expect(BuyReceiver.address).to.not.be.null;
        expect(SellReceiver.address).to.not.be.null;
        expect(MAXISwapper.address).to.not.be.null;
        expect(RVLMAXI.address).to.not.be.null;
        expect(RewardDistributor.address).to.not.be.null;
        expect(Factory.address).to.not.be.null;
        expect(Router.address).to.not.be.null;
        expect(WETH.address).to.not.be.null;
        expect(pair).to.not.be.null;
    });
    it("Should have constructor arguements stored in storage", async function() {
      const tokenAddress = await RVLSwapper.token();
      expect(tokenAddress).to.equal(RVL.address);

      const MaxiAddress = await RVLMAXI.token();
      expect(MaxiAddress).to.equal(RVL.address);

      const ownableAddr = await RewardDistributor.ownableToken();
      expect(ownableAddr).to.equal(RVL.address);

      const buyReceiver = await RVL.buyFeeRecipient();
      expect(buyReceiver).to.equal(BuyReceiver.address);
    });
  });

  describe("Transfer And Fee Checks", function () {
    it("Can be sold tax free", async function() {

      const ownerBalanceBefore = await RVL.balanceOf(owner.address);
      const lpBalanceBefore = await RVL.balanceOf(pair);

      await RVL.connect(owner).approve(Router.address, ONE_HUNDRED_THOUSAND);
      await Router.connect(owner).swapExactTokensForETHSupportingFeeOnTransferTokens(
        ONE_HUNDRED_THOUSAND,
        0,
        [ RVL.address, WETH.address ],
        owner.address,
        ONE_HUNDRED_THOUSAND
      );

      const ownerBalanceAfter = await RVL.balanceOf(owner.address);
      const lpBalanceAfter = await RVL.balanceOf(pair);
      
      
      expect(ownerBalanceAfter.lt(ownerBalanceBefore)).to.be.true;
      expect(lpBalanceAfter.gt(lpBalanceBefore)).to.be.true;
    });
    it("Can Buy From Token Buy Function", async function() {

      const addr2BalanceBefore = await RVL.balanceOf(addr2.address);
      const stakingBalanceBefore = await RVL.balanceOf(RVLMAXI.address);

      await RVL.connect(owner).buyFor(
        addr2.address,
        {
          value: ONE,
          from: owner.address
        }
        );
      const addr2BalanceAfter = await RVL.balanceOf(addr2.address);
      const stakingBalanceAfter = await RVL.balanceOf(RVLMAXI.address);

      expect(addr2BalanceAfter.gt(addr2BalanceBefore)).to.be.true;
      expect(stakingBalanceAfter.gt(stakingBalanceBefore)).to.be.true;

    });
    it("Can Buy Without Taxes", async function() {

      const ownerBalanceBefore = await RVL.balanceOf(owner.address);
      const stakingBalanceBefore = await RVL.balanceOf(RVLMAXI.address);
      const totalSupplyBefore = await RVL.totalSupply();

      await Router.connect(owner).swapExactETHForTokensSupportingFeeOnTransferTokens(
        0,
        [WETH.address, RVL.address],
        owner.address,
        ONE_HUNDRED_THOUSAND,
        {
          value: ONE,
          from: owner.address
        }
        );
      const ownerBalanceAftere = await RVL.balanceOf(owner.address);
      const stakingBalanceAfter = await RVL.balanceOf(RVLMAXI.address);
      const totalSupplyAfter = await RVL.totalSupply();
      
      expect(ownerBalanceAftere.gt(ownerBalanceBefore)).to.be.true;
      expect(stakingBalanceAfter.gt(stakingBalanceBefore)).to.be.true;
      expect(totalSupplyAfter.gt(totalSupplyBefore)).to.be.true;

    });
    it("Can Buy With Taxes", async function() {

      const ownerBalanceBefore = await RVL.balanceOf(owner.address);
      const addr2BalanceBefore = await RVL.balanceOf(addr2.address);
      const receiverBalanceBefore = await RVL.balanceOf(BuyReceiver.address);

      await Router.connect(owner).swapExactETHForTokensSupportingFeeOnTransferTokens(
        0,
        [WETH.address, RVL.address],
        addr2.address,
        ONE_HUNDRED_THOUSAND,
        {
          value: ONE,
          from: owner.address
        }
        );
      const ownerBalanceAfter = await RVL.balanceOf(owner.address);
      const addr2BalanceAfter = await RVL.balanceOf(addr2.address);
      const receiverBalanceAfter = await RVL.balanceOf(BuyReceiver.address);

      expect(ownerBalanceAfter.gte(ownerBalanceBefore)).to.be.true;
      expect(addr2BalanceAfter.gt(addr2BalanceBefore)).to.be.true;
      expect(receiverBalanceAfter.gt(receiverBalanceBefore)).to.be.true;

    });
    it("Can Sell From Token Sell Function", async function() {

      await RVL.connect(owner).transfer(addr1.address, ONE_HUNDRED);
      const addr1Balance = await RVL.balanceOf(addr1.address);
      await RVL.connect(addr1).sell(addr1Balance);

    });
    it("Can Sell From Sell Receiver", async function() {

      await RVL.connect(owner).transfer(SellReceiver.address, ONE_HUNDRED);
      const busdBefore = await BUSD.balanceOf(RewardDistributor.address);
      await SellReceiver.trigger();
      const busdAfter = await BUSD.balanceOf(RewardDistributor.address);

      expect(busdAfter.gt(busdBefore)).to.be.true;
    });
    it("Can be sold with taxes", async function() {

      await RVL.connect(owner).transfer(addr1.address, ONE_HUNDRED_THOUSAND);

      const addr1BalanceBefore = await RVL.balanceOf(addr1.address);
      const lpBalanceBefore = await RVL.balanceOf(pair);

      await RVL.connect(addr1).approve(Router.address, ONE_HUNDRED_THOUSAND);
      await Router.connect(addr1).swapExactTokensForETHSupportingFeeOnTransferTokens(
        ONE_THOUSAND,
        0,
        [ RVL.address, WETH.address ],
        addr1.address,
        ONE_HUNDRED_THOUSAND
      );

      const addr1BalanceAfter = await RVL.balanceOf(addr1.address);
      const lpBalanceAfter = await RVL.balanceOf(pair);
      
      expect(addr1BalanceAfter.lt(addr1BalanceBefore)).to.be.true;
      expect(lpBalanceAfter.gt(lpBalanceBefore)).to.be.true;

      const receiverBalance = await RVL.balanceOf(SellReceiver.address);
      expect(receiverBalance.gt(0)).to.be.true;

      await SellReceiver.trigger();

      const receiverBalanceAfter = await RVL.balanceOf(SellReceiver.address);
      const busdBalance = await BUSD.balanceOf(RewardDistributor.address);

      expect(receiverBalanceAfter.lte(0)).to.be.true;
      expect(busdBalance.gt(0)).to.be.true;


    });
  });
  describe("Can Claim Bounty", function () {
    it("Gives Bounty To User And Staking Pool", async function() {

      const balBefore = await RVL.balanceOf(addr1.address);
      const stakingBefore = await RVL.balanceOf(RVLMAXI.address);
      
      await RVL.connect(addr1).emitShares();

      const balAfter = await RVL.balanceOf(addr1.address);
      const stakingAfter = await RVL.balanceOf(RVLMAXI.address);

      console.log({
        balBefore,
        balAfter,
        stakingBefore,
        stakingAfter
      });

      expect(stakingBefore.lt(stakingAfter)).to.be.true;
      expect(balBefore.lt(balAfter)).to.be.true;
    });
    it("Can Trigger Sell receiver and bounty", async function() {

      await RVL.connect(owner).transfer(SellReceiver.address, ONE_HUNDRED);
      const balBefore = await RVL.balanceOf(addr1.address);
      const stakingBefore = await RVL.balanceOf(RVLMAXI.address);
      const balDev = await RVL.balanceOf('0xeb98dB0f4Bc181194C8ebf4Bfa0584408037Cf6a');

      await ethers.provider.send('evm_mine');
      
      await RVL.connect(addr1).emitShares();

      const balAfter = await RVL.balanceOf(addr1.address);
      const stakingAfter = await RVL.balanceOf(RVLMAXI.address);
      const balDevAfter = await RVL.balanceOf('0xeb98dB0f4Bc181194C8ebf4Bfa0584408037Cf6a');

      expect(stakingBefore.lt(stakingAfter)).to.be.true;
      expect(balBefore.lt(balAfter)).to.be.true;
      expect(balDev.lt(balDevAfter)).to.be.true;
    });
  });

  describe("Reward Distributor Checks", function () {
    it("Allocates BUSD Rewards To Stakers", async function() {

        await RVL.connect(owner).transfer(addr1.address, ONE_HUNDRED_THOUSAND);
        await RVL.connect(owner).transfer(addr2.address, ONE_HUNDRED_THOUSAND);

        await RVL.connect(addr1).approve(RVLMAXI.address, ONE_HUNDRED_THOUSAND);
        await RVLMAXI.connect(addr1).deposit(ONE_HUNDRED_THOUSAND);

        await RVL.connect(addr2).approve(RVLMAXI.address, ONE_HUNDRED_THOUSAND);
        await RVLMAXI.connect(addr2).deposit(ONE_HUNDRED_THOUSAND);

        const holdercount = await RewardDistributor.holderCount();

        expect(holdercount.eq(3)).to.be.true;

        const totalSharesBefore = await RewardDistributor.totalShares();

        await RVLMAXI.connect(addr1).withdrawAll(true);

        const newHoldercount = await RewardDistributor.holderCount();
        const totalSharesAfter = await RewardDistributor.totalShares();

        expect(newHoldercount.eq(2)).to.be.true;

        const sellReceiverBalance = await RVL.balanceOf(SellReceiver.address);
        expect(sellReceiverBalance.gt(0)).to.be.true;

        const busdBalBefore = await BUSD.balanceOf(RewardDistributor.address);
        expect(busdBalBefore.eq(0)).to.be.true;

        await SellReceiver.trigger();

        const ownerBal = await RewardDistributor.balanceOf(owner.address);
        const addr1Bal = await RewardDistributor.balanceOf(addr1.address);
        const addr2Bal = await RewardDistributor.balanceOf(addr2.address);

        const busdBal = await BUSD.balanceOf(RewardDistributor.address);
        const stakerBals = ownerBal.add(addr2Bal).add(addr1Bal);

        expect(ownerBal.gt(0)).to.be.true;
        expect(addr1Bal.eq(0)).to.be.true;
        expect(addr2Bal.gt(0)).to.be.true;
        expect(totalSharesAfter.lt(totalSharesBefore)).to.be.true;
        expect(busdBal.gte(stakerBals)).to.be.true;
        
        const busdBalAddr2 = await BUSD.balanceOf(addr2.address);
        await RVLMAXI.connect(addr2).withdrawAll(true);
        const busdBalAddr2After = await BUSD.balanceOf(addr2.address);
        
        await SellReceiver.trigger();

        const ownerBAL = await RewardDistributor.balanceOf(owner.address);
        const totalSharesEnd = await RewardDistributor.totalShares();

        expect(busdBalAddr2After.gt(busdBalAddr2)).to.be.true;
        expect(ownerBAL.gt(ownerBal)).to.be.true;
        expect(totalSharesEnd.lt(totalSharesAfter)).to.be.true;

        const busdBalOwnerBefore = await BUSD.balanceOf(owner.address);
        await RVLMAXI.connect(owner).withdrawAll(true);
        const busdBalOwner = await BUSD.balanceOf(owner.address);
        expect(busdBalOwner.gt(busdBalOwnerBefore)).to.be.true;

    });
    it("Can Mass Allocate Rewards To All Holders", async function() {

      await RVL.connect(owner).transfer(addr1.address, ONE_HUNDRED_THOUSAND);
      await RVL.connect(owner).transfer(addr2.address, ONE_HUNDRED_THOUSAND);

      await RVL.connect(addr1).approve(RVLMAXI.address, ONE_HUNDRED_THOUSAND);
      await RVLMAXI.connect(addr1).deposit(ONE_HUNDRED_THOUSAND);

      await RVL.connect(addr2).approve(RVLMAXI.address, ONE_HUNDRED_THOUSAND);
      await RVLMAXI.connect(addr2).deposit(ONE_HUNDRED_THOUSAND);

      const BUSDBalOwnerBefore = await RewardDistributor.balanceOf(owner.address);
      const BUSDBalAddr1Before = await RewardDistributor.balanceOf(addr1.address);
      const BUSDBalAddr2Before = await RewardDistributor.balanceOf(addr2.address);

      await RVL.connect(owner).transfer(SellReceiver.address, ONE_HUNDRED_THOUSAND);
      await SellReceiver.trigger();

      const BUSDBalOwner = await RewardDistributor.balanceOf(owner.address);
      const BUSDBalAddr1 = await RewardDistributor.balanceOf(addr1.address);
      const BUSDBalAddr2 = await RewardDistributor.balanceOf(addr2.address);

      expect(BUSDBalOwnerBefore.lt(BUSDBalOwner)).to.be.true;
      expect(BUSDBalAddr1Before.lt(BUSDBalAddr1)).to.be.true;
      expect(BUSDBalAddr2Before.lt(BUSDBalAddr2)).to.be.true;

      const bbalOwnerBefore = await BUSD.balanceOf(owner.address);
      const bbal1Before = await BUSD.balanceOf(addr1.address);
      const bbal2Before = await BUSD.balanceOf(addr2.address);

      await RewardDistributor.massClaim();

      const bbalOwner = await BUSD.balanceOf(owner.address);
      const bbal1 = await BUSD.balanceOf(addr1.address);
      const bbal2 = await BUSD.balanceOf(addr2.address);

      expect(bbalOwnerBefore.lt(bbalOwner)).to.be.true;
      expect(bbal1Before.lt(bbal1)).to.be.true;
      expect(bbal2Before.lt(bbal2)).to.be.true;

      
      const BUSDBalOwnerEnd = await RewardDistributor.balanceOf(owner.address);
      const BUSDBalAddr1End = await RewardDistributor.balanceOf(addr1.address);
      const BUSDBalAddr2End = await RewardDistributor.balanceOf(addr2.address);

      expect(BUSDBalOwnerEnd.eq(0)).to.be.true;
      expect(BUSDBalAddr1End.eq(0)).to.be.true;
      expect(BUSDBalAddr2End.eq(0)).to.be.true;
  });
  });
});