import { expect } from 'chai';
import { deployments, ethers } from 'hardhat';
import { anyUint } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

describe('ChainRaise: createCampaign', function () {
  async function deployFixture() {
    await deployments.fixture(['ChainRaise', 'TetherToken'], {
      keepExistingDeployments: true
    });

    const [, creator] = await ethers.getSigners();

    let deployment = await deployments.get('ChainRaise');
    const chainraise = await ethers.getContractAt('ChainRaise', deployment.address);

    deployment = await deployments.get('TetherToken');
    const usdt = await ethers.getContractAt('TetherToken', deployment.address);

    const now = await time.latest();
    return { chainraise, usdt, creator, now };
  }

  it('InvalidToken', async function () {
    const { chainraise, creator, now } = await loadFixture(deployFixture);
    const deadline = now + 60;

    await expect(chainraise.connect(creator).createCampaign(ethers.constants.AddressZero, 10, deadline, ''))
      .to.be.revertedWithCustomError(chainraise, 'InvalidToken');
  });

  it('InvalidAmount', async function () {
    const { chainraise, usdt, creator, now } = await loadFixture(deployFixture);
    const deadline = now + 60;

    await expect(chainraise.connect(creator).createCampaign(usdt.address, 0, deadline, ''))
      .to.be.revertedWithCustomError(chainraise, 'InvalidAmount');
  });

  it('DeadlineInThePast', async function () {
    const { chainraise, usdt, creator, now } = await loadFixture(deployFixture);

    await expect(chainraise.connect(creator).createCampaign(usdt.address, 10, now, ''))
      .to.be.revertedWithCustomError(chainraise, 'DeadlineInThePast');
  });

  it('CampaignCreated', async function () {
    const { chainraise, usdt, creator, now } = await loadFixture(deployFixture);
    const deadline = now + 60;

    await expect(chainraise.connect(creator).createCampaign(usdt.address, 10, deadline, '42'))
      .to.emit(chainraise, 'CampaignCreated')
      .withArgs(anyUint, creator.address, usdt.address, 10, deadline, '42');
  });
});
