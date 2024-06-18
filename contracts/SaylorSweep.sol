//SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../lib/Ownable.sol";
import "../lib/IERC20.sol";
import "../lib/ReentrantGuard.sol";
import "../lib/TransferHelper.sol";

interface IMoonberg is IERC20 {
    function burnFrom(address account, uint256 amount) external returns (bool);
}

contract SaylorSweep is Ownable, ReentrancyGuard {

    // list of backing assets
    address[] public backingAssets;

    // Moonberg Token Contract
    IMoonberg public immutable moonberg;

    constructor(
        address _moonberg,
        address[] memory _backingAssets
    ) {
        moonberg = IMoonberg(_moonberg);
        backingAssets = _backingAssets;
    }

    function withdrawToken(address token, address to, uint256 amount) external onlyOwner {
        TransferHelper.safeTransfer(token, to, amount);
    }

    function withdrawETH(address to, uint256 amount) external onlyOwner {
        TransferHelper.safeTransferETH(to, amount);
    }

    function addBackingAsset(address asset) external onlyOwner {
        uint len = backingAssets.length;
        for (uint i = 0; i < len;) {
            require(backingAssets[i] != asset, "Asset already added");
            unchecked { ++i; }
        }
        backingAssets.push(asset);
    }

    function removeBackingAsset(address asset) external onlyOwner {
        uint len = backingAssets.length;
        for (uint i = 0; i < len;) {
            if (backingAssets[i] == asset) {
                backingAssets[i] = backingAssets[len - 1];
                backingAssets.pop();
                return;
            }
            unchecked { ++i; }
        }
        revert("Asset not found");
    }

    function sweep(uint256 amount) external nonReentrant {
        require(
            moonberg.balanceOf(msg.sender) >= amount,
            "Insufficient balance"
        );
        require(
            moonberg.allowance(msg.sender, address(this)) >= amount,
            "Insufficient allowance"
        );
        
        // quote amount out of backing assets
        uint256[] memory amounts = quote(amount);

        // redundantly check total supply
        uint256 oldTotalSupply = moonberg.totalSupply();

        // burn `amount` of moonberg tokens from sender
        moonberg.burnFrom(msg.sender, amount);

        // redundantly check total supply after burn to ensure everything worked properly
        require(
            moonberg.totalSupply() == oldTotalSupply - amount,
            "Burn Failed"
        );

        // determine length of amounts
        uint len = amounts.length;

        // transfer backing assets to sender
        for (uint i = 0; i < len;) {
            if (amounts[i] > 0) {
                TransferHelper.safeTransfer(backingAssets[i], msg.sender, amounts[i]);
            }
            unchecked { ++i; }
        }
    }

    function quote(uint256 amount) public view returns (uint256[] memory amounts) {

        // create list of amounts to redeem of backing assets
        uint len = backingAssets.length;
        amounts = new uint256[](len);

        // fetch total supply to calculate percentage of each backing asset
        uint256 totalSupply = moonberg.totalSupply();

        // calculate the amount of each backing asset to redeem
        for (uint i = 0; i < len;) {
            amounts[i] = ( IERC20(backingAssets[i]).balanceOf(address(this)) * amount ) / totalSupply;
            unchecked { ++i; }
        }
    }

    function getStats() public view returns (uint256[] memory totalBacking, uint256 totalSupply) {
        uint len = backingAssets.length;
        totalBacking = new uint256[](len);
        for (uint i = 0; i < len;) {
            totalBacking[i] = IERC20(backingAssets[i]).balanceOf(address(this));
            unchecked { ++i; }
        }
        totalSupply = moonberg.totalSupply();
    }
}