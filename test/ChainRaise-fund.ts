import { expect } from 'chai';
import { parseUnits } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { anyUint } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { time } from '@nomicfoundation/hardhat-network-helpers';

import { createCampaign, getContracts } from './utils';

describe('ChainRaise: fund', function () {
  before(async () => {
    await deployments.fixture(['ChainRaise', 'TetherToken'], {
      keepExistingDeployments: true
    });
  });

  it('InvalidCampaign', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, , funder] = await ethers.getSigners();

    const amount = parseUnits('10.0', await usdt.decimals());

    await expect(chainraise.connect(funder).fund(0, amount))
      .to.be.revertedWithCustomError(chainraise, 'InvalidCampaign');
  });

  it('ERC20: insufficient allowance', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const now = await time.latest();

    const deadline = BigInt(now + (24 * 60));
    const amount = parseUnits('10.0', await usdt.decimals());

    const campaignId = await createCampaign(creator, usdt, amount, deadline);

    await expect(chainraise.connect(funder).fund(campaignId, amount))
      .to.be.revertedWith('ERC20: insufficient allowance');
  });

  it('DeadlineReached', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const now = await time.latest();

    const deadline = BigInt(now + (24 * 60));
    const amount = parseUnits('10.0', await usdt.decimals());

    const campaignId = await createCampaign(creator, usdt, amount, deadline);

    await usdt.connect(funder).mint(amount);
    await usdt.connect(funder).increaseAllowance(chainraise, amount);

    await time.increase(24 * 60);

    await expect(chainraise.connect(funder).fund(campaignId, amount))
      .to.be.revertedWithCustomError(chainraise, 'DeadlineReached').withArgs(anyUint);
  });

  it('Funding', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const now = await time.latest();

    const deadline = BigInt(now + (24 * 60));
    const amount = parseUnits('10.0', await usdt.decimals());

    const campaignId = await createCampaign(creator, usdt, amount, deadline);

    await usdt.connect(funder).mint(amount);
    await usdt.connect(funder).increaseAllowance(chainraise, amount);

    const tx = chainraise.connect(funder).fund(campaignId, amount);
    await expect(tx).to.emit(chainraise, 'FundTransfer').withArgs(funder.address, amount, true);
    await expect(tx).to.changeTokenBalances(
      usdt,
      [chainraise, funder],
      [amount, -amount]
    );
  });
});
