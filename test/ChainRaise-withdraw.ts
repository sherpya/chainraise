import { expect } from 'chai';
import { deployments, ethers } from 'hardhat';
import { anyUint } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

describe('ChainRaise: withdraw', function () {
  async function deployFixture() {
    await deployments.fixture(['ChainRaise', 'TetherToken'], {
      keepExistingDeployments: true
    });

    let deployment = await deployments.get('ChainRaise');
    const chainraise = await ethers.getContractAt('ChainRaise', deployment.address);

    deployment = await deployments.get('TetherToken');
    const usdt = await ethers.getContractAt('TetherToken', deployment.address);
    return { chainraise, usdt };
  }

  async function createCampaign() {
    const { chainraise, usdt } = await loadFixture(deployFixture);
    const [, creator] = await ethers.getSigners();

    const deadline = (await time.latest()) + (24 * 60);
    const amount = 10;
    const blockNumber = await ethers.provider.getBlockNumber();

    await expect(chainraise.connect(creator).createCampaign(usdt.address, amount, deadline, '42'))
      .to.emit(chainraise, 'CampaignCreated')
      .withArgs(anyUint, creator.address, usdt.address, amount, deadline, '42');

    const events = await chainraise.queryFilter(chainraise.filters.CampaignCreated(), blockNumber);
    expect(events).to.be.an('array').that.lengthOf(1);
    expect(events[0].args!).is.not.undefined;
    const { campaignId } = events[0].args!;

    return { chainraise, usdt, campaignId, amount };
  }

  async function fund() {
    const { chainraise, usdt, campaignId, amount } = await loadFixture(createCampaign);

    const funders = (await ethers.getSigners()).splice(2);

    for (let i = 0; i < amount - 1; i++) {
      const funder = funders[i % funders.length];
      await usdt.connect(funder).claim(amount);
      await usdt.connect(funder).approve(chainraise.address, amount);

      await expect(chainraise.connect(funder).fund(campaignId, 1))
        .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, 1, true);
    }
    return { chainraise, usdt, campaignId, amount };
  }

  it('GoalNotReached', async function () {
    const { chainraise, campaignId, amount } = await loadFixture(fund);
    const [, creator] = await ethers.getSigners();

    await expect(chainraise.connect(creator).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'GoalNotReached').withArgs(amount);
  });

  it('InvalidCaller', async function () {
    const { chainraise, usdt, campaignId, amount } = await loadFixture(fund);
    const [, creator, funder] = await ethers.getSigners();

    await usdt.connect(funder).claim(amount);
    await usdt.connect(funder).approve(chainraise.address, amount);

    await expect(chainraise.connect(funder).fund(campaignId, 1))
      .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, 1, true);

    await expect(chainraise.connect(funder).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'InvalidCaller').withArgs(creator.address);
  });

  it('Withdrawal', async function () {
    const { chainraise, usdt, campaignId, amount } = await loadFixture(fund);
    const [, creator, funder] = await ethers.getSigners();

    await usdt.connect(funder).claim(amount);
    await usdt.connect(funder).approve(chainraise.address, amount);

    await expect(chainraise.connect(funder).fund(campaignId, 1))
      .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, 1, true);

    await expect(chainraise.connect(creator).withdraw(campaignId))
      .to.emit(chainraise, 'FundTransfer').withArgs(creator.address, amount, false);

    await expect(chainraise.connect(creator).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'AlreadyClosed');
  });
});
