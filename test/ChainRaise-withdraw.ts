import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';

import { createCampaign, getContracts } from './utils';

describe('ChainRaise: withdraw', function () {
  before(async () => {
    await deployments.fixture(['ChainRaise', 'TetherToken'], {
      keepExistingDeployments: true
    });
  });

  async function fund(amount: number) {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();
    const funders = (await ethers.getSigners()).splice(2);

    const now = await time.latest();
    const deadline = BigNumber.from(now + (24 * 60));
    const campaignId = await createCampaign(creator, BigNumber.from(amount), deadline);

    for (let i = 0; i < amount - 1; i++) {
      const funder = funders[i % funders.length];
      await usdt.connect(funder).claim(amount);

      await usdt.connect(funder).approve(chainraise.address, amount);
      expect(await chainraise.connect(funder).fund(campaignId, 1))
        .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, 1, true);
    }

    return campaignId
  }

  it('GoalNotReached', async function () {
    const { chainraise } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const amount = 10;
    const campaignId = await fund(amount);

    await expect(chainraise.connect(creator).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'GoalNotReached').withArgs(amount);
  });

  it('InvalidCaller', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const amount = 10;
    const campaignId = await fund(amount);

    await usdt.connect(funder).claim(amount);

    await usdt.connect(funder).approve(chainraise.address, amount);
    expect(await chainraise.connect(funder).fund(campaignId, 1))
      .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, 1, true);

    await expect(chainraise.connect(funder).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'InvalidCaller').withArgs(creator.address);
  });

  it('Withdrawal', async function () {
    const { chainraise } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const amount = 10;
    const campaignId = await fund(amount);

    expect(await chainraise.connect(funder).fund(campaignId, 1))
      .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, 1, true);

    expect(await chainraise.connect(creator).withdraw(campaignId))
      .to.emit(chainraise, 'FundTransfer').withArgs(creator.address, amount, false);

    await expect(chainraise.connect(creator).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'AlreadyClosed');
  });
});
