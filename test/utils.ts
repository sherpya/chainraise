import { expect } from 'chai';
import { deployments, ethers } from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { AddressLike, BaseContract, Signer, hexlify, resolveAddress, toUtf8Bytes } from 'ethers';

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
    token: AddressLike,
    goal: bigint,
    deadline: bigint,
    description = hexlify(toUtf8Bytes('42'))) {

    const { chainraise } = await getContracts();

    const blockNumber = await ethers.provider.getBlockNumber();
    const campaignId = await chainraise.lastCampaign() + 1n;

    await expect(chainraise.connect(creator).createCampaign(token, goal, deadline, description))
        .to.emit(chainraise, 'CampaignCreated')
        .withArgs(creator.address, await resolveAddress(token), campaignId, goal, deadline);

    const filter = chainraise.filters.CampaignCreated(undefined, undefined, campaignId, undefined, undefined);
    const events = await chainraise.queryFilter(filter, blockNumber);
    expect(events).to.be.an('array').to.have.length(1);

    const tx = await events.at(0)!.getTransaction();
    const fn = chainraise.interface.getFunction('createCampaign');
    const data = chainraise.interface.decodeFunctionData(fn, tx.data);
    expect(data.at(-1)).to.be.equal(description);

    return campaignId;
}
