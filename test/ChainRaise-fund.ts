import { expect } from 'chai';
import { deployments, ethers } from 'hardhat';
import { anyUint } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

describe('ChainRaise: fund', function () {
  async function deployFixture() {
    await deployments.fixture(['ChainRaise', 'TetherToken'], {
      keepExistingDeployments: true
    });

    let deployment = await deployments.get('ChainRaise');
    const chainraise = await ethers.getContractAt('ChainRaise', deployment.address);

    deployment = await deployments.get('TetherToken');
    const usdt = await ethers.getContractAt('TetherToken', deployment.address);
    return { chainraise, usdt };
  }

  async function createCampaign() {
    const { chainraise, usdt } = await loadFixture(deployFixture);
    const [, creator, funder] = await ethers.getSigners();

    const deadline = (await time.latest()) + (24 * 60);
    const amount = 10;
    const blockNumber = await ethers.provider.getBlockNumber();

    expect(await chainraise.connect(creator).createCampaign(usdt.address, amount, deadline, '42'))
      .to.emit(chainraise, 'CampaignCreated')
      .withArgs(creator.address, usdt.address, anyUint, amount, deadline, '42');

    const events = await chainraise.queryFilter(chainraise.filters.CampaignCreated(), blockNumber);
    expect(events).to.be.an('array');
    expect(events.at(-1)?.args?.campaignId).is.not.undefined;
    const campaignId = events.at(-1)!.args!.campaignId;

    return { chainraise, usdt, funder, campaignId, amount };
  }

  it('ERC20: insufficient allowance', async function () {
    const { chainraise, funder, campaignId, amount } = await loadFixture(createCampaign);

    await expect(chainraise.connect(funder).fund(campaignId, amount))
      .to.be.reverted;
  });

  it('DeadlineReached', async function () {
    const { chainraise, usdt, funder, campaignId, amount } = await loadFixture(createCampaign);

    // fund the funder
    await usdt.connect(funder).claim(amount);
    await usdt.connect(funder).approve(chainraise.address, amount);

    await time.increase(24 * 60);

    await expect(chainraise.connect(funder).fund(campaignId, amount))
      .to.be.revertedWithCustomError(chainraise, 'DeadlineReached').withArgs(anyUint);
  });

  it('Funding', async function () {
    const { chainraise, usdt, funder, campaignId, amount } = await loadFixture(createCampaign);

    // fund the funder
    await usdt.connect(funder).claim(amount);
    await usdt.connect(funder).approve(chainraise.address, amount);

    expect(await chainraise.connect(funder).fund(campaignId, amount))
      .to.emit(chainraise, 'FundTransfer').withArgs(funder.address, amount, true);

    // ERC20: insufficient allowance
    await expect(chainraise.connect(funder).fund(campaignId, amount))
      .to.be.reverted;
  });
});
