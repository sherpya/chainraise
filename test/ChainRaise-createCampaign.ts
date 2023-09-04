import { expect } from 'chai';
import { ZeroAddress, parseUnits } from 'ethers';
import { deployments, ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { createCampaign, getContracts } from './utils';

describe('ChainRaise: createCampaign', function () {
  const amount = parseUnits('1.0', 6);

  before(async () => {
    await deployments.fixture(['ChainRaise', 'TetherToken'], {
      keepExistingDeployments: true
    });
  });

  it('InvalidAmount (native)', async function () {
    const { chainraise } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();
    const deadline = now + 60;

    await expect(chainraise.connect(creator)
      .createCampaign(ZeroAddress, 0, deadline, Buffer.from('description')))
      .to.be.revertedWithCustomError(chainraise, 'InvalidAmount');
  });

  it('InvalidAmount (ERC20)', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();
    const deadline = BigInt(now + 60);

    await expect(chainraise.connect(creator)
      .createCampaign(usdt, 0, deadline, Buffer.from('description')))
      .to.be.revertedWithCustomError(chainraise, 'InvalidAmount');
  });

  it('DeadlineInThePast', async function () {
    const { chainraise, usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();

    await expect(chainraise.connect(creator)
      .createCampaign(usdt, amount, now, Buffer.from('description')))
      .to.be.revertedWithCustomError(chainraise, 'DeadlineInThePast');
  });

  it('CampaignCreated (native)', async function () {
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();
    const deadline = BigInt(now + 60);

    await createCampaign(creator, ZeroAddress, amount, deadline);
  });


  it('CampaignCreated (ERC20)', async function () {
    const { usdt } = await getContracts();
    const [, creator] = await ethers.getSigners();

    const now = await time.latest();
    const deadline = BigInt(now + 60);

    await createCampaign(creator, usdt, amount, deadline);
  });
});
