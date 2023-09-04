import { expect } from 'chai';
import { parseUnits } from 'ethers';
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

    const amount = parseUnits('10.0', await usdt.decimals());
    const now = await time.latest();
    const deadline = BigInt(now + (24 * 60));
    const campaignId = await createCampaign(creator, usdt, amount, deadline);

    await usdt.connect(funder).mint(amount);
    await usdt.connect(funder).increaseAllowance(await chainraise.getAddress(), amount);

    const tx = chainraise.connect(funder).fund(campaignId, amount);

    await expect(tx)
      .changeTokenBalances(usdt,
        [chainraise, funder],
        [amount, -amount]
      );

    await expect(tx)
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

    const tx = chainraise.connect(funder).reimburse(campaignId);

    await expect(tx)
      .changeTokenBalances(usdt,
        [chainraise, funder],
        [-amount, amount]);

    await expect(tx)
      .to.emit(chainraise, 'FundTransfer')
      .withArgs(funder.address, amount, false);
  });
});
