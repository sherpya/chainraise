import { expect } from 'chai';
import { deployments, ethers } from 'hardhat';
import { anyUint } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { BaseContract, Signer } from 'ethers';

import { ChainRaise, TetherToken } from '../typechain-types';

export async function getContract<T extends BaseContract>(contractName: string, signer?: Signer): Promise<T> {
    const deployment = await deployments.get(contractName);
    const contract = await ethers.getContractAt(contractName, deployment.address, signer);
    return contract as unknown as T;
}

export async function getContracts() {
    const chainraise: ChainRaise = await getContract('ChainRaise');
    const usdt: TetherToken = await getContract('TetherToken');
    return { chainraise, usdt };
}

export async function createCampaign(
    creator: SignerWithAddress,
    amount: bigint,
    deadline: bigint,
    description = Buffer.from('42')) {

    const { chainraise, usdt } = await getContracts();
    const usdtAddress = await usdt.getAddress();

    const blockNumber = await ethers.provider.getBlockNumber();
    await expect(chainraise.connect(creator).createCampaign(usdtAddress, amount, deadline, description))
        .to.emit(chainraise, 'CampaignCreated')
        .withArgs(creator.address, usdtAddress, anyUint, amount, deadline);

    const events = await chainraise.queryFilter(chainraise.filters.CampaignCreated(), blockNumber);
    expect(events).to.be.an('array');
    expect(events.at(-1)?.args?.campaignId).is.not.undefined;
    return events.at(-1)!.args!.campaignId;
}
