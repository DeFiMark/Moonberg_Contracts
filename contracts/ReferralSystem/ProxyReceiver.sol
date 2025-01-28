//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract Cloneable {

    /**
        @dev Deploys and returns the address of a clone of address(this
        Created by DeFi Mark To Allow Clone Contract To Easily Create Clones Of Itself
        Without redundancy
     */
    function clone() external returns(address) {
        return _clone(address(this));
    }

    /**
     * @dev Deploys and returns the address of a clone that mimics the behaviour of `implementation`.
     *
     * This function uses the create opcode, which should never revert.
     */
    function _clone(address implementation) internal returns (address instance) {
        /// @solidity memory-safe-assembly
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, implementation))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            instance := create(0, ptr, 0x37)
        }
        require(instance != address(0), "ERC1167: create failed");
    }

}


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


// helper methods for interacting with ERC20 tokens and sending ETH that do not consistently return true/false
library TransferHelper {
    function safeApprove(
        address token,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('approve(address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x095ea7b3, to, value));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::safeApprove: approve failed'
        );
    }

    function safeTransfer(
        address token,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('transfer(address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::safeTransfer: transfer failed'
        );
    }

    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::transferFrom: transferFrom failed'
        );
    }

    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'TransferHelper::safeTransferETH: ETH transfer failed');
    }
}

interface IDatabase {
    function refFee() external view returns (uint8);
    function tierTwoRefFee() external view returns (uint8);
    function tierTwoFounderFee() external view returns (uint8);
    function moonbergFeeAddress() external view returns (address);
}

interface IReceiverImplementation {
    function __init__(address _ref) external;
}

interface ITierTwoReceiverImplementation {
    function __init__(address _ref, address _ref1) external;
}

contract ReceiverDatabase is Ownable {

    address public receiverImplementation;
    address public tierTwoReceiverImplementation;

    mapping ( address => address ) public refToReceiver;

    uint8 public refFee = 10;

    uint8 public tierTwoRefFee = 20;
    uint8 public tierTwoFounderFee = 30;

    address public moonbergFeeAddress;

    function setRefFee(uint256 _refFee) external onlyOwner {
        refFee = _refFee;
    }

    function setReceiverImplementation(address _receiverImplementation) external onlyOwner {
        receiverImplementation = _receiverImplementation;
    }

    function setTierTwoReceiverImplementation(address _tierTwoReceiverImplementation) external onlyOwner {
        tierTwoReceiverImplementation = _tierTwoReceiverImplementation;
    }

    function setMoonbergFeeAddress(address _moonbergFeeAddress) external onlyOwner {
        moonbergFeeAddress = _moonbergFeeAddress;
    }

    function setTierTwoRefFee(uint256 _tierTwoRefFee) external onlyOwner {
        tierTwoRefFee = _tierTwoRefFee;
    }

    function setTierTwoFounderFee(uint256 _tierTwoFounderFee) external onlyOwner {
        tierTwoFounderFee = _tierTwoFounderFee;
    }

    function setTierTwoReferrer(address referrer, bool isTierTwo) external onlyOwner {
        isTierTwoReferrer[referrer] = isTierTwo;
    }

    function createReferralReceiver() external returns (address) {
        address receiver = _create(msg.sender);
        refToReceiver[msg.sender] = receiver;
        return receiver;
    }

    function createTierTwoReferralReceiver(address founder) external returns (address) {
        address receiver = _create2(msg.sender, founder);
        refToReceiver[msg.sender] = receiver;
        return receiver;
    }


    function _create(address user) internal returns (address) {
        address receiver = Cloneable(receiverImplementation).clone();
        IReceiverImplementation(receiver).__init__(user);
        return receiver;
    }

    function _create2(address user, address founder) internal returns (address) {
        address receiver = Cloneable(tierTwoReceiverImplementation).clone();
        ITierTwoReceiverImplementation(receiver).__init__(user, founder);
        return receiver;
    }

}

contract ReceiverImplementation is Cloneable {
    
    address public database;
    address public ref;

    function __init__(address _ref) external {
        require(ref == address(0) && _ref != address(0), "ReceiverImplementation: ref already set");
        ref = _ref;
        database = msg.sender;
    }

    function withdrawETH() external {
        _withdrawETH();
    }

    function withdraw(address token) external {
        _withdrawToken(token);
    }

    function batchWithdraw(address[] calldata tokens) external {
        uint len = tokens.length;
        for (uint256 i = 0; i < len;) {
            _withdrawToken(tokens[i]);
            unchecked { ++i; }
        }
    }

    receive() external payable {
        _withdrawETH();
    }

    function _withdrawETH() internal {
        if (address(this).balance == 0) {
            return;
        }

        uint256 refAmount = ( address(this).balance * IDatabase(database).refFee() ) / 100;
        TransferHelper.safeTransferETH(ref, refAmount);
        TransferHelper.safeTransferETH(IDatabase(database).moonbergFeeAddress(), address(this).balance);
    }

    function _withdrawToken(address token) internal {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal == 0) {
            return;
        }

        uint256 refAmount = ( bal * IDatabase(database).refFee() ) / 100;
        TransferHelper.safeTransfer(token, ref, refAmount);
        TransferHelper.safeTransfer(token, IDatabase(database).moonbergFeeAddress(), bal - refAmount);
    }

}

contract TierTwoReceiverImplementation is Cloneable {
    
    address public database;
    address public ref;
    address public ref1;

    function __init__(address _ref, address _ref1) external {
        require(ref == address(0) && _ref != address(0), "ReceiverImplementation: ref already set");
        require(ref1 == address(0) && _ref1 != address(0), "ReceiverImplementation: ref1 already set");
        ref = _ref;
        ref1 = _ref1;
        database = msg.sender;
    }

    function withdrawETH() external {
        _withdrawETH();
    }

    function withdraw(address token) external {
        _withdrawToken(token);
    }

    function batchWithdraw(address[] calldata tokens) external {
        uint len = tokens.length;
        for (uint256 i = 0; i < len;) {
            _withdrawToken(tokens[i]);
            unchecked { ++i; }
        }
    }

    receive() external payable {
        _withdrawETH();
    }

    function _withdrawETH() internal {
        if (address(this).balance == 0) {
            return;
        }

        uint256 refAmount = ( address(this).balance * IDatabase(database).tierTwoRefFee() ) / 100;
        uint256 ref1Amount = ( address(this).balance * IDatabase(database).tierTwoFounderFee() ) / 100;
        TransferHelper.safeTransferETH(ref, refAmount);
        TransferHelper.safeTransferETH(ref1, ref1Amount);
        TransferHelper.safeTransferETH(IDatabase(database).moonbergFeeAddress(), address(this).balance);
    }

    function _withdrawToken(address token) internal {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal == 0) {
            return;
        }

        uint256 refAmount = ( bal * IDatabase(database).tierTwoRefFee() ) / 100;
        uint256 ref1Amount = ( bal * IDatabase(database).tierTwoFounderFee() ) / 100;
        TransferHelper.safeTransfer(token, ref, refAmount);
        TransferHelper.safeTransfer(token, ref1, ref1Amount);
        TransferHelper.safeTransfer(token, IDatabase(database).moonbergFeeAddress(), IERC20(token).balanceOf(address(this)));
    }

}