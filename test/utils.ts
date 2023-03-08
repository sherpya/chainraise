import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { anyUint } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { ChainRaise, TetherToken } from '../typechain-types';

export async function getContracts() {
    const chainraise: ChainRaise = await ethers.getContract('ChainRaise');
    const usdt: TetherToken = await ethers.getContract('TetherToken');
    return { chainraise, usdt };
}

export async function createCampaign(
    creator: SignerWithAddress,
    amount: BigNumber,
    deadline: BigNumber,
    metadata = '42') {

    const { chainraise, usdt } = await getContracts();

    const blockNumber = await ethers.provider.getBlockNumber();
    expect(await chainraise.connect(creator).createCampaign(usdt.address, amount, deadline, metadata))
        .to.emit(chainraise, 'CampaignCreated')
        .withArgs(creator.address, usdt.address, anyUint, amount, deadline, metadata);

    const events = await chainraise.queryFilter(chainraise.filters.CampaignCreated(), blockNumber);
    expect(events).to.be.an('array');
    expect(events.at(-1)?.args?.campaignId).is.not.undefined;
    return events.at(-1)!.args!.campaignId;
}
