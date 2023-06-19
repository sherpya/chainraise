import { expect } from 'chai';
import { ZeroAddress } from 'ethers';
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

    await expect(chainraise.connect(creator)
      .createCampaign(ZeroAddress, 1, deadline, Buffer.from('descrption')))
      .to.be.revertedWithCustomError(chainraise, 'InvalidToken');
  });

  it('InvalidAmount', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();
    const deadline = now + 60;

    await expect(chainraise.connect(creator)
      .createCampaign(await usdt.getAddress(), 0, deadline, Buffer.from('descrption')))
      .to.be.revertedWithCustomError(chainraise, 'InvalidAmount');
  });

  it('DeadlineInThePast', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();

    await expect(chainraise.connect(creator)
      .createCampaign(await usdt.getAddress(), 1, now, Buffer.from('descrption')))
      .to.be.revertedWithCustomError(chainraise, 'DeadlineInThePast');
  });

  it('CampaignCreated', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();
    const deadline = now + 60;

    const usdtAddress = await usdt.getAddress();

    // FIXME: check for 42
    await expect(chainraise.connect(creator).createCampaign(usdtAddress, 1, deadline, Buffer.from('42')))
      .to.emit(chainraise, 'CampaignCreated')
      .withArgs(creator.address, usdtAddress, anyUint, 1, deadline);
  });
});
