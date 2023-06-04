// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/**
 * Created on 2023-03-05
 *
 * @title ChainRaise
 * @notice Smart contract to handle crowdfunding campaigns
 * @author Gianluigi Tiesi <sherpya@gmail.com>
 */

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract ChainRaise {
    using SafeCast for uint256;

    error InvalidCampaign();
    error InvalidCaller(address required);
    error InvalidToken();
    error InvalidAmount();
    error DeadlineInThePast();
    error DeadlineReached(uint256 deadline);
    error GoalNotReached(uint256 required);
    error AlreadyClosed();
    error NotFunder();

    struct Campaign {
        address payable creator;
        IERC20 token;
        uint32 deadline;
        bool closed;
        uint256 goal;
        uint256 raisedAmount;
        string metadata;
    }

    uint256 public lastCampaign;
    mapping(uint256 => Campaign) private campaigns;
    mapping(uint256 => mapping(address => uint256)) private contributions;

    event CampaignCreated(
        address indexed creator,
        address indexed token,
        uint256 indexed campaignId,
        uint256 goal,
        uint256 deadline,
        string metadata
    );

    event FundTransfer(address indexed backer, uint256 amount, bool indexed isContribution);

    function _requireValidCampaign(uint256 campaignID) internal view {
        if (campaigns[campaignID].creator == address(0)) {
            revert InvalidCampaign();
        }
    }

    modifier onlyValidCampaign(uint256 campaignID) {
        _requireValidCampaign(campaignID);
        _;
    }

    function createCampaign(
        address token,
        uint256 goal,
        uint256 deadline,
        string calldata metadata
    ) external returns (uint256 campaignId) {
        if (token == address(0)) {
            revert InvalidToken();
        }

        if (goal == 0) {
            revert InvalidAmount();
        }

        if (deadline <= block.timestamp) {
            revert DeadlineInThePast();
        }

        unchecked {
            campaignId = ++lastCampaign;
        }

        Campaign storage campaign = campaigns[campaignId];
        campaign.creator = payable(msg.sender);
        campaign.token = IERC20(token);
        campaign.deadline = deadline.toUint32();
        campaign.goal = goal;
        campaign.metadata = metadata;

        emit CampaignCreated(msg.sender, token, campaignId, goal, deadline, metadata);
    }

    function fund(uint256 campaignId, uint256 amount) external onlyValidCampaign(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        if (block.timestamp > campaign.deadline) {
            revert DeadlineReached(campaign.deadline);
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        campaign.raisedAmount += amount;
        contributions[campaignId][msg.sender] += amount;

        campaign.token.transferFrom(msg.sender, address(this), amount);

        emit FundTransfer(msg.sender, amount, true);
    }

    function reimburse(uint256 campaignId) external onlyValidCampaign(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.closed) {
            revert AlreadyClosed();
        }

        uint256 amount = contributions[campaignId][msg.sender];

        if (amount == 0) {
            revert NotFunder();
        }

        campaign.raisedAmount -= amount;
        contributions[campaignId][msg.sender] = 0;

        campaign.token.transfer(msg.sender, amount);

        emit FundTransfer(msg.sender, amount, false);
    }

    function withdraw(uint256 campaignId) external onlyValidCampaign(campaignId) {
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

    function getCampaign(uint256 campaignId) external view onlyValidCampaign(campaignId) returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function contribution(uint256 campaignId, address funder) external view onlyValidCampaign(campaignId) returns (uint256) {
        return contributions[campaignId][funder];
    }
}
