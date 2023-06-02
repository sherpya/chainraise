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
        mapping(address => uint256) balances;
    }

    uint256 public lastCampaign;
    mapping(uint256 => Campaign) campaigns;

    event CampaignCreated(
        address indexed creator,
        address indexed token,
        uint256 indexed campaignId,
        uint256 goal,
        uint256 deadline,
        string metadata
    );

    event FundTransfer(address indexed backer, uint256 amount, bool indexed isContribution);

    function _requireValidCampaign(uint256 _campaignID) internal view {
        if (campaigns[_campaignID].creator == address(0)) {
            revert InvalidCampaign();
        }
    }

    modifier onlyValidCampaign(uint256 _campaignID) {
        _requireValidCampaign(_campaignID);
        _;
    }

    function createCampaign(
        address _token,
        uint256 _goal,
        uint256 _deadline,
        string calldata _metadata
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

        unchecked {
            campaignId = ++lastCampaign;
        }

        Campaign storage campaign = campaigns[campaignId];
        campaign.creator = payable(msg.sender);
        campaign.token = IERC20(_token);
        campaign.deadline = _deadline.toUint32();
        campaign.goal = _goal;
        campaign.metadata = _metadata;

        emit CampaignCreated(msg.sender, _token, campaignId, _goal, _deadline, _metadata);
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
        campaign.balances[msg.sender] += amount;

        campaign.token.transferFrom(msg.sender, address(this), amount);

        emit FundTransfer(msg.sender, amount, true);
    }

    function reimburse(uint256 campaignId) external onlyValidCampaign(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.closed) {
            revert AlreadyClosed();
        }

        uint256 amount = campaign.balances[msg.sender];

        if (amount == 0) {
            revert NotFunder();
        }

        campaign.raisedAmount -= amount;
        campaign.balances[msg.sender] = 0;

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

    function getCampaign(
        uint256 campaignId
    )
        external
        view
        onlyValidCampaign(campaignId)
        returns (
            address payable creator,
            IERC20 token,
            uint32 deadline,
            bool closed,
            uint256 goal,
            uint256 raisedAmount,
            string memory metadata
        )
    {
        Campaign storage campaign = campaigns[campaignId];
        return (
            campaign.creator,
            campaign.token,
            campaign.deadline,
            campaign.closed,
            campaign.goal,
            campaign.raisedAmount,
            campaign.metadata
        );
    }

    function getCampaignBalance(
        uint256 campaignId,
        address funder
    ) external view onlyValidCampaign(campaignId) returns (uint256) {
        Campaign storage campaign = campaigns[campaignId];
        return campaign.balances[funder];
    }
}
