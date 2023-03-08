import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function ({ deployments: { deploy }, getNamedAccounts }) {
    const { deployer } = await getNamedAccounts();

    await deploy('USDCoin', {
        from: deployer,
        log: true,
        deterministicDeployment: true
    })
}

export default func;
func.tags = ['USDCoin'];
