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
    const campaignId = 0n;

    await expect(chainraise.connect(funder).fund(campaignId, amount))
      .to.be.revertedWithCustomError(chainraise, 'InvalidCampaign');
  });

  it('ERC20: insufficient allowance', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const now = await time.latest();

    const deadline = BigInt(now + (24 * 60));
    const amount = parseUnits('10.0', await usdt.decimals());

    const campaignId = await createCampaign(creator, amount, deadline);

    await expect(chainraise.connect(funder).fund(campaignId, amount))
      .to.be.revertedWith('ERC20: insufficient allowance');
  });

  it('DeadlineReached', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const now = await time.latest();

    const deadline = BigInt(now + (24 * 60));
    const amount = parseUnits('10.0', await usdt.decimals());

    const campaignId = await createCampaign(creator, amount, deadline);

    // fund the funder
    await usdt.connect(funder).mint(amount);

    await time.increase(24 * 60);

    await usdt.connect(funder).approve((await chainraise.getAddress()), amount);
    await expect(chainraise.connect(funder).fund(campaignId, amount))
      .to.be.revertedWithCustomError(chainraise, 'DeadlineReached').withArgs(anyUint);
  });

  it('Funding', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator, funder] = await ethers.getSigners();

    const now = await time.latest();

    const deadline = BigInt(now + (24 * 60));
    const amount = parseUnits('10.0', await usdt.decimals());

    const campaignId = await createCampaign(creator, amount, deadline);

    // fund the funder
    await usdt.connect(funder).mint(amount);

    await usdt.connect(funder).approve(await chainraise.getAddress(), amount);
    await expect(chainraise.connect(funder).fund(campaignId, amount))
      .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, amount, true);

    // ERC20: insufficient allowance
    await expect(chainraise.connect(funder).fund(campaignId, amount))
      .to.be.rejectedWith('ERC20: insufficient allowance');
  });
});
