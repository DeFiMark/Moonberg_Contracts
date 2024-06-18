//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title Owner
 * @dev Set & change owner
 */
contract Ownable {

    address private owner;
    
    // event for EVM logging
    event OwnerSet(address indexed oldOwner, address indexed newOwner);
    
    // modifier to check if caller is owner
    modifier onlyOwner() {
        // If the first argument of 'require' evaluates to 'false', execution terminates and all
        // changes to the state and to Ether balances are reverted.
        // This used to consume all gas in old EVM versions, but not anymore.
        // It is often a good idea to use 'require' to check if functions are called correctly.
        // As a second argument, you can also provide an explanation about what went wrong.
        require(msg.sender == owner, "Caller is not owner");
        _;
    }
    
    /**
     * @dev Set contract deployer as owner
     */
    constructor() {
        owner = msg.sender; // 'msg.sender' is sender of current call, contract deployer for a constructor
        emit OwnerSet(address(0), owner);
    }

    /**
     * @dev Change owner
     * @param newOwner address of new owner
     */
    function changeOwner(address newOwner) public onlyOwner {
        emit OwnerSet(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @dev Return owner address 
     * @return address of owner
     */
    function getOwner() external view returns (address) {
        return owner;
    }
}

interface IERC20 {

    function totalSupply() external view returns (uint256);
    
    function symbol() external view returns(string memory);
    
    function name() external view returns(string memory);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);
    
    /**
     * @dev Returns the number of decimal places
     */
    function decimals() external view returns (uint8);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


contract MoonbergVesting is Ownable {

    /** Token To Be Vested */
    IERC20 public immutable token;

    /** Totals Tracking */
    uint256 public totalVesting; // total amount of tokens currently vesting
    uint256 public totalClaimed; // total amount of vested tokens already claimed by users

    /** 
        Vesting Structure     
    */
    struct Vesting {
        uint256 totalVest;       // total amount of tokens to be vested
        uint256 amount;          // amount of tokens left to be claimed or vested
        uint256 startTime;       // start time of the vesting
        uint256 duration;        // duration in seconds of vesting
        uint256 lastClaim;       // last time a claim was made by the user
        uint256 tokensPerSecond; // tokens to be vested per second (amount / duration)
    }
    mapping ( address => Vesting ) public vesting;

    constructor(
        address token_
    ) {
        token = IERC20(token_);
    }

    function removeVestingInfo(address[] calldata users) external onlyOwner {
        uint len = users.length;
        for (uint256 i = 0; i < len;) {
            unchecked {
                totalVesting -= vesting[users[i]].amount;
            }
            delete vesting[users[i]];
            unchecked { ++i; }
        }
    }

    function addVestingInfo(
        address user,
        uint256 amount,
        uint256 duration
    ) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(vesting[user].amount == 0, "Vesting info already exists");
        vesting[user] = Vesting({
            totalVest: amount,
            amount: amount,
            startTime: block.timestamp,
            duration: duration,
            lastClaim: block.timestamp,
            tokensPerSecond: amount / duration
        });
    }

    function addBatchVestingInfo(
        address[] calldata users,
        uint256[] calldata amounts,
        uint256[] calldata durations
    ) external onlyOwner {
        uint len = users.length;
        require(len == amounts.length && len == durations.length, "Array length mismatch");
        for (uint256 i = 0; i < len;) {
            require(amounts[i] > 0, "Amount must be greater than 0");
            require(durations[i] > 0, "Duration must be greater than 0");
            require(vesting[users[i]].amount == 0, "Vesting info already exists");
            vesting[users[i]] = Vesting({
                totalVest: amounts[i],
                amount: amounts[i],
                startTime: block.timestamp,
                duration: durations[i],
                lastClaim: block.timestamp,
                tokensPerSecond: amounts[i] / durations[i]
            });
            unchecked {
                totalVesting += amounts[i];
            }
        }
    }

    function claim() external {
        require(vesting[msg.sender].amount > 0, "No vesting info found");
        uint256 pending = pendingRewards(msg.sender);
        require(pending > 0, "No rewards to claim");
        vesting[msg.sender].lastClaim = block.timestamp;
        vesting[msg.sender].amount -= pending;
        unchecked {
            totalClaimed += pending;
            totalVesting -= pending;
        }
        token.transfer(msg.sender, pending);
    }

    function pendingRewards(address user) public view returns (uint256) {
        Vesting memory v = vesting[user];
        if (v.amount == 0) {
            return 0;
        }
        uint256 timeElapsed = timeSinceClaim(user);
        if (timeElapsed == 0) {
            return 0;
        }
        uint256 tokensToClaim = timeElapsed * v.tokensPerSecond;
        if (tokensToClaim > v.amount) {
            tokensToClaim = v.amount;
        }
        return tokensToClaim;
    }

    function timeSinceClaim(address user) public view returns (uint256) {
        return block.timestamp > vesting[user].lastClaim ? block.timestamp - vesting[user].lastClaim : 0;
    }

}