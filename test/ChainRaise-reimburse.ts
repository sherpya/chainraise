import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';

import { createCampaign, getContracts } from './utils';

describe('ChainRaise: reimburse', function () {
  before(async () => {
    await deployments.fixture(['ChainRaise', 'TetherToken'], {
      keepExistingDeployments: true
    });
  });

  async function fund() {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const decimals = await usdt.decimals();
    const amount = ethers.utils.parseUnits('10.0', decimals);
    const now = await time.latest();
    const deadline = BigNumber.from(now + (24 * 60));
    const campaignId = await createCampaign(creator, amount, deadline);

    await usdt.connect(funder).claim(amount);

    await usdt.connect(funder).approve(chainraise.address, amount);
    await expect(chainraise.connect(funder).fund(campaignId, amount))
      .changeTokenBalances(usdt,
        [chainraise, funder],
        [amount, amount.mul(-1)]
      )
      .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, amount, true);
    return { campaignId, amount };
  }

  it('AlreadyClosed', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const { campaignId, amount } = await fund();
    await expect(chainraise.connect(creator).withdraw(campaignId))
      .changeTokenBalances(usdt,
        [creator],
        [amount]);

    await expect(chainraise.connect(funder).reimburse(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'AlreadyClosed');
  });

  it('NotFunder', async function () {
    const { chainraise } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const { campaignId } = await fund();

    await expect(chainraise.connect(creator).reimburse(campaignId))
      .to.be.revertedWithCustomError(chainraise, 'NotFunder');
  });

  it('FundTransfer', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, , funder] = await ethers.getSigners();

    const { campaignId, amount } = await fund();

    await expect(chainraise.connect(funder).reimburse(campaignId))
      .changeTokenBalances(usdt,
        [chainraise, funder],
        [amount.mul(-1), amount])
      .to.emit(chainraise, 'FundTransfer')
      .withArgs(funder.address, amount, false);
  });
});
