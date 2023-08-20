import { expect } from 'chai';
import { parseUnits } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';

import { createCampaign, getContracts } from './utils';

describe('ChainRaise: withdraw', function () {
  before(async () => {
    await deployments.fixture(['ChainRaise', 'TetherToken'], {
      keepExistingDeployments: true
    });
  });

  async function fund(amount: bigint, step: bigint) {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();
    const funders = (await ethers.getSigners()).splice(2);

    const now = await time.latest();
    const deadline = BigInt(now + (24 * 60));
    const campaignId = await createCampaign(creator, amount, deadline);

    const count = Number(amount / step);

    for (let i = 0; i < count - 1; i++) {
      const funder = funders[i % funders.length];
      await usdt.connect(funder).mint(step);

      await usdt.connect(funder).approve(await chainraise.getAddress(), step);
      await expect(chainraise.connect(funder).fund(campaignId, step))
        .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, step, true);
    }

    return campaignId;
  }

  it('GoalNotReached', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const decimals = await usdt.decimals();
    const amount = parseUnits('10.0', decimals);
    const step = parseUnits('1.0', decimals);
    const campaignId = await fund(amount, step);

    await expect(chainraise.connect(creator).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'GoalNotReached').withArgs(amount);
  });

  it('InvalidCaller', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const decimals = await usdt.decimals();
    const amount = parseUnits('20.0', decimals);
    const step = parseUnits('1.0', decimals);
    const campaignId = await fund(amount, step);

    await usdt.connect(funder).mint(amount);

    await usdt.connect(funder).approve(await chainraise.getAddress(), amount);
    await expect(chainraise.connect(funder).fund(campaignId, 1))
      .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, 1, true);

    await expect(chainraise.connect(funder).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'InvalidCaller').withArgs(creator.address);
  });

  it('Withdrawal', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const decimals = await usdt.decimals();
    const amount = parseUnits('10.0', decimals);
    const step = parseUnits('1.0', decimals);
    const campaignId = await fund(amount, step);

    await usdt.connect(funder).approve(await chainraise.getAddress(), step);
    await expect(chainraise.connect(funder).fund(campaignId, step))
      .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, step, true);

    const tx = chainraise.connect(creator).withdraw(campaignId);

    await expect(tx)
      .to.changeTokenBalances(usdt,
        [creator],
        [amount]);

    await expect(tx)
      .to.emit(chainraise, 'FundTransfer').withArgs(creator.address, amount, false);

    await expect(chainraise.connect(creator).withdraw(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'AlreadyClosed');
  });
});
