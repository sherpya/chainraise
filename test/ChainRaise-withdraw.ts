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

  async function fund(amount: BigNumber, step: BigNumber) {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();
    const funders = (await ethers.getSigners()).splice(2);

    const now = await time.latest();
    const deadline = BigNumber.from(now + (24 * 60));
    const campaignId = await createCampaign(creator, BigNumber.from(amount), deadline);

    const count = Math.floor(amount.div(step).toNumber());

    for (let i = 0; i < count - 1; i++) {
      const funder = funders[i % funders.length];
      await usdt.connect(funder).mint(step);

      await usdt.connect(funder).approve(chainraise.address, step);
      await expect(chainraise.connect(funder).fund(campaignId, step))
        .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, step, true);
    }

    return campaignId;
  }

  it('GoalNotReached', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const decimals = await usdt.decimals();
    const amount = ethers.utils.parseUnits('10.0', decimals);
    const step = ethers.utils.parseUnits('1.0', decimals);
    const campaignId = await fund(amount, step);

    await expect(chainraise.connect(creator).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'GoalNotReached').withArgs(amount);
  });

  it('InvalidCaller', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const decimals = await usdt.decimals();
    const amount = ethers.utils.parseUnits('20.0', decimals);
    const step = ethers.utils.parseUnits('1.0', decimals);
    const campaignId = await fund(amount, step);

    await usdt.connect(funder).mint(amount);

    await usdt.connect(funder).approve(chainraise.address, amount);
    await expect(chainraise.connect(funder).fund(campaignId, 1))
      .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, 1, true);

    await expect(chainraise.connect(funder).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'InvalidCaller').withArgs(creator.address);
  });

  it('Withdrawal', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const decimals = await usdt.decimals();
    const amount = ethers.utils.parseUnits('10.0', decimals);
    const step = ethers.utils.parseUnits('1.0', decimals);
    const campaignId = await fund(amount, step);

    await usdt.connect(funder).approve(chainraise.address, step);
    await expect(chainraise.connect(funder).fund(campaignId, step))
      .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, step, true);

    await expect(chainraise.connect(creator).withdraw(campaignId))
      .to.changeTokenBalances(usdt,
        [creator],
        [amount])
      .to.emit(chainraise, 'FundTransfer').withArgs(creator.address, amount, false);

    await expect(chainraise.connect(creator).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'AlreadyClosed');
  });
});
