import { expect } from 'chai';
import { deployments, ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { anyUint } from '@nomicfoundation/hardhat-chai-matchers/withArgs';

import { getContracts } from './utils';

describe('ChainRaise: createCampaign', function () {
  before(async () => {
    await deployments.fixture(['ChainRaise', 'TetherToken'], {
      keepExistingDeployments: true
    });
  });

  it('InvalidToken', async function () {
    const { chainraise } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();
    const deadline = now + 60;

    await expect(chainraise.connect(creator).createCampaign(ethers.constants.AddressZero, 10, deadline, ''))
      .to.be.revertedWithCustomError(chainraise, 'InvalidToken');
  });

  it('InvalidAmount', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();
    const deadline = now + 60;

    await expect(chainraise.connect(creator).createCampaign(usdt.address, 0, deadline, ''))
      .to.be.revertedWithCustomError(chainraise, 'InvalidAmount');
  });

  it('DeadlineInThePast', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();

    await expect(chainraise.connect(creator).createCampaign(usdt.address, 10, now, ''))
      .to.be.revertedWithCustomError(chainraise, 'DeadlineInThePast');
  });

  it('CampaignCreated', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();
    const deadline = now + 60;

    expect(await chainraise.connect(creator).createCampaign(usdt.address, 10, deadline, '42'))
      .to.emit(chainraise, 'CampaignCreated')
      .withArgs(creator.address, usdt.address, anyUint, 10, deadline, '42');
  });
});
