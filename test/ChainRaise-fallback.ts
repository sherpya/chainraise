import { expect } from 'chai';
import { parseEther } from 'ethers';
import { deployments, ethers } from 'hardhat';

import { getContracts } from './utils';

describe('ChainRaise: fallback', function () {
  before(async () => {
    await deployments.fixture(['ChainRaise', 'TetherToken'], {
      keepExistingDeployments: true
    });
  });

  it('sending eth', async function () {
    const { chainraise } = await getContracts();
    const [deployer] = await ethers.getSigners();

    const amount = parseEther('1.0');

    await expect(deployer.sendTransaction({
      to: await chainraise.getAddress(),
      value: amount
    })).to.be.revertedWithoutReason();
  });
});
