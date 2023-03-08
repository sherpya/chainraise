import { ethers } from 'hardhat';

(process.env.REPORT_GAS ? describe : describe.skip)('Deployment: for gas calculation', function () {
    it('ChainRaise', async () => {
        const ChainRaise = await ethers.getContractFactory('ChainRaise');
        const chainRaise = await ChainRaise.deploy();
        await chainRaise.deployed();
    });
});
