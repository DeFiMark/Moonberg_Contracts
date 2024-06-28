//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../lib/Ownable.sol";

contract Presale is Ownable {

    // Receiver Of Donation
    address public presaleReceiver;

    // Address => User
    mapping ( address => uint256 ) public donors;

    // List Of All Donors
    address[] private _allDonors;

    // Total Amount Donated
    uint256 private _totalDonated;

    // Hard Cap
    uint256 public hardCap = 10_000 ether;
    
    // maximum contribution
    uint256 public min_contribution = 0.01 ether;
    uint256 public max_contribution = 20 ether;

    // sale has ended
    bool public hasStarted;

    // Donation Event, Trackers Donor And Amount Donated
    event DonatedETH(address donor, uint256 amountDonated, uint256 totalInSale);

    constructor(
        address _presaleReceiver
    ) {
        presaleReceiver = _presaleReceiver;
    }

    function startSale() external onlyOwner {
        hasStarted = true;
    }

    function endSale() external onlyOwner {
        hasStarted = false;
    }

    function setHardcap(uint256 cap) external onlyOwner {
        hardCap = cap;
    }

    function withdraw(address token_, uint256 amount) external onlyOwner {
        // bytes4(keccak256(bytes('transfer(address,uint256)')));
        (bool success, bytes memory data) = token_.call(abi.encodeWithSelector(0xa9059cbb, msg.sender, amount));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::safeTransfer: transfer failed'
        );
    }

    function withdrawETH() external onlyOwner {
        (bool s1,) = payable(presaleReceiver).call{value: address(this).balance}("");
        require(s1, 'Failure On ETH Transfer');
    }

    function setPresaleReceiver(address newReceiver) external onlyOwner {
        require(newReceiver != address(0), 'Zero Address');
        presaleReceiver = newReceiver;
    }

    function setMinContributions(uint min) external onlyOwner {
        min_contribution = min;
    }

    function donateETH() external payable {
        require(
            msg.value >= min_contribution,
            'Min Contribution'
        );
        _handleETH();
        _processETH(msg.sender, msg.value);
    }

    receive() external payable {
        require(
            msg.value >= min_contribution,
            'Min Contribution'
        );
        _handleETH();
        _processETH(msg.sender, msg.value);
    }

    function donated(address user) external view returns(uint256) {
        return donors[user];
    }

    function allDonors() external view returns (address[] memory) {
        return _allDonors;
    }

    function allDonorsAndDonationAmounts() external view returns (address[] memory, uint256[] memory) {
        uint len = _allDonors.length;
        uint256[] memory amounts = new uint256[](len);
        for (uint i = 0; i < len;) {
            amounts[i] = donors[_allDonors[i]];
            unchecked { ++i; }
        }
        return (_allDonors, amounts);
    }

    function donorAtIndex(uint256 index) external view returns (address) {
        return _allDonors[index];
    }

    function numberOfDonors() external view returns (uint256) {
        return _allDonors.length;
    }

    function totalDonated() external view returns (uint256) {
        return _totalDonated;
    }

    function _processETH(address user, uint amount) internal {
        require(
            hasStarted,
            'Sale Has Not Started'
        );

        // add to donor list if first donation
        if (donors[user] == 0) {
            _allDonors.push(user);
        }

        // increment amounts donated
        unchecked {
            donors[user] += amount;
            _totalDonated += amount;
        }
        emit DonatedETH(user, amount, _totalDonated);

        // ensure max contribution is preserved
        require(
            donors[user] <= max_contribution,
            'Max Contribution Exceeded'
        );

        // ensure hard cap is preserved
        require(
            _totalDonated <= hardCap,
            'Hard Cap Exceeded'
        );
    }

    function _handleETH() internal {
        (bool s1,) = payable(presaleReceiver).call{value: address(this).balance}("");
        require(s1, 'Failure On ETH Transfer');
    }
}