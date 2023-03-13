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
error NotFunder();

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
        mapping(address => uint256) balances;
    }

    Campaign[] public campaigns;

    event CampaignCreated(
        address indexed creator,
        address indexed token,
        uint256 indexed campaignId,
        uint256 goal,
        uint256 deadline,
        string metadata
    );

    event FundTransfer(address indexed backer, uint256 amount, bool isContribution);

    fallback() external {}

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

        Campaign storage campaign = campaigns.push();
        campaign.creator = payable(msg.sender);
        campaign.token = IERC20(_token);
        campaign.deadline = _deadline.toUint32();
        campaign.goal = _goal;
        campaign.metadata = _metadata;

        emit CampaignCreated(msg.sender, _token, campaignId, _goal, _deadline, _metadata);
    }

    function fund(uint256 campaignId, uint256 amount) external {
        Campaign storage campaign = campaigns[campaignId];
        if (block.timestamp > campaign.deadline) {
            revert DeadlineReached(campaign.deadline);
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        campaign.raisedAmount += amount;
        campaign.balances[msg.sender] += amount;

        campaign.token.transferFrom(msg.sender, address(this), amount);

        emit FundTransfer(msg.sender, amount, true);
    }

    function reimburse(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.closed) {
            revert AlreadyClosed();
        }

        uint256 amount = campaign.balances[msg.sender];

        if (amount == 0) {
            revert NotFunder();
        }

        campaign.raisedAmount -= amount;
        campaign.balances[msg.sender] -= amount;

        campaign.token.transfer(msg.sender, amount);

        emit FundTransfer(msg.sender, amount, false);
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
