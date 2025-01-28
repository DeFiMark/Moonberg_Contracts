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

contract Passthrough is Ownable {
    
    // standard referral fee
    uint8 public referralFee = 10;

    // tier two referral fee for second level referrer
    uint8 public tierTwoFee = 20;

    // tier two affiliate fee for affiliate level referrer
    uint8 public tierTwoAffiliate = 30;

    // percentage of volume used for fee
    uint32 public percentageFee = 100; // 1%
    uint32 public constant percentageFeeDenominator = 10_000;

    // platform recipient of fees
    address public feeRecipient;

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function setReferralFee(uint8 _referralFee) external onlyOwner {
        referralFee = _referralFee;
    }

    function setTierTwoFee(uint8 _tierTwoFee) external onlyOwner {
        tierTwoFee = _tierTwoFee;
    }

    function setTierTwoAffiliate(uint8 _tierTwoAffiliate) external onlyOwner {
        tierTwoAffiliate = _tierTwoAffiliate;
    }

    function setPercentageFee(uint32 _percentageFee) external onlyOwner {
        percentageFee = _percentageFee;
    }

    /**
        This function allows for multiple external calls to be made in a single transaction (batch transactions)
        You should pull swap info from the swap API quote and pass it through here as the data
        NOTE: Account for `fee` being taken out of msg.value - so if a user sends 1 ETH, the swap should expect 0.99 ETH assuming a 1% fee
     */
    function execute(
        address[] targets,
        uint256[] values,
        bytes[] calldata datas,
        address ref0,
        address refAffiliate
    ) external payable {

        // handle fees
        _handleFee(ref0, refAffiliate, msg.value);

        // loop through targets, enforcing each one is successful to proceed
        uint len = targets.length;
        for (uint i = 0; i < len;) {

            // attempt low level call
            (bool success, bytes memory data) = targets[i].call{value: values[i]}(datas[i]);
            require(
                success && (data.length == 0 || abi.decode(data, (bool))),
                'External Call Failed'
            );

            unchecked { ++i; }
        }

    }

    function _handleFee(address ref0, address refAffiliate, uint256 value) internal {

        // determine fee
        uint256 fee = ( value * percentageFee ) / percentageFeeDenominator;

        if (ref0 != address(0)) {
            // we have a ref, see if its tier two ref
            if (refAffiliate != address(0)) {

                // split into tier two ref fees
                uint256 refFee = ( fee * tierTwoFee ) / 100;
                uint256 affiliateFee = ( fee * tierTwoAffiliate ) / 100;
                uint256 platformFee = fee - ( refFee + affiliateFee );

                // send to destinations
                TransferHelper.safeTransferETH(ref0, refFee);
                TransferHelper.safeTransferETH(refAffiliate, affiliateFee);
                TransferHelper.safeTransferETH(feeRecipient, platformFee);

            } else {
                // split into tier one ref fees
                uint256 refFee = ( fee * referralFee ) / 100;
                uint256 platformFee = fee - refFee;

                // send to destinations
                TransferHelper.safeTransferETH(ref0, refFee);
                TransferHelper.safeTransferETH(feeRecipient, platformFee);
            }
        } else {
            // no ref
            TransferHelper.safeTransferETH(feeRecipient, fee);
        }
    }
}