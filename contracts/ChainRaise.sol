// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Created on 2023-03-05
 *
 * @title ChainRaise
 * @notice Smart contract to handle crowdfunding campaigns
 * @author Gianluigi Tiesi <sherpya@gmail.com>
 */

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

error InvalidCaller(address required);
error InvalidToken();
error InvalidAmount();
error DeadlineInThePast();
error DeadlineReached(uint256 deadline);
error GoalNotReached(uint256 required);
error AlreadyClosed();

contract ChainRaise {
    using SafeCast for uint256;

    struct Campaign {
        address payable creator;
        IERC20 token;
        uint32 deadline;
        bool closed;
        uint256 goal;
        uint256 raisedAmount;
        string metadata;
    }

    Campaign[] public campaigns;

    event CampaignCreated(
        uint256 campaignId,
        address creator,
        address token,
        uint256 goal,
        uint256 deadline,
        string metadata
    );
    event FundTransfer(address backer, uint256 amount, bool isContribution);

    function createCampaign(
        address _token,
        uint256 _goal,
        uint256 _deadline,
        string memory _metadata
    ) external returns (uint256 campaignId) {
        if (_token == address(0)) {
            revert InvalidToken();
        }

        if (_goal == 0) {
            revert InvalidAmount();
        }

        if (_deadline <= block.timestamp) {
            revert DeadlineInThePast();
        }

        campaignId = campaigns.length;

        campaigns.push(
            Campaign({
                creator: payable(msg.sender),
                token: IERC20(_token),
                deadline: _deadline.toUint32(),
                closed: false,
                goal: _goal,
                raisedAmount: 0,
                metadata: _metadata
            })
        );
        emit CampaignCreated(campaignId, msg.sender, _token, _goal, _deadline, _metadata);
    }

    function fund(uint256 campaignId, uint256 amount) external {
        Campaign storage campaign = campaigns[campaignId];
        if (block.timestamp > campaign.deadline) {
            revert DeadlineReached(campaign.deadline);
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        campaign.token.transferFrom(msg.sender, address(this), amount);
        campaign.raisedAmount += amount;

        emit FundTransfer(msg.sender, amount, true);
    }

    function withdraw(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.closed) {
            revert AlreadyClosed();
        }

        if (msg.sender != campaign.creator) {
            revert InvalidCaller(campaign.creator);
        }

        if (campaign.raisedAmount < campaign.goal) {
            revert GoalNotReached(campaign.goal);
        }

        campaign.closed = true;

        uint256 amount = campaign.raisedAmount;
        campaign.token.transfer(campaign.creator, amount);

        emit FundTransfer(campaign.creator, amount, false);
    }
}
